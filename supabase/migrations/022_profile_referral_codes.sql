-- Personal referral codes for every login (staff and members).
-- Personal link → 10% profile + 10% church. Org slug/code → 20% church only.

CREATE OR REPLACE FUNCTION public.generate_profile_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  attempts integer := 0;
BEGIN
  LOOP
    candidate := 'r' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 9);
    EXIT WHEN
      NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.referral_code = candidate
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.slug = candidate
           OR lower(o.short_code) = candidate
      );
    attempts := attempts + 1;
    IF attempts > 25 THEN
      RAISE EXCEPTION 'Unable to generate a unique profile referral code';
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text;

UPDATE public.profiles
SET referral_code = public.generate_profile_referral_code()
WHERE referral_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key
  ON public.profiles (referral_code);

CREATE OR REPLACE FUNCTION public.profiles_set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR btrim(NEW.referral_code) = '' THEN
    NEW.referral_code := public.generate_profile_referral_code();
  ELSE
    NEW.referral_code := lower(btrim(NEW.referral_code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_referral_code ON public.profiles;
CREATE TRIGGER profiles_set_referral_code
  BEFORE INSERT OR UPDATE OF referral_code ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_set_referral_code();

ALTER TABLE public.organization_referrals
  ADD COLUMN IF NOT EXISTS referrer_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS organization_referrals_referrer_profile_idx
  ON public.organization_referrals (referrer_profile_id, created_at DESC)
  WHERE referrer_profile_id IS NOT NULL;

-- Dual payees: one commission row per payee (profile XOR organization).
ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS referrer_profile_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE;

ALTER TABLE public.affiliate_commissions
  ALTER COLUMN referrer_organization_id DROP NOT NULL;

ALTER TABLE public.affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_payment_unique;

ALTER TABLE public.affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_payee_check;

ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_payee_check CHECK (
    (
      referrer_profile_id IS NOT NULL
      AND referrer_organization_id IS NULL
    )
    OR (
      referrer_profile_id IS NULL
      AND referrer_organization_id IS NOT NULL
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_commissions_payment_profile_key
  ON public.affiliate_commissions (package_payment_id)
  WHERE referrer_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_commissions_payment_org_key
  ON public.affiliate_commissions (package_payment_id)
  WHERE referrer_organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS affiliate_commissions_referrer_profile_idx
  ON public.affiliate_commissions (referrer_profile_id, created_at DESC)
  WHERE referrer_profile_id IS NOT NULL;

DROP POLICY IF EXISTS organization_referrals_select_super_admin ON public.organization_referrals;
DROP POLICY IF EXISTS affiliate_commissions_select_super_admin ON public.affiliate_commissions;
DROP POLICY IF EXISTS organization_referrals_select_own ON public.organization_referrals;
DROP POLICY IF EXISTS affiliate_commissions_select_own ON public.affiliate_commissions;

CREATE POLICY organization_referrals_select_own
  ON public.organization_referrals
  FOR SELECT
  TO authenticated
  USING (
    referrer_profile_id = auth.uid()
    OR (
      (
        referrer_organization_id = public.current_user_organization_id()
        OR referred_organization_id = public.current_user_organization_id()
      )
      AND public.is_super_admin()
    )
  );

CREATE POLICY affiliate_commissions_select_own
  ON public.affiliate_commissions
  FOR SELECT
  TO authenticated
  USING (
    referrer_profile_id = auth.uid()
    OR (
      referrer_organization_id = public.current_user_organization_id()
      AND public.is_super_admin()
    )
  );

COMMENT ON COLUMN public.profiles.referral_code IS
  'Personal share code for /start?ref=… Pays 10% to the profile and 10% to their church on setup.';
COMMENT ON COLUMN public.organization_referrals.referrer_profile_id IS
  'Profile that shared a personal referral link (null when an org slug/code was used).';
COMMENT ON COLUMN public.affiliate_commissions.referrer_profile_id IS
  'Person payee for a commission row. Mutually exclusive with referrer_organization_id.';
COMMENT ON TABLE public.affiliate_commissions IS
  'Setup-fee commissions. Personal referral → two rows (10% profile + 10% org). Org code → one row (20% org).';
