-- Campus departments. A member may belong to several departments at once.

CREATE TYPE public.department_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE public.department_member_role AS ENUM ('LEADER', 'MEMBER');

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  location_id uuid NOT NULL REFERENCES public.locations (id),
  name text NOT NULL,
  code text,
  description text,
  venue text,
  leader_member_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  status public.department_status NOT NULL DEFAULT 'ACTIVE',
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT departments_code_format CHECK (
    code IS NULL OR code ~ '^[A-Z0-9-]{1,16}$'
  )
);

CREATE UNIQUE INDEX departments_location_name_key
  ON public.departments (location_id, lower(name));

CREATE UNIQUE INDEX departments_location_code_key
  ON public.departments (location_id, code)
  WHERE code IS NOT NULL;

CREATE INDEX departments_organization_id_idx ON public.departments (organization_id);
CREATE INDEX departments_location_id_idx ON public.departments (location_id);

CREATE TABLE public.department_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  role public.department_member_role NOT NULL DEFAULT 'MEMBER',
  joined_at date NOT NULL DEFAULT CURRENT_DATE,
  left_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, member_id),
  CONSTRAINT department_members_left_after_join CHECK (left_at IS NULL OR left_at >= joined_at)
);

CREATE UNIQUE INDEX department_members_one_active_per_dept
  ON public.department_members (department_id, member_id)
  WHERE left_at IS NULL;

CREATE INDEX department_members_member_idx ON public.department_members (member_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.staff_can_manage_department(p_department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.departments d
    WHERE d.id = p_department_id
      AND d.organization_id = public.current_user_organization_id()
      AND (
        public.is_super_admin()
        OR (
          public.has_role('LOCATION_ADMIN')
          AND public.user_has_location_access(d.location_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_department_member(p_department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.department_members dm
    WHERE dm.department_id = p_department_id
      AND dm.member_id = public.current_member_id()
      AND dm.left_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.department_leader_label(p_department_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(btrim(concat_ws(' ', m.first_name, m.last_name)), ''),
    m.membership_number
  )
  FROM public.departments d
  JOIN public.members m ON m.id = d.leader_member_id
  WHERE d.id = p_department_id
    AND (
      public.staff_can_manage_department(p_department_id)
      OR public.is_active_department_member(p_department_id)
    );
$$;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;

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
    )
  );

CREATE POLICY departments_insert_staff
  ON public.departments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND public.user_has_location_access(location_id)
      )
    )
  );

CREATE POLICY departments_update_staff
  ON public.departments
  FOR UPDATE
  TO authenticated
  USING (public.staff_can_manage_department(id))
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND public.user_has_location_access(location_id)
      )
    )
  );

CREATE POLICY departments_delete_staff
  ON public.departments
  FOR DELETE
  TO authenticated
  USING (public.staff_can_manage_department(id));

CREATE POLICY department_members_select
  ON public.department_members
  FOR SELECT
  TO authenticated
  USING (
    member_id = public.current_member_id()
    OR public.staff_can_manage_department(department_id)
  );

CREATE POLICY department_members_insert_staff
  ON public.department_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_manage_department(department_id));

CREATE POLICY department_members_update_staff
  ON public.department_members
  FOR UPDATE
  TO authenticated
  USING (public.staff_can_manage_department(department_id))
  WITH CHECK (public.staff_can_manage_department(department_id));

CREATE POLICY department_members_delete_staff
  ON public.department_members
  FOR DELETE
  TO authenticated
  USING (public.staff_can_manage_department(department_id));

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

REVOKE ALL ON FUNCTION public.staff_can_manage_department(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_department_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.department_leader_label(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_can_manage_department(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_department_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.department_leader_label(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.departments,
  public.department_members
TO authenticated;

COMMENT ON TABLE public.departments IS
  'Campus ministry departments. location_id is required.';
COMMENT ON TABLE public.department_members IS
  'A member may belong to multiple departments at the same time.';
