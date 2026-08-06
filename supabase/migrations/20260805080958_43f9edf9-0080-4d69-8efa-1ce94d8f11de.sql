
REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_firm_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.org_members_detailed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_firm_by_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_members_detailed(uuid) TO authenticated, service_role;
