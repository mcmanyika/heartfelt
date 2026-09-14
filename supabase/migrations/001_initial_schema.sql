-- Heartfelt International Ministries — initial schema
-- Multi-location, multi-tenant-ready church management platform.
-- Authorization is enforced here via RLS. Application code must still verify access.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

SET search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.location_status AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE public.profile_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

CREATE TYPE public.membership_status AS ENUM (
  'VISITOR',
  'NEW_CONVERT',
  'ACTIVE_MEMBER',
  'INACTIVE_MEMBER',
  'TRANSFERRED'
);

CREATE TYPE public.payment_method AS ENUM (
  'CASH',
  'ECOCASH',
  'ONEMONEY',
  'CARD',
  'BANK_TRANSFER',
  'TERMINAL'
);

CREATE TYPE public.transaction_status AS ENUM (
  'PENDING',
  'SUCCESS',
  'FAILED',
  'REFUNDED'
);

CREATE TYPE public.terminal_status AS ENUM (
  'ONLINE',
  'OFFLINE',
  'MAINTENANCE',
  'DISABLED'
);

CREATE TYPE public.event_registration_status AS ENUM (
  'REGISTERED',
  'ATTENDED',
  'CANCELLED'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  name text NOT NULL,
  code text NOT NULL,
  country text NOT NULL,
  city text NOT NULL,
  address text,
  phone text,
  email text,
  status public.location_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  location_id uuid REFERENCES public.locations (id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  avatar_url text,
  status public.profile_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  location_id uuid REFERENCES public.locations (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_roles_unique_org_scope
  ON public.user_roles (user_id, role_id, organization_id)
  WHERE location_id IS NULL;

CREATE UNIQUE INDEX user_roles_unique_location_scope
  ON public.user_roles (user_id, role_id, organization_id, location_id)
  WHERE location_id IS NOT NULL;

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  location_id uuid NOT NULL REFERENCES public.locations (id),
  profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  membership_number text NOT NULL DEFAULT '',
  membership_status public.membership_status NOT NULL DEFAULT 'ACTIVE_MEMBER',
  date_joined date NOT NULL DEFAULT CURRENT_DATE,
  date_of_birth date,
  gender text,
  address text,
  -- Contact fields used only when profile_id is null.
  -- When a login account is created later, set profile_id and prefer profiles.*
  -- for name, email, phone, and avatar. These columns remain as a fallback snapshot.
  first_name text,
  last_name text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, membership_number),
  CONSTRAINT members_identity_check CHECK (
    profile_id IS NOT NULL
    OR (first_name IS NOT NULL AND last_name IS NOT NULL)
  )
);

CREATE TABLE public.membership_counters (
  location_id uuid PRIMARY KEY REFERENCES public.locations (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  next_number integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.giving_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE public.payment_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  location_id uuid NOT NULL REFERENCES public.locations (id),
  terminal_code text NOT NULL,
  device_name text NOT NULL,
  serial_number text,
  status public.terminal_status NOT NULL DEFAULT 'OFFLINE',
  last_seen_at timestamptz,
  software_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, terminal_code)
);

CREATE TABLE public.giving_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  location_id uuid NOT NULL REFERENCES public.locations (id),
  member_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  giving_category_id uuid NOT NULL REFERENCES public.giving_categories (id),
  amount numeric(14, 2) NOT NULL,
  currency text NOT NULL,
  payment_method public.payment_method NOT NULL,
  transaction_reference text NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'SUCCESS',
  terminal_id uuid REFERENCES public.payment_terminals (id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, transaction_reference),
  CONSTRAINT giving_transactions_amount_positive CHECK (amount > 0)
);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  location_id uuid REFERENCES public.locations (id),
  title text NOT NULL,
  description text,
  venue text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  registration_required boolean NOT NULL DEFAULT false,
  capacity integer,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_dates_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT events_capacity_check CHECK (capacity IS NULL OR capacity > 0)
);

CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  status public.event_registration_status NOT NULL DEFAULT 'REGISTERED',
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  location_id uuid REFERENCES public.locations (id),
  title text NOT NULL,
  message text NOT NULL,
  publish_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcements_dates_check CHECK (
    expiry_date IS NULL OR expiry_date >= publish_date
  )
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.members.first_name IS
  'Used when profile_id is null. After linking a profile, prefer profiles.first_name.';
COMMENT ON COLUMN public.members.last_name IS
  'Used when profile_id is null. After linking a profile, prefer profiles.last_name.';
COMMENT ON COLUMN public.members.email IS
  'Used when profile_id is null. After linking a profile, prefer auth.users.email.';
COMMENT ON COLUMN public.members.phone IS
  'Used when profile_id is null. After linking a profile, prefer profiles.phone.';
COMMENT ON COLUMN public.members.profile_id IS
  'Nullable so a member can exist before receiving a login account. Link later by setting this to auth.users.id / profiles.id.';
COMMENT ON COLUMN public.events.location_id IS
  'NULL means the event is organization-wide.';
COMMENT ON COLUMN public.announcements.location_id IS
  'NULL means the announcement is organization-wide.';
COMMENT ON TABLE public.membership_counters IS
  'Transactional per-location counters for HIM-{CODE}-{NNNNNN} membership numbers.';
COMMENT ON TABLE public.audit_logs IS
  'Append-only for normal application users. No UPDATE/DELETE policies.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX locations_organization_id_idx ON public.locations (organization_id);
CREATE INDEX locations_status_idx ON public.locations (status);

CREATE INDEX profiles_organization_id_idx ON public.profiles (organization_id);
CREATE INDEX profiles_location_id_idx ON public.profiles (location_id);

CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);
CREATE INDEX user_roles_organization_id_idx ON public.user_roles (organization_id);
CREATE INDEX user_roles_location_id_idx ON public.user_roles (location_id);

CREATE INDEX members_organization_id_idx ON public.members (organization_id);
CREATE INDEX members_location_id_idx ON public.members (location_id);
CREATE INDEX members_membership_number_idx ON public.members (membership_number);
CREATE INDEX members_membership_status_idx ON public.members (membership_status);
CREATE INDEX members_email_idx ON public.members (email);
CREATE INDEX members_phone_idx ON public.members (phone);
CREATE INDEX members_profile_id_idx ON public.members (profile_id);

CREATE INDEX giving_categories_organization_id_idx ON public.giving_categories (organization_id);

CREATE INDEX giving_transactions_organization_id_idx ON public.giving_transactions (organization_id);
CREATE INDEX giving_transactions_location_id_idx ON public.giving_transactions (location_id);
CREATE INDEX giving_transactions_member_id_idx ON public.giving_transactions (member_id);
CREATE INDEX giving_transactions_giving_category_id_idx ON public.giving_transactions (giving_category_id);
CREATE INDEX giving_transactions_created_at_idx ON public.giving_transactions (created_at DESC);
CREATE INDEX giving_transactions_status_idx ON public.giving_transactions (status);
CREATE INDEX giving_transactions_payment_method_idx ON public.giving_transactions (payment_method);
CREATE INDEX giving_transactions_terminal_id_idx ON public.giving_transactions (terminal_id);

CREATE INDEX payment_terminals_organization_id_idx ON public.payment_terminals (organization_id);
CREATE INDEX payment_terminals_location_id_idx ON public.payment_terminals (location_id);
CREATE INDEX payment_terminals_terminal_code_idx ON public.payment_terminals (terminal_code);
CREATE INDEX payment_terminals_status_idx ON public.payment_terminals (status);

CREATE INDEX events_organization_id_idx ON public.events (organization_id);
CREATE INDEX events_location_id_idx ON public.events (location_id);
CREATE INDEX events_start_date_idx ON public.events (start_date);

CREATE INDEX announcements_organization_id_idx ON public.announcements (organization_id);
CREATE INDEX announcements_location_id_idx ON public.announcements (location_id);
CREATE INDEX announcements_publish_date_idx ON public.announcements (publish_date);
CREATE INDEX announcements_expiry_date_idx ON public.announcements (expiry_date);

CREATE INDEX audit_logs_organization_id_idx ON public.audit_logs (organization_id);
CREATE INDEX audit_logs_user_id_idx ON public.audit_logs (user_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_entity_type_idx ON public.audit_logs (entity_type);
CREATE INDEX audit_logs_entity_id_idx ON public.audit_logs (entity_id);

-- ---------------------------------------------------------------------------
-- Utility functions and triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.membership_counters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payment_terminals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.giving_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_organization_id_from_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.location_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT organization_id INTO v_org
  FROM public.locations
  WHERE id = NEW.location_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Location % does not exist', NEW.location_id;
  END IF;

  NEW.organization_id := v_org;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_org_from_location BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.sync_organization_id_from_location();
CREATE TRIGGER sync_org_from_location BEFORE INSERT OR UPDATE ON public.payment_terminals
  FOR EACH ROW EXECUTE FUNCTION public.sync_organization_id_from_location();
CREATE TRIGGER sync_org_from_location BEFORE INSERT OR UPDATE ON public.giving_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_organization_id_from_location();

CREATE OR REPLACE FUNCTION public.validate_optional_location_organization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.location_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.locations
    WHERE id = NEW.location_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Location does not belong to the supplied organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_location_org BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.validate_optional_location_organization();
CREATE TRIGGER validate_location_org BEFORE INSERT OR UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.validate_optional_location_organization();
CREATE TRIGGER validate_location_org BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.validate_optional_location_organization();
CREATE TRIGGER validate_location_org BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_optional_location_organization();

CREATE OR REPLACE FUNCTION public.generate_membership_number(p_location_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_org uuid;
  v_number integer;
BEGIN
  SELECT code, organization_id INTO v_code, v_org
  FROM public.locations
  WHERE id = p_location_id;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Location % not found', p_location_id;
  END IF;

  INSERT INTO public.membership_counters (location_id, organization_id, next_number)
  VALUES (p_location_id, v_org, 2)
  ON CONFLICT (location_id) DO UPDATE
    SET next_number = public.membership_counters.next_number + 1
  RETURNING next_number - 1 INTO v_number;

  RETURN 'HIM-' || v_code || '-' || lpad(v_number::text, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_membership_number(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_membership_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.membership_number IS NULL OR NEW.membership_number = '' THEN
    NEW.membership_number := public.generate_membership_number(NEW.location_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_membership_number BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.assign_membership_number();

CREATE OR REPLACE FUNCTION public.init_membership_counter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.membership_counters (location_id, organization_id, next_number)
  VALUES (NEW.id, NEW.organization_id, 1)
  ON CONFLICT (location_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER init_membership_counter AFTER INSERT ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.init_membership_counter();

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.id AND NOT public.is_super_admin() THEN
    NEW.organization_id := OLD.organization_id;
    NEW.location_id := OLD.location_id;
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id
  FROM public.members m
  WHERE m.profile_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = role_name
      AND ur.organization_id = (
        SELECT p.organization_id
        FROM public.profiles p
        WHERE p.id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('SUPER_ADMIN');
$$;

CREATE OR REPLACE FUNCTION public.user_has_location_access(location_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_location_org uuid;
BEGIN
  IF auth.uid() IS NULL OR location_uuid IS NULL THEN
    RETURN false;
  END IF;

  SELECT organization_id INTO v_org
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_org IS NULL THEN
    RETURN false;
  END IF;

  SELECT organization_id INTO v_location_org
  FROM public.locations
  WHERE id = location_uuid;

  IF v_location_org IS NULL OR v_location_org <> v_org THEN
    RETURN false;
  END IF;

  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = v_org
      AND ur.location_id = location_uuid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_location_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.location_id FROM public.profiles p WHERE p.id = auth.uid()),
    (SELECT m.location_id FROM public.members m WHERE m.profile_id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_location_content(location_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    location_uuid IS NULL
    OR public.user_has_location_access(location_uuid)
    OR location_uuid = public.current_user_location_id();
$$;

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_org uuid;
BEGIN
  v_org := public.current_user_organization_id();

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Cannot write audit log without an organization context';
  END IF;

  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address
  )
  VALUES (
    v_org,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb),
    p_ip_address
  )
  RETURNING id INTO v_id;

  RETURN v_id;
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
BEGIN
  v_org := NULLIF(NEW.raw_user_meta_data->>'organization_id', '')::uuid;
  v_location := NULLIF(NEW.raw_user_meta_data->>'location_id', '')::uuid;

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
    avatar_url
  )
  VALUES (
    NEW.id,
    v_org,
    v_location,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url'
  );

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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- protect_profile_sensitive_fields depends on is_super_admin, created above.
CREATE TRIGGER protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giving_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giving_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.locations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.membership_counters FORCE ROW LEVEL SECURITY;
ALTER TABLE public.giving_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.giving_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_terminals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.announcements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- organizations
CREATE POLICY organizations_select_own
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (id = public.current_user_organization_id());

CREATE POLICY organizations_update_super_admin
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    AND id = public.current_user_organization_id()
  )
  WITH CHECK (
    public.is_super_admin()
    AND id = public.current_user_organization_id()
  );

-- locations
CREATE POLICY locations_select
  ON public.locations
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR public.user_has_location_access(id)
      OR id = public.current_user_location_id()
    )
  );

CREATE POLICY locations_insert_super_admin
  ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    AND organization_id = public.current_user_organization_id()
  );

CREATE POLICY locations_update_super_admin
  ON public.locations
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    AND organization_id = public.current_user_organization_id()
  )
  WITH CHECK (
    public.is_super_admin()
    AND organization_id = public.current_user_organization_id()
  );

-- profiles
CREATE POLICY profiles_select
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      organization_id = public.current_user_organization_id()
      AND (
        public.is_super_admin()
        OR public.user_has_location_access(location_id)
      )
    )
  );

CREATE POLICY profiles_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      organization_id = public.current_user_organization_id()
      AND (
        public.is_super_admin()
        OR (
          public.has_role('LOCATION_ADMIN')
          AND public.user_has_location_access(location_id)
        )
      )
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      id = auth.uid()
      OR public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND public.user_has_location_access(location_id)
      )
    )
  );

-- roles (read-only for application users)
CREATE POLICY roles_select_authenticated
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

-- user_roles
CREATE POLICY user_roles_select
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.is_super_admin()
      AND organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY user_roles_insert_super_admin
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    AND organization_id = public.current_user_organization_id()
  );

CREATE POLICY user_roles_update_super_admin
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    AND organization_id = public.current_user_organization_id()
  )
  WITH CHECK (
    public.is_super_admin()
    AND organization_id = public.current_user_organization_id()
  );

CREATE POLICY user_roles_delete_super_admin
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    AND organization_id = public.current_user_organization_id()
  );

-- members
CREATE POLICY members_select
  ON public.members
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR (
      organization_id = public.current_user_organization_id()
      AND (
        public.is_super_admin()
        OR (
          (public.has_role('LOCATION_ADMIN') OR public.has_role('FINANCE'))
          AND public.user_has_location_access(location_id)
        )
      )
    )
  );

CREATE POLICY members_insert_staff
  ON public.members
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

CREATE POLICY members_update_staff
  ON public.members
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

-- giving_categories
CREATE POLICY giving_categories_select
  ON public.giving_categories
  FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY giving_categories_mutate_super_admin
  ON public.giving_categories
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    AND organization_id = public.current_user_organization_id()
  )
  WITH CHECK (
    public.is_super_admin()
    AND organization_id = public.current_user_organization_id()
  );

-- giving_transactions
CREATE POLICY giving_transactions_select
  ON public.giving_transactions
  FOR SELECT
  TO authenticated
  USING (
    member_id = public.current_member_id()
    OR (
      organization_id = public.current_user_organization_id()
      AND (
        public.is_super_admin()
        OR (
          (public.has_role('LOCATION_ADMIN') OR public.has_role('FINANCE'))
          AND public.user_has_location_access(location_id)
        )
      )
    )
  );

CREATE POLICY giving_transactions_insert_staff
  ON public.giving_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        (public.has_role('LOCATION_ADMIN') OR public.has_role('FINANCE'))
        AND public.user_has_location_access(location_id)
      )
    )
  );

CREATE POLICY giving_transactions_update_staff
  ON public.giving_transactions
  FOR UPDATE
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
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        (public.has_role('LOCATION_ADMIN') OR public.has_role('FINANCE'))
        AND public.user_has_location_access(location_id)
      )
    )
  );

-- payment_terminals
CREATE POLICY payment_terminals_select
  ON public.payment_terminals
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

CREATE POLICY payment_terminals_insert_staff
  ON public.payment_terminals
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

CREATE POLICY payment_terminals_update_staff
  ON public.payment_terminals
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

-- events
CREATE POLICY events_select
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public.can_view_location_content(location_id)
  );

CREATE POLICY events_insert_staff
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND location_id IS NOT NULL
        AND public.user_has_location_access(location_id)
      )
    )
  );

CREATE POLICY events_update_staff
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND location_id IS NOT NULL
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
        AND location_id IS NOT NULL
        AND public.user_has_location_access(location_id)
      )
    )
  );

CREATE POLICY events_delete_staff
  ON public.events
  FOR DELETE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND location_id IS NOT NULL
        AND public.user_has_location_access(location_id)
      )
    )
  );

-- event_registrations
CREATE POLICY event_registrations_select
  ON public.event_registrations
  FOR SELECT
  TO authenticated
  USING (
    member_id = public.current_member_id()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.organization_id = public.current_user_organization_id()
        AND (
          public.is_super_admin()
          OR (
            public.has_role('LOCATION_ADMIN')
            AND public.can_view_location_content(e.location_id)
          )
        )
    )
  );

CREATE POLICY event_registrations_insert
  ON public.event_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = public.current_member_id()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.organization_id = public.current_user_organization_id()
        AND (
          public.is_super_admin()
          OR (
            public.has_role('LOCATION_ADMIN')
            AND public.can_view_location_content(e.location_id)
          )
        )
    )
  );

CREATE POLICY event_registrations_update
  ON public.event_registrations
  FOR UPDATE
  TO authenticated
  USING (
    member_id = public.current_member_id()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.organization_id = public.current_user_organization_id()
        AND (
          public.is_super_admin()
          OR (
            public.has_role('LOCATION_ADMIN')
            AND public.can_view_location_content(e.location_id)
          )
        )
    )
  )
  WITH CHECK (
    member_id = public.current_member_id()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.organization_id = public.current_user_organization_id()
        AND (
          public.is_super_admin()
          OR (
            public.has_role('LOCATION_ADMIN')
            AND public.can_view_location_content(e.location_id)
          )
        )
    )
  );

-- announcements
CREATE POLICY announcements_select
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public.can_view_location_content(location_id)
    AND (
      public.is_super_admin()
      OR public.has_role('LOCATION_ADMIN')
      OR (
        publish_date <= now()
        AND (expiry_date IS NULL OR expiry_date > now())
      )
    )
  );

CREATE POLICY announcements_insert_staff
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND location_id IS NOT NULL
        AND public.user_has_location_access(location_id)
      )
    )
  );

CREATE POLICY announcements_update_staff
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND location_id IS NOT NULL
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
        AND location_id IS NOT NULL
        AND public.user_has_location_access(location_id)
      )
    )
  );

CREATE POLICY announcements_delete_staff
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND location_id IS NOT NULL
        AND public.user_has_location_access(location_id)
      )
    )
  );

-- audit_logs (append-only for application users)
CREATE POLICY audit_logs_select_super_admin
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    AND organization_id = public.current_user_organization_id()
  );

CREATE POLICY audit_logs_insert_self
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- membership_counters: no authenticated policies. Access is via SECURITY DEFINER only.

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.organizations,
  public.locations,
  public.profiles,
  public.user_roles,
  public.members,
  public.giving_categories,
  public.giving_transactions,
  public.payment_terminals,
  public.events,
  public.event_registrations,
  public.announcements,
  public.audit_logs
TO authenticated;

GRANT SELECT ON public.roles TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_location_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_location_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_location_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, uuid, jsonb, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES
      (
        'avatars',
        'avatars',
        false,
        2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
      ),
      (
        'organization-assets',
        'organization-assets',
        false,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
      ),
      (
        'event-images',
        'event-images',
        false,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
      )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    EXECUTE $policies$
      DROP POLICY IF EXISTS avatars_select_own_or_staff ON storage.objects;
      DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
      DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
      DROP POLICY IF EXISTS organization_assets_select ON storage.objects;
      DROP POLICY IF EXISTS organization_assets_mutate_super_admin ON storage.objects;
      DROP POLICY IF EXISTS event_images_select ON storage.objects;
      DROP POLICY IF EXISTS event_images_mutate_staff ON storage.objects;

      CREATE POLICY avatars_select_own_or_staff
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (
          bucket_id = 'avatars'
          AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_super_admin()
            OR public.has_role('LOCATION_ADMIN')
          )
        );

      CREATE POLICY avatars_insert_own
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'avatars'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );

      CREATE POLICY avatars_update_own
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (
          bucket_id = 'avatars'
          AND (storage.foldername(name))[1] = auth.uid()::text
        )
        WITH CHECK (
          bucket_id = 'avatars'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );

      CREATE POLICY organization_assets_select
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (bucket_id = 'organization-assets');

      CREATE POLICY organization_assets_mutate_super_admin
        ON storage.objects
        FOR ALL
        TO authenticated
        USING (
          bucket_id = 'organization-assets'
          AND public.is_super_admin()
        )
        WITH CHECK (
          bucket_id = 'organization-assets'
          AND public.is_super_admin()
        );

      CREATE POLICY event_images_select
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (bucket_id = 'event-images');

      CREATE POLICY event_images_mutate_staff
        ON storage.objects
        FOR ALL
        TO authenticated
        USING (
          bucket_id = 'event-images'
          AND (public.is_super_admin() OR public.has_role('LOCATION_ADMIN'))
        )
        WITH CHECK (
          bucket_id = 'event-images'
          AND (public.is_super_admin() OR public.has_role('LOCATION_ADMIN'))
        );
    $policies$;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Realtime (terminal status and recent giving)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.giving_transactions';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_terminals';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;
