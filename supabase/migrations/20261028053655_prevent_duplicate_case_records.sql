-- Prevent duplicate case identities within the same organization.
CREATE UNIQUE INDEX cases_unique_identity_per_organization
ON public.cases (
  organization_id,
  UPPER(TRIM(case_code)),
  TRIM(case_serial),
  case_year
)
WHERE organization_id IS NOT NULL
  AND case_code IS NOT NULL
  AND case_serial IS NOT NULL
  AND case_year IS NOT NULL;

-- Prevent duplicate case identities for solo advocates.
CREATE UNIQUE INDEX cases_unique_identity_per_solo_owner
ON public.cases (
  owner_id,
  UPPER(TRIM(case_code)),
  TRIM(case_serial),
  case_year
)
WHERE organization_id IS NULL
  AND owner_id IS NOT NULL
  AND case_code IS NOT NULL
  AND case_serial IS NOT NULL
  AND case_year IS NOT NULL;