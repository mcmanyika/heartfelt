-- Multi-tenant SaaS: organization short codes, no default church, and
-- membership numbers prefixed by the church's short_code.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS short_code text;

UPDATE public.organizations
SET slug = 'heartfelt'
WHERE slug = 'heartfelt-international-ministries';

UPDATE public.organizations
SET short_code = 'HIM'
WHERE slug = 'heartfelt' AND (short_code IS NULL OR short_code = '');

UPDATE public.organizations
SET short_code = upper(substr(regexp_replace(slug, '[^a-z0-9]', '', 'gi'), 1, 8))
WHERE short_code IS NULL OR btrim(short_code) = '';

ALTER TABLE public.organizations
  ALTER COLUMN short_code SET NOT NULL;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_short_code_key;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_short_code_key UNIQUE (short_code);

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_short_code_format;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_short_code_format
  CHECK (short_code ~ '^[A-Z0-9]{2,8}$');

CREATE OR REPLACE FUNCTION public.generate_membership_number(p_location_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_org uuid;
  v_prefix text;
  v_number integer;
BEGIN
  SELECT l.code, l.organization_id, o.short_code
    INTO v_code, v_org, v_prefix
  FROM public.locations l
  JOIN public.organizations o ON o.id = l.organization_id
  WHERE l.id = p_location_id;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Location % not found', p_location_id;
  END IF;

  INSERT INTO public.membership_counters (location_id, organization_id, next_number)
  VALUES (p_location_id, v_org, 2)
  ON CONFLICT (location_id) DO UPDATE
    SET next_number = public.membership_counters.next_number + 1
  RETURNING next_number - 1 INTO v_number;

  RETURN v_prefix || '-' || v_code || '-' || lpad(v_number::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_location uuid;
  v_member_role uuid;
  v_super_role uuid;
  v_self_registration boolean;
  v_org_signup boolean;
  v_location_org uuid;
BEGIN
  v_org := NULLIF(NEW.raw_user_meta_data->>'organization_id', '')::uuid;
  v_location := NULLIF(NEW.raw_user_meta_data->>'location_id', '')::uuid;
  v_self_registration := coalesce(NEW.raw_user_meta_data->>'registration_source', '') = 'self';
  v_org_signup := coalesce(NEW.raw_user_meta_data->>'registration_source', '') = 'org_signup';

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Cannot create profile: organization_id is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_org) THEN
    RAISE EXCEPTION 'Cannot create profile: organization is not configured';
  END IF;

  IF v_location IS NOT NULL THEN
    SELECT organization_id INTO v_location_org
    FROM public.locations
    WHERE id = v_location;

    IF v_location_org IS NULL OR v_location_org IS DISTINCT FROM v_org THEN
      RAISE EXCEPTION 'Cannot create profile: location does not belong to the organization';
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id,
    organization_id,
    location_id,
    first_name,
    last_name,
    phone,
    avatar_url,
    status
  )
  VALUES (
    NEW.id,
    v_org,
    v_location,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    CASE
      WHEN v_self_registration THEN 'INACTIVE'::public.profile_status
      ELSE 'ACTIVE'::public.profile_status
    END
  );

  IF v_org_signup THEN
    SELECT id INTO v_super_role FROM public.roles WHERE name = 'SUPER_ADMIN';
    IF v_super_role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, organization_id, location_id)
      VALUES (NEW.id, v_super_role, v_org, NULL);
    END IF;
  ELSIF NOT v_self_registration THEN
    SELECT id INTO v_member_role FROM public.roles WHERE name = 'MEMBER';
    IF v_member_role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, organization_id, location_id)
      SELECT NEW.id, v_member_role, v_org, v_location
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = NEW.id
          AND ur.role_id = v_member_role
          AND ur.organization_id = v_org
          AND ur.location_id IS NOT DISTINCT FROM v_location
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
