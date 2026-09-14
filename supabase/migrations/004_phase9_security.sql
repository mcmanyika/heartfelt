-- Phase 9 security hardening: keep audit logs append-only at the grant layer,
-- stop Location Admins from editing Super Admin profiles, and stop non-super
-- admins from changing privileged profile columns.

REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;

DROP POLICY IF EXISTS profiles_update ON public.profiles;

CREATE POLICY profiles_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      organization_id = public.current_user_organization_id()
      AND public.is_super_admin()
    )
    OR (
      organization_id = public.current_user_organization_id()
      AND public.has_role('LOCATION_ADMIN')
      AND public.user_has_location_access(location_id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = profiles.id
          AND ur.organization_id = profiles.organization_id
          AND r.name = 'SUPER_ADMIN'
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
        AND NOT EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = profiles.id
            AND ur.organization_id = profiles.organization_id
            AND r.name = 'SUPER_ADMIN'
        )
      )
    )
  );

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

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only a Super Admin can change profile status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();
