-- Church affiliate referrals: referrer earns 20% of setup fees (once per setup payment).

CREATE TABLE public.organization_referrals (
  referred_organization_id uuid PRIMARY KEY REFERENCES public.organizations (id) ON DELETE CASCADE,
  referrer_organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_referrals_not_self CHECK (
    referred_organization_id <> referrer_organization_id
  )
);

CREATE INDEX organization_referrals_referrer_idx
  ON public.organization_referrals (referrer_organization_id, created_at DESC);

CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  referred_organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  package_payment_id uuid NOT NULL REFERENCES public.package_payments (id) ON DELETE CASCADE,
  setup_cents integer NOT NULL,
  rate_bps integer NOT NULL DEFAULT 2000,
  commission_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  CONSTRAINT affiliate_commissions_setup_check CHECK (setup_cents > 0),
  CONSTRAINT affiliate_commissions_rate_check CHECK (rate_bps > 0 AND rate_bps <= 10000),
  CONSTRAINT affiliate_commissions_amount_check CHECK (commission_cents >= 0),
  CONSTRAINT affiliate_commissions_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'VOID')),
  CONSTRAINT affiliate_commissions_payment_unique UNIQUE (package_payment_id)
);

CREATE INDEX affiliate_commissions_referrer_idx
  ON public.affiliate_commissions (referrer_organization_id, created_at DESC);

CREATE INDEX affiliate_commissions_referred_idx
  ON public.affiliate_commissions (referred_organization_id);

ALTER TABLE public.organization_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_referrals_select_super_admin
  ON public.organization_referrals
  FOR SELECT
  TO authenticated
  USING (
    (
      referrer_organization_id = public.current_user_organization_id()
      OR referred_organization_id = public.current_user_organization_id()
    )
    AND public.is_super_admin()
  );

CREATE POLICY affiliate_commissions_select_super_admin
  ON public.affiliate_commissions
  FOR SELECT
  TO authenticated
  USING (
    referrer_organization_id = public.current_user_organization_id()
    AND public.is_super_admin()
  );

GRANT SELECT ON public.organization_referrals, public.affiliate_commissions TO authenticated;
GRANT ALL ON public.organization_referrals, public.affiliate_commissions TO service_role;

COMMENT ON TABLE public.organization_referrals IS
  'Maps a referred church to the church that referred them. Attribution is set at signup.';
COMMENT ON TABLE public.affiliate_commissions IS
  'Once-off 20% of package setup fees owed to a referring church. Written by the Stripe webhook.';
COMMENT ON COLUMN public.affiliate_commissions.rate_bps IS
  'Commission rate in basis points. 2000 = 20%.';
