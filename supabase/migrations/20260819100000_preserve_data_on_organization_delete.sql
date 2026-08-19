-- FIX-05
-- Deleting an organization must preserve its clients and cases.
-- Their organization_id becomes NULL instead of deleting the records.

ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_organization_id_fkey;

ALTER TABLE public.clients
ADD CONSTRAINT clients_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES public.organizations(id)
ON DELETE SET NULL;


ALTER TABLE public.cases
DROP CONSTRAINT IF EXISTS cases_organization_id_fkey;

ALTER TABLE public.cases
ADD CONSTRAINT cases_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES public.organizations(id)
ON DELETE SET NULL;