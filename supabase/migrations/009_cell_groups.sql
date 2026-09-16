-- Cell groups: campus-scoped small groups, one active membership per member,
-- and weekly attendance.

CREATE TYPE public.cell_group_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE public.cell_group_member_role AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE public.cell_group_attendance_status AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');

CREATE TABLE public.cell_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  location_id uuid NOT NULL REFERENCES public.locations (id),
  name text NOT NULL,
  code text,
  description text,
  venue text,
  meeting_weekday smallint,
  meeting_time time,
  leader_member_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  status public.cell_group_status NOT NULL DEFAULT 'ACTIVE',
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cell_groups_weekday_check CHECK (
    meeting_weekday IS NULL OR (meeting_weekday >= 0 AND meeting_weekday <= 6)
  ),
  CONSTRAINT cell_groups_code_format CHECK (
    code IS NULL OR code ~ '^[A-Z0-9-]{1,16}$'
  )
);

CREATE UNIQUE INDEX cell_groups_location_name_key
  ON public.cell_groups (location_id, lower(name));

CREATE UNIQUE INDEX cell_groups_location_code_key
  ON public.cell_groups (location_id, code)
  WHERE code IS NOT NULL;

CREATE INDEX cell_groups_organization_id_idx ON public.cell_groups (organization_id);
CREATE INDEX cell_groups_location_id_idx ON public.cell_groups (location_id);

CREATE TABLE public.cell_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_group_id uuid NOT NULL REFERENCES public.cell_groups (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  role public.cell_group_member_role NOT NULL DEFAULT 'MEMBER',
  joined_at date NOT NULL DEFAULT CURRENT_DATE,
  left_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cell_group_id, member_id),
  CONSTRAINT cell_group_members_left_after_join CHECK (left_at IS NULL OR left_at >= joined_at)
);

CREATE UNIQUE INDEX cell_group_members_one_active
  ON public.cell_group_members (member_id)
  WHERE left_at IS NULL;

CREATE INDEX cell_group_members_group_idx ON public.cell_group_members (cell_group_id);

CREATE TABLE public.cell_group_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  cell_group_id uuid NOT NULL REFERENCES public.cell_groups (id) ON DELETE CASCADE,
  meeting_date date NOT NULL,
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cell_group_id, meeting_date)
);

CREATE TABLE public.cell_group_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.cell_group_meetings (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  status public.cell_group_attendance_status NOT NULL DEFAULT 'PRESENT',
  UNIQUE (meeting_id, member_id)
);

CREATE INDEX cell_group_attendance_meeting_idx ON public.cell_group_attendance (meeting_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cell_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.staff_can_manage_cell_group(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cell_groups cg
    WHERE cg.id = p_group_id
      AND cg.organization_id = public.current_user_organization_id()
      AND (
        public.is_super_admin()
        OR (
          public.has_role('LOCATION_ADMIN')
          AND public.user_has_location_access(cg.location_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_cell_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cell_group_members cgm
    WHERE cgm.cell_group_id = p_group_id
      AND cgm.member_id = public.current_member_id()
      AND cgm.left_at IS NULL
  );
$$;

ALTER TABLE public.cell_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_group_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_group_attendance ENABLE ROW LEVEL SECURITY;

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
    )
  );

CREATE POLICY cell_groups_insert_staff
  ON public.cell_groups
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

CREATE POLICY cell_groups_update_staff
  ON public.cell_groups
  FOR UPDATE
  TO authenticated
  USING (public.staff_can_manage_cell_group(id))
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

CREATE POLICY cell_groups_delete_staff
  ON public.cell_groups
  FOR DELETE
  TO authenticated
  USING (public.staff_can_manage_cell_group(id));

CREATE POLICY cell_group_members_select
  ON public.cell_group_members
  FOR SELECT
  TO authenticated
  USING (
    member_id = public.current_member_id()
    OR public.staff_can_manage_cell_group(cell_group_id)
  );

CREATE POLICY cell_group_members_insert_staff
  ON public.cell_group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_manage_cell_group(cell_group_id));

CREATE POLICY cell_group_members_update_staff
  ON public.cell_group_members
  FOR UPDATE
  TO authenticated
  USING (public.staff_can_manage_cell_group(cell_group_id))
  WITH CHECK (public.staff_can_manage_cell_group(cell_group_id));

CREATE POLICY cell_group_members_delete_staff
  ON public.cell_group_members
  FOR DELETE
  TO authenticated
  USING (public.staff_can_manage_cell_group(cell_group_id));

CREATE POLICY cell_group_meetings_select
  ON public.cell_group_meetings
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.staff_can_manage_cell_group(cell_group_id)
      OR public.is_active_cell_group_member(cell_group_id)
    )
  );

CREATE POLICY cell_group_meetings_insert_staff
  ON public.cell_group_meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND public.staff_can_manage_cell_group(cell_group_id)
  );

CREATE POLICY cell_group_meetings_update_staff
  ON public.cell_group_meetings
  FOR UPDATE
  TO authenticated
  USING (public.staff_can_manage_cell_group(cell_group_id))
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND public.staff_can_manage_cell_group(cell_group_id)
  );

CREATE POLICY cell_group_meetings_delete_staff
  ON public.cell_group_meetings
  FOR DELETE
  TO authenticated
  USING (public.staff_can_manage_cell_group(cell_group_id));

CREATE POLICY cell_group_attendance_select
  ON public.cell_group_attendance
  FOR SELECT
  TO authenticated
  USING (
    member_id = public.current_member_id()
    OR EXISTS (
      SELECT 1
      FROM public.cell_group_meetings m
      WHERE m.id = meeting_id
        AND public.staff_can_manage_cell_group(m.cell_group_id)
    )
  );

CREATE POLICY cell_group_attendance_insert_staff
  ON public.cell_group_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cell_group_meetings m
      WHERE m.id = meeting_id
        AND public.staff_can_manage_cell_group(m.cell_group_id)
    )
  );

CREATE POLICY cell_group_attendance_update_staff
  ON public.cell_group_attendance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cell_group_meetings m
      WHERE m.id = meeting_id
        AND public.staff_can_manage_cell_group(m.cell_group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cell_group_meetings m
      WHERE m.id = meeting_id
        AND public.staff_can_manage_cell_group(m.cell_group_id)
    )
  );

CREATE POLICY cell_group_attendance_delete_staff
  ON public.cell_group_attendance
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cell_group_meetings m
      WHERE m.id = meeting_id
        AND public.staff_can_manage_cell_group(m.cell_group_id)
    )
  );

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

CREATE OR REPLACE FUNCTION public.cell_group_leader_label(p_group_id uuid)
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
  FROM public.cell_groups cg
  JOIN public.members m ON m.id = cg.leader_member_id
  WHERE cg.id = p_group_id
    AND (
      public.staff_can_manage_cell_group(p_group_id)
      OR public.is_active_cell_group_member(p_group_id)
    );
$$;

REVOKE ALL ON FUNCTION public.cell_group_leader_label(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cell_group_leader_label(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.cell_groups,
  public.cell_group_members,
  public.cell_group_meetings,
  public.cell_group_attendance
TO authenticated;

COMMENT ON TABLE public.cell_groups IS
  'Campus cell / home groups. location_id is required.';
COMMENT ON TABLE public.cell_group_members IS
  'A member may have only one active cell group (left_at IS NULL).';
COMMENT ON TABLE public.cell_group_meetings IS
  'One meeting row per group per date; attendance hangs off this.';
