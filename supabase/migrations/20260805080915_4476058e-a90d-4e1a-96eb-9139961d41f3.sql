
-- profiles/
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name text NOT NULL,
  firm_code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.member_role AS ENUM ('owner','advocate','senior_advocate','junior_advocate','receptionist','accountant','office_manager');
CREATE TYPE public.member_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'advocate',
  status public.member_status NOT NULL DEFAULT 'pending',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org AND m.user_id = _uid AND m.status = 'approved');
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_org uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = _org AND o.owner_id = _uid);
$$;

CREATE POLICY "orgs_select" ON public.organizations FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_member(id, auth.uid()));
CREATE POLICY "orgs_insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "orgs_update" ON public.organizations FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "orgs_delete" ON public.organizations FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "members_select" ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_owner(organization_id, auth.uid()) OR public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "members_insert_self" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update_owner" ON public.organization_members FOR UPDATE TO authenticated
  USING (public.is_org_owner(organization_id, auth.uid())) WITH CHECK (public.is_org_owner(organization_id, auth.uid()));
CREATE POLICY "members_delete" ON public.organization_members FOR DELETE TO authenticated
  USING (public.is_org_owner(organization_id, auth.uid()) OR user_id = auth.uid());

-- lookup a firm by its public code (no data leak beyond name)
CREATE OR REPLACE FUNCTION public.find_firm_by_code(_code text)
RETURNS TABLE (id uuid, firm_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.firm_name FROM public.organizations o WHERE upper(o.firm_code) = upper(trim(_code));
$$;

-- members with profile info, only visible to org owner/members
CREATE OR REPLACE FUNCTION public.org_members_detailed(_org uuid)
RETURNS TABLE (id uuid, user_id uuid, role public.member_role, status public.member_status, joined_at timestamptz, full_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.user_id, m.role, m.status, m.joined_at,
         COALESCE(p.full_name,''), COALESCE(p.email,'')
  FROM public.organization_members m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.organization_id = _org
    AND (public.is_org_owner(_org, auth.uid()) OR public.is_org_member(_org, auth.uid()))
  ORDER BY m.joined_at;
$$;

-- clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  mobile text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid())));
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (organization_id IS NULL OR public.is_org_member(organization_id, auth.uid())));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid())))
  WITH CHECK (organization_id IS NULL OR public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated
  USING ((organization_id IS NULL AND owner_id = auth.uid())
      OR (organization_id IS NOT NULL AND public.is_org_owner(organization_id, auth.uid())));

-- cases
CREATE TYPE public.case_status AS ENUM ('pending','disposed');

CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  case_number text NOT NULL,
  court_name text NOT NULL,
  case_type text NOT NULL,
  filing_date date,
  next_hearing date,
  status public.case_status NOT NULL DEFAULT 'pending',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cases_select" ON public.cases FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid())));
CREATE POLICY "cases_insert" ON public.cases FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (organization_id IS NULL OR public.is_org_member(organization_id, auth.uid())));
CREATE POLICY "cases_update" ON public.cases FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid())))
  WITH CHECK (organization_id IS NULL OR public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "cases_delete" ON public.cases FOR DELETE TO authenticated
  USING ((organization_id IS NULL AND owner_id = auth.uid())
      OR (organization_id IS NOT NULL AND public.is_org_owner(organization_id, auth.uid())));

CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_cases_org ON public.cases(organization_id);
CREATE INDEX idx_cases_client ON public.cases(client_id);
