-- Allow church logos in organization-assets to render on public sign-in pages.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    UPDATE storage.buckets
    SET public = true
    WHERE id = 'organization-assets';

    EXECUTE $policies$
      DROP POLICY IF EXISTS organization_assets_select_anon ON storage.objects;

      CREATE POLICY organization_assets_select_anon
        ON storage.objects
        FOR SELECT
        TO anon
        USING (bucket_id = 'organization-assets');
    $policies$;
  END IF;
END
$$;
