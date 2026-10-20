-- Embeddable Stripe payment buttons for church websites.
-- Staff manage buttons; the public give page and Stripe webhook use the service role.

CREATE TABLE public.payment_buttons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations (id),
  giving_category_id uuid NOT NULL REFERENCES public.giving_categories (id),
  public_token text NOT NULL UNIQUE,
  name text NOT NULL,
  button_label text NOT NULL DEFAULT 'Give',
  amount_mode text NOT NULL DEFAULT 'OPEN',
  amount numeric(14, 2),
  currency text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  success_message text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_buttons_name_length CHECK (char_length(name) BETWEEN 2 AND 80),
  CONSTRAINT payment_buttons_label_length CHECK (char_length(button_label) BETWEEN 1 AND 40),
  CONSTRAINT payment_buttons_token_length CHECK (char_length(public_token) BETWEEN 16 AND 64),
  CONSTRAINT payment_buttons_amount_mode_check CHECK (amount_mode IN ('FIXED', 'OPEN')),
  CONSTRAINT payment_buttons_amount_check CHECK (
    (amount_mode = 'OPEN' AND amount IS NULL)
    OR (amount_mode = 'FIXED' AND amount IS NOT NULL AND amount > 0)
  )
);

CREATE INDEX payment_buttons_organization_id_idx ON public.payment_buttons (organization_id);
CREATE INDEX payment_buttons_location_id_idx ON public.payment_buttons (location_id);
CREATE INDEX payment_buttons_active_idx ON public.payment_buttons (organization_id, active);

ALTER TABLE public.giving_transactions
  ADD COLUMN payment_button_id uuid REFERENCES public.payment_buttons (id) ON DELETE SET NULL;

CREATE INDEX giving_transactions_payment_button_id_idx
  ON public.giving_transactions (payment_button_id)
  WHERE payment_button_id IS NOT NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payment_buttons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sync_org_from_location BEFORE INSERT OR UPDATE ON public.payment_buttons
  FOR EACH ROW EXECUTE FUNCTION public.sync_organization_id_from_location();

ALTER TABLE public.payment_buttons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_buttons FORCE ROW LEVEL SECURITY;

CREATE POLICY payment_buttons_select
  ON public.payment_buttons
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        (public.has_role('LOCATION_ADMIN') OR public.has_role('FINANCE'))
        AND public.user_has_location_access(location_id)
      )
    )
  );

CREATE POLICY payment_buttons_insert_staff
  ON public.payment_buttons
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

CREATE POLICY payment_buttons_update_staff
  ON public.payment_buttons
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND public.user_has_location_access(location_id)
      )
    )
  )
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

GRANT SELECT, INSERT, UPDATE ON public.payment_buttons TO authenticated;
GRANT ALL ON public.payment_buttons TO service_role;

COMMENT ON TABLE public.payment_buttons IS
  'Stripe Checkout buttons that churches embed on external websites.';
COMMENT ON COLUMN public.giving_transactions.payment_button_id IS
  'Set when the gift came from an embeddable payment button.';
