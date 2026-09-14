-- Members can insert their own registrations through RLS, but they cannot
-- count other people's rows to enforce capacity. This helper does both.

CREATE OR REPLACE FUNCTION public.register_for_event(p_event_id uuid)
RETURNS public.event_registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_event public.events;
  v_existing public.event_registrations;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_member_id := public.current_member_id();
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'No member record';
  END IF;

  SELECT * INTO v_event
  FROM public.events
  WHERE id = p_event_id
    AND organization_id = public.current_user_organization_id()
    AND public.can_view_location_content(location_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF NOT v_event.registration_required THEN
    RAISE EXCEPTION 'Registration is not required';
  END IF;

  IF v_event.start_date < now() THEN
    RAISE EXCEPTION 'Event has already started';
  END IF;

  SELECT * INTO v_existing
  FROM public.event_registrations
  WHERE event_id = p_event_id
    AND member_id = v_member_id;

  IF FOUND THEN
    IF v_existing.status = 'REGISTERED' THEN
      RAISE EXCEPTION 'Already registered';
    END IF;

    UPDATE public.event_registrations
    SET status = 'REGISTERED',
        registered_at = now()
    WHERE id = v_existing.id
    RETURNING * INTO v_existing;

    RETURN v_existing;
  END IF;

  IF v_event.capacity IS NOT NULL THEN
    SELECT count(*)::integer INTO v_count
    FROM public.event_registrations
    WHERE event_id = p_event_id
      AND status = 'REGISTERED';

    IF v_count >= v_event.capacity THEN
      RAISE EXCEPTION 'Event is full';
    END IF;
  END IF;

  INSERT INTO public.event_registrations (event_id, member_id, status)
  VALUES (p_event_id, v_member_id, 'REGISTERED')
  RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$;

REVOKE ALL ON FUNCTION public.register_for_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_event(uuid) TO authenticated;
