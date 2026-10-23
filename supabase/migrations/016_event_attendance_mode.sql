-- Events can be attended live, online, or both.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'event_attendance_mode'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.event_attendance_mode AS ENUM ('LIVE', 'ONLINE', 'HYBRID');
  END IF;
END $$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS attendance_mode public.event_attendance_mode NOT NULL DEFAULT 'LIVE',
  ADD COLUMN IF NOT EXISTS online_url text;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_online_url_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_online_url_check CHECK (
    online_url IS NULL
    OR (
      attendance_mode IN ('ONLINE', 'HYBRID')
      AND length(trim(online_url)) > 0
      AND online_url ~* '^https?://'
    )
  );

COMMENT ON COLUMN public.events.attendance_mode IS
  'LIVE = in person, ONLINE = virtual only, HYBRID = both.';
COMMENT ON COLUMN public.events.online_url IS
  'Meeting link for ONLINE or HYBRID events.';
