-- Family connections between membership records in the same organization.
-- Location Admins may only link members they can already access.
-- Members may read their own links.

CREATE TYPE public.family_relationship AS ENUM (
  'SPOUSE',
  'PARENT',
  'CHILD',
  'SIBLING',
  'GUARDIAN',
  'DEPENDENT',
  'OTHER'
);

CREATE TABLE public.member_family_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  related_member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  relationship public.family_relationship NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT member_family_links_not_self CHECK (member_id <> related_member_id)
);

CREATE UNIQUE INDEX member_family_links_pair_idx
  ON public.member_family_links (
    organization_id,
    LEAST(member_id, related_member_id),
    GREATEST(member_id, related_member_id)
  );

CREATE INDEX member_family_links_member_id_idx ON public.member_family_links (member_id);
CREATE INDEX member_family_links_related_member_id_idx ON public.member_family_links (related_member_id);
CREATE INDEX member_family_links_organization_id_idx ON public.member_family_links (organization_id);

CREATE OR REPLACE FUNCTION public.sync_member_family_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_member public.members;
  v_related public.members;
BEGIN
  SELECT * INTO v_member FROM public.members WHERE id = NEW.member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Both members must exist';
  END IF;

  SELECT * INTO v_related FROM public.members WHERE id = NEW.related_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Both members must exist';
  END IF;

  IF v_member.organization_id IS DISTINCT FROM v_related.organization_id THEN
    RAISE EXCEPTION 'Family links must stay inside one organization';
  END IF;

  NEW.organization_id := v_member.organization_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_member_family_link
  BEFORE INSERT OR UPDATE ON public.member_family_links
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_member_family_link();

ALTER TABLE public.member_family_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_family_links FORCE ROW LEVEL SECURITY;

CREATE POLICY member_family_links_select
  ON public.member_family_links
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id IN (member_family_links.member_id, member_family_links.related_member_id)
          AND (
            public.user_has_location_access(m.location_id)
            OR m.profile_id = auth.uid()
          )
      )
    )
  );

CREATE POLICY member_family_links_insert_staff
  ON public.member_family_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND EXISTS (
          SELECT 1 FROM public.members m
          WHERE m.id = member_id
            AND public.user_has_location_access(m.location_id)
        )
        AND EXISTS (
          SELECT 1 FROM public.members r
          WHERE r.id = related_member_id
            AND public.user_has_location_access(r.location_id)
        )
      )
    )
  );

CREATE POLICY member_family_links_delete_staff
  ON public.member_family_links
  FOR DELETE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      public.is_super_admin()
      OR (
        public.has_role('LOCATION_ADMIN')
        AND EXISTS (
          SELECT 1 FROM public.members m
          WHERE m.id = member_id
            AND public.user_has_location_access(m.location_id)
        )
        AND EXISTS (
          SELECT 1 FROM public.members r
          WHERE r.id = related_member_id
            AND public.user_has_location_access(r.location_id)
        )
      )
    )
  );

GRANT SELECT, INSERT, DELETE ON public.member_family_links TO authenticated;
