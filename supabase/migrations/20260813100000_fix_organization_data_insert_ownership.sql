-- FIX-01 / Group 1
-- Organization data is owned by the organization owner,
-- not by the member who creates the record.

DROP POLICY IF EXISTS clients_insert ON public.clients;

CREATE POLICY clients_insert
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  (
    organization_id IS NULL
    AND owner_id = auth.uid()
  )
  OR
  (
    organization_id IS NOT NULL
    AND is_org_member(organization_id, auth.uid())
    AND is_org_owner(organization_id, owner_id)
  )
);

-- FIX-01 / Group 1
-- Cases created inside an organization are owned by
-- the organization owner, not the member creating the case.

DROP POLICY IF EXISTS cases_insert ON public.cases;

CREATE POLICY cases_insert
ON public.cases
FOR INSERT
TO authenticated
WITH CHECK (
  (
    organization_id IS NULL
    AND owner_id = auth.uid()
  )
  OR
  (
    organization_id IS NOT NULL
    AND is_org_member(organization_id, auth.uid())
    AND is_org_owner(organization_id, owner_id)
  )
);