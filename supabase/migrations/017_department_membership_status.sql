-- Members can request department membership; leaders/admins confirm before it is active.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'department_membership_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.department_membership_status AS ENUM ('PENDING', 'ACTIVE');
  END IF;
END $$;

ALTER TABLE public.department_members
  ADD COLUMN IF NOT EXISTS status public.department_membership_status NOT NULL DEFAULT 'ACTIVE';

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
      AND dm.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_department_leader(p_department_id uuid)
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
      AND d.leader_member_id IS NOT NULL
      AND d.leader_member_id = public.current_member_id()
  );
$$;

DROP POLICY IF EXISTS department_members_select ON public.department_members;
CREATE POLICY department_members_select
  ON public.department_members
  FOR SELECT
  TO authenticated
  USING (
    member_id = public.current_member_id()
    OR public.staff_can_manage_department(department_id)
    OR public.is_department_leader(department_id)
  );

DROP POLICY IF EXISTS department_members_update_staff ON public.department_members;
CREATE POLICY department_members_update_manage
  ON public.department_members
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_manage_department(department_id)
    OR public.is_department_leader(department_id)
  )
  WITH CHECK (
    public.staff_can_manage_department(department_id)
    OR public.is_department_leader(department_id)
  );

REVOKE ALL ON FUNCTION public.is_department_leader(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_department_leader(uuid) TO authenticated;

COMMENT ON COLUMN public.department_members.status IS
  'PENDING = member requested join; ACTIVE = confirmed by department leader or staff.';
