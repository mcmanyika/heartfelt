-- Church package billing. Stripe webhooks write these rows with the service role.
-- Super admins can read their own church. Location admins and members cannot.

CREATE TABLE public.organization_billing (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations (id) ON DELETE CASCADE,
  stripe_customer_id text,
  plan text,
  location_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'UNPAID',
  current_period_end timestamptz,
  headquarters_paid boolean NOT NULL DEFAULT false,
  branches_setup integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_billing_plan_check
    CHECK (plan IS NULL OR plan IN ('QUARTERLY', 'HALF_YEAR', 'YEARLY')),
  CONSTRAINT organization_billing_status_check
    CHECK (status IN ('UNPAID', 'ACTIVE', 'PAST_DUE')),
  CONSTRAINT organization_billing_location_count_check
    CHECK (location_count >= 0),
  CONSTRAINT organization_billing_branches_setup_check
    CHECK (branches_setup >= 0)
);

CREATE TABLE public.package_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  plan text NOT NULL,
  location_count integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  amount_cents integer NOT NULL,
  subscription_cents integer NOT NULL,
  setup_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  period_end timestamptz,
  includes_headquarters boolean NOT NULL DEFAULT false,
  branch_setup_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT package_payments_plan_check
    CHECK (plan IN ('QUARTERLY', 'HALF_YEAR', 'YEARLY')),
  CONSTRAINT package_payments_status_check
    CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  CONSTRAINT package_payments_location_count_check
    CHECK (location_count > 0),
  CONSTRAINT package_payments_amount_check
    CHECK (amount_cents >= 0 AND subscription_cents >= 0 AND setup_cents >= 0),
  CONSTRAINT package_payments_branch_setup_check
    CHECK (branch_setup_count >= 0)
);

CREATE INDEX package_payments_organization_created_idx
  ON public.package_payments (organization_id, created_at DESC);

ALTER TABLE public.organization_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_billing_select_super_admin
  ON public.organization_billing
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public.is_super_admin()
  );

CREATE POLICY package_payments_select_super_admin
  ON public.package_payments
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public.is_super_admin()
  );

GRANT SELECT ON public.organization_billing, public.package_payments TO authenticated;
GRANT ALL ON public.organization_billing, public.package_payments TO service_role;

COMMENT ON TABLE public.organization_billing IS
  'Current package status for a church. Written by the Stripe webhook.';
COMMENT ON TABLE public.package_payments IS
  'Stripe Checkout payments for church packages. The success URL does not mark these paid.';
