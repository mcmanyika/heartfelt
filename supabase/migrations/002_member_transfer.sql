-- Staff location listing and member campus transfers.
-- Location admins cannot read other campuses through normal RLS, so these
-- helpers expose only what is required to move a member inside the same org.

CREATE OR REPLACE FUNCTION public.list_org_locations_for_staff()
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  city text,
  country text,
  status public.location_status
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    public.is_super_admin()
    OR public.has_role('LOCATION_ADMIN')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.code,
    l.city,
    l.country,
    l.status
  FROM public.locations l
  WHERE l.organization_id = public.current_user_organization_id()
  ORDER BY l.name;
END;
$$;

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

  UPDATE public.members
  SET location_id = p_to_location_id
  WHERE id = p_member_id
  RETURNING * INTO v_member;

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

REVOKE ALL ON FUNCTION public.list_org_locations_for_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_locations_for_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_member(uuid, uuid) TO authenticated;
