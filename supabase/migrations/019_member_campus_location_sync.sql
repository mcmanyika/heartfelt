-- Prefer membership campus over profile.location_id for portal visibility.
-- Also let members see active departments/cell groups at their own campus.

CREATE OR REPLACE FUNCTION public.current_user_location_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT m.location_id FROM public.members m WHERE m.profile_id = auth.uid() LIMIT 1),
    (SELECT p.location_id FROM public.profiles p WHERE p.id = auth.uid())
  );
$$;

-- Heal profiles that drifted from their linked membership campus.
UPDATE public.profiles p
SET location_id = m.location_id,
    updated_at = now()
FROM public.members m
WHERE m.profile_id = p.id
  AND m.organization_id = p.organization_id
  AND m.location_id IS NOT NULL
  AND p.location_id IS DISTINCT FROM m.location_id;

DROP POLICY IF EXISTS departments_select ON public.departments;
CREATE POLICY departments_select
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND public.user_has_location_access(location_id)
      )
      OR public.is_active_department_member(id)
      OR (
        status = 'ACTIVE'
        AND location_id = (
          SELECT m.location_id
          FROM public.members m
          WHERE m.profile_id = auth.uid()
          LIMIT 1
        )
      )
    )
  );

DROP POLICY IF EXISTS cell_groups_select ON public.cell_groups;
CREATE POLICY cell_groups_select
  ON public.cell_groups
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND public.user_has_location_access(location_id)
      )
      OR public.is_active_cell_group_member(id)
      OR (
        status = 'ACTIVE'
        AND location_id = (
          SELECT m.location_id
          FROM public.members m
          WHERE m.profile_id = auth.uid()
          LIMIT 1
        )
      )
    )
  );

-- Keep linked login campus in sync when a member is transferred.
CREATE OR REPLACE FUNCTION public.transfer_member(
  p_member_id uuid,
  p_to_location_id uuid
)
RETURNS public.members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.members;
  v_from_location_id uuid;
  v_to_org uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_member
  FROM public.members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF v_member.organization_id IS DISTINCT FROM public.current_user_organization_id() THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR (
      public.has_role('LOCATION_ADMIN')
      AND public.user_has_location_access(v_member.location_id)
    )
  ) THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;

  SELECT organization_id INTO v_to_org
  FROM public.locations
  WHERE id = p_to_location_id;

  IF v_to_org IS NULL OR v_to_org IS DISTINCT FROM v_member.organization_id THEN
    RAISE EXCEPTION 'Invalid destination location';
  END IF;

  IF v_member.location_id = p_to_location_id THEN
    RAISE EXCEPTION 'Member is already at this location';
  END IF;

  v_from_location_id := v_member.location_id;

  UPDATE public.cell_groups
  SET leader_member_id = NULL
  WHERE leader_member_id = p_member_id
    AND location_id IS DISTINCT FROM p_to_location_id;

  UPDATE public.cell_group_members cgm
  SET left_at = CURRENT_DATE
  FROM public.cell_groups cg
  WHERE cgm.cell_group_id = cg.id
    AND cgm.member_id = p_member_id
    AND cgm.left_at IS NULL
    AND cg.location_id IS DISTINCT FROM p_to_location_id;

  UPDATE public.departments
  SET leader_member_id = NULL
  WHERE leader_member_id = p_member_id
    AND location_id IS DISTINCT FROM p_to_location_id;

  UPDATE public.department_members dm
  SET left_at = CURRENT_DATE
  FROM public.departments d
  WHERE dm.department_id = d.id
    AND dm.member_id = p_member_id
    AND dm.left_at IS NULL
    AND d.location_id IS DISTINCT FROM p_to_location_id;

  UPDATE public.members
  SET location_id = p_to_location_id
  WHERE id = p_member_id
  RETURNING * INTO v_member;

  IF v_member.profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET location_id = p_to_location_id,
        updated_at = now()
    WHERE id = v_member.profile_id
      AND organization_id = v_member.organization_id;
  END IF;

  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    v_member.organization_id,
    auth.uid(),
    'MEMBER_TRANSFERRED',
    'member',
    v_member.id,
    jsonb_build_object(
      'from_location_id', v_from_location_id,
      'to_location_id', p_to_location_id
    )
  );

  RETURN v_member;
END;
$$;
