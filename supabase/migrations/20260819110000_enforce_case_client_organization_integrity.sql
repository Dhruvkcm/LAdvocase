-- FIX-07
-- A case and its client must belong to the same workspace.
-- Organization cases cannot reference clients from another organization.
-- Solo cases cannot reference organization clients.

CREATE OR REPLACE FUNCTION public.validate_case_client_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  client_organization_id uuid;
BEGIN
  SELECT c.organization_id
  INTO client_organization_id
  FROM public.clients c
  WHERE c.id = NEW.client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client does not exist';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM client_organization_id THEN
    RAISE EXCEPTION 'Case and client must belong to the same organization';
  END IF;

  RETURN NEW;
END;
$function$;


DROP TRIGGER IF EXISTS validate_case_client_organization_trigger
ON public.cases;

CREATE TRIGGER validate_case_client_organization_trigger
BEFORE INSERT OR UPDATE OF client_id, organization_id
ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.validate_case_client_organization();