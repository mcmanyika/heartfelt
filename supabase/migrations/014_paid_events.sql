-- Paid events: optional ticket price with Stripe Checkout registration.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS currency text;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_paid_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_paid_check CHECK (
    (
      NOT is_paid
      AND price IS NULL
      AND currency IS NULL
    )
    OR (
      is_paid
      AND registration_required
      AND price IS NOT NULL
      AND price > 0
      AND currency IN ('USD', 'ZAR')
    )
  );

ALTER TYPE public.event_registration_status ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_stripe_session_uidx
  ON public.event_registrations (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
