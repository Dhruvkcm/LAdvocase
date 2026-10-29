-- Create a permanent history of scheduled hearing dates.
CREATE TABLE public.case_hearing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL
    REFERENCES public.cases(id) ON DELETE CASCADE,
  hearing_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index history lookups by case and date.
CREATE INDEX case_hearing_history_case_date_idx
  ON public.case_hearing_history (case_id, hearing_date);

-- Allow authenticated users to access the table only
-- when they can access the parent case.
ALTER TABLE public.case_hearing_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.case_hearing_history TO authenticated;
GRANT ALL ON public.case_hearing_history TO service_role;

CREATE POLICY case_hearing_history_select
ON public.case_hearing_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.cases c
    WHERE c.id = case_id
      AND (
        c.owner_id = auth.uid()
        OR (
          c.organization_id IS NOT NULL
          AND public.is_org_member(c.organization_id, auth.uid())
        )
      )
  )
);

CREATE POLICY case_hearing_history_insert
ON public.case_hearing_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cases c
    WHERE c.id = case_id
      AND (
        c.owner_id = auth.uid()
        OR (
          c.organization_id IS NOT NULL
          AND public.is_org_member(c.organization_id, auth.uid())
        )
      )
  )
);

-- Backfill the current hearing date for existing cases.
-- Historical dates overwritten before this migration cannot be recovered.
INSERT INTO public.case_hearing_history (case_id, hearing_date)
SELECT id, next_hearing
FROM public.cases
WHERE next_hearing IS NOT NULL;