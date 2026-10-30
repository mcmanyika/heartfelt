-- Per-church admin nav enable/disable (managed by ProFaith platform admins).

CREATE TABLE public.organization_nav_links (
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  nav_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, nav_key),
  CONSTRAINT organization_nav_links_key_check CHECK (nav_key ~ '^[a-z][a-z0-9_]*$')
);

CREATE INDEX organization_nav_links_org_idx
  ON public.organization_nav_links (organization_id);

ALTER TABLE public.organization_nav_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_nav_links_select_org
  ON public.organization_nav_links
  FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

GRANT SELECT ON public.organization_nav_links TO authenticated;
GRANT ALL ON public.organization_nav_links TO service_role;

COMMENT ON TABLE public.organization_nav_links IS
  'Per-organization admin nav link toggles. Missing row means enabled. Written by platform admins via service role.';
