-- Department heads submit financial requisitions; campus staff review them.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'financial_requisition_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.financial_requisition_status AS ENUM (
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.financial_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  location_id uuid NOT NULL REFERENCES public.locations (id),
  department_id uuid NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  requested_by_member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL,
  purpose text NOT NULL,
  notes text,
  status public.financial_requisition_status NOT NULL DEFAULT 'SUBMITTED',
  decided_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_requisitions_amount_positive CHECK (amount > 0),
  CONSTRAINT financial_requisitions_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT financial_requisitions_purpose_len CHECK (
    char_length(btrim(purpose)) BETWEEN 3 AND 500
  )
);

CREATE INDEX IF NOT EXISTS financial_requisitions_org_status_idx
  ON public.financial_requisitions (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS financial_requisitions_location_idx
  ON public.financial_requisitions (location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS financial_requisitions_department_idx
  ON public.financial_requisitions (department_id);

CREATE INDEX IF NOT EXISTS financial_requisitions_requester_idx
  ON public.financial_requisitions (requested_by_member_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.financial_requisitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.staff_can_review_requisition(p_requisition_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.financial_requisitions r
    WHERE r.id = p_requisition_id
      AND r.organization_id = public.current_user_organization_id()
      AND (
        public.is_super_admin()
        OR (
          (public.has_role('LOCATION_ADMIN') OR public.has_role('FINANCE'))
          AND public.user_has_location_access(r.location_id)
        )
      )
  );
$$;

ALTER TABLE public.financial_requisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_requisitions_select ON public.financial_requisitions;
CREATE POLICY financial_requisitions_select
  ON public.financial_requisitions
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      requested_by_member_id = public.current_member_id()
      OR public.is_department_leader(department_id)
      OR public.staff_can_review_requisition(id)
    )
  );

DROP POLICY IF EXISTS financial_requisitions_insert_leader ON public.financial_requisitions;
CREATE POLICY financial_requisitions_insert_leader
  ON public.financial_requisitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND requested_by_member_id = public.current_member_id()
    AND public.is_department_leader(department_id)
    AND status = 'SUBMITTED'
  );

DROP POLICY IF EXISTS financial_requisitions_update_manage ON public.financial_requisitions;
CREATE POLICY financial_requisitions_update_manage
  ON public.financial_requisitions
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_review_requisition(id)
    OR (
      requested_by_member_id = public.current_member_id()
      AND status = 'SUBMITTED'
    )
  )
  WITH CHECK (
    public.staff_can_review_requisition(id)
    OR (
      requested_by_member_id = public.current_member_id()
      AND status IN ('SUBMITTED', 'CANCELLED')
    )
  );

REVOKE ALL ON FUNCTION public.staff_can_review_requisition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_can_review_requisition(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.financial_requisitions TO authenticated;

COMMENT ON TABLE public.financial_requisitions IS
  'Department heads request funds; LOCATION_ADMIN / FINANCE / SUPER_ADMIN decide.';
