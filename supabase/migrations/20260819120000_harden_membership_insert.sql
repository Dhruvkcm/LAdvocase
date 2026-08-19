-- FIX-02
-- Only allow legitimate membership creation:
-- 1. Organization owner can create their own owner/approved membership.
-- 2. A user can request to join an organization as advocate/pending.
-- Users cannot create themselves as owner or approved members of an organization.

DROP POLICY IF EXISTS members_insert_self
ON public.organization_members;

CREATE POLICY members_insert_self
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  (
    user_id = auth.uid()
    AND role = 'advocate'
    AND status = 'pending'
  )
  OR
  (
    user_id = auth.uid()
    AND role = 'owner'
    AND status = 'approved'
    AND is_org_owner(organization_id, auth.uid())
  )
);