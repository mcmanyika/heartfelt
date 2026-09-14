-- Family identity is returned through a definer function so members can see
-- linked relatives without a recursive members <-> family_links RLS loop.

DROP POLICY IF EXISTS members_select_family ON public.members;

CREATE OR REPLACE FUNCTION public.list_family_links_for_member(p_member_id uuid)
RETURNS TABLE (
  id uuid,
  related_member_id uuid,
  related_first_name text,
  related_last_name text,
  related_membership_number text,
  location_name text,
  location_code text,
  relationship public.family_relationship,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_caller uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org := public.current_user_organization_id();
  v_caller := public.current_member_id();

  IF NOT EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = p_member_id
      AND m.organization_id = v_org
      AND (
        public.is_super_admin()
        OR public.user_has_location_access(m.location_id)
        OR m.id = v_caller
      )
  ) THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    CASE WHEN l.member_id = p_member_id THEN l.related_member_id ELSE l.member_id END,
    r.first_name,
    r.last_name,
    r.membership_number,
    loc.name,
    loc.code,
    CASE
      WHEN l.member_id = p_member_id THEN l.relationship
      WHEN l.relationship = 'PARENT' THEN 'CHILD'::public.family_relationship
      WHEN l.relationship = 'CHILD' THEN 'PARENT'::public.family_relationship
      WHEN l.relationship = 'GUARDIAN' THEN 'DEPENDENT'::public.family_relationship
      WHEN l.relationship = 'DEPENDENT' THEN 'GUARDIAN'::public.family_relationship
      ELSE l.relationship
    END,
    l.notes
  FROM public.member_family_links l
  JOIN public.members r
    ON r.id = CASE
      WHEN l.member_id = p_member_id THEN l.related_member_id
      ELSE l.member_id
    END
  JOIN public.locations loc ON loc.id = r.location_id
  WHERE l.organization_id = v_org
    AND (l.member_id = p_member_id OR l.related_member_id = p_member_id)
  ORDER BY r.last_name, r.first_name;
END;
$$;

REVOKE ALL ON FUNCTION public.list_family_links_for_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_family_links_for_member(uuid) TO authenticated;
