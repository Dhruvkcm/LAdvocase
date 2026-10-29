-- Store a note describing what happened at each hearing.
ALTER TABLE public.case_hearing_history
ADD COLUMN hearing_note text;

-- Allow authorized users to update hearing notes.
-- Access is inherited from the parent case's ownership
-- and organization membership rules.
CREATE POLICY case_hearing_history_update
ON public.case_hearing_history
FOR UPDATE
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
)
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