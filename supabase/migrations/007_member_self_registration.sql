-- Member self-registration: pending profiles stay inactive until staff activate them.
-- Service-role activation is allowed because Location Admins cannot change profile status
-- through the normal trigger.

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profile id cannot be changed';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id cannot be changed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.is_super_admin()
     AND coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Only a Super Admin can change profile status';
  END IF;

  RETURN NEW;
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
  v_self_registration boolean;
BEGIN
  v_org := NULLIF(NEW.raw_user_meta_data->>'organization_id', '')::uuid;
  v_location := NULLIF(NEW.raw_user_meta_data->>'location_id', '')::uuid;
  v_self_registration := coalesce(NEW.raw_user_meta_data->>'registration_source', '') = 'self';

  IF v_org IS NULL THEN
    SELECT id INTO v_org
    FROM public.organizations
    WHERE slug = 'heartfelt-international-ministries'
    LIMIT 1;
  END IF;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Cannot create profile: organization is not configured';
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
    CASE WHEN v_self_registration THEN 'INACTIVE'::public.profile_status ELSE 'ACTIVE'::public.profile_status END
  );

  IF NOT v_self_registration THEN
    SELECT id INTO v_member_role
    FROM public.roles
    WHERE name = 'MEMBER';

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
