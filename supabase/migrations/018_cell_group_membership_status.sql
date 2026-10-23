-- Members can request cell group membership; leaders/admins confirm before it is active.
-- A member may still only have one open membership (pending or active) at a time.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'cell_group_membership_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.cell_group_membership_status AS ENUM ('PENDING', 'ACTIVE');
  END IF;
END $$;

ALTER TABLE public.cell_group_members
  ADD COLUMN IF NOT EXISTS status public.cell_group_membership_status NOT NULL DEFAULT 'ACTIVE';

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
      AND cgm.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_cell_group_leader(p_group_id uuid)
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
      AND cg.leader_member_id IS NOT NULL
      AND cg.leader_member_id = public.current_member_id()
  );
$$;

DROP POLICY IF EXISTS cell_group_members_select ON public.cell_group_members;
CREATE POLICY cell_group_members_select
  ON public.cell_group_members
  FOR SELECT
  TO authenticated
  USING (
    member_id = public.current_member_id()
    OR public.staff_can_manage_cell_group(cell_group_id)
    OR public.is_cell_group_leader(cell_group_id)
  );

DROP POLICY IF EXISTS cell_group_members_update_staff ON public.cell_group_members;
CREATE POLICY cell_group_members_update_manage
  ON public.cell_group_members
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_manage_cell_group(cell_group_id)
    OR public.is_cell_group_leader(cell_group_id)
  )
  WITH CHECK (
    public.staff_can_manage_cell_group(cell_group_id)
    OR public.is_cell_group_leader(cell_group_id)
  );

REVOKE ALL ON FUNCTION public.is_cell_group_leader(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_cell_group_leader(uuid) TO authenticated;

COMMENT ON COLUMN public.cell_group_members.status IS
  'PENDING = member requested join; ACTIVE = confirmed by cell group leader or staff.';
