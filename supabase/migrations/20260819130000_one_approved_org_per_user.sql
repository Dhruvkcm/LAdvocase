-- FIX-03
-- A user may have multiple pending/rejected membership records,
-- but can belong to only one approved organization at a time.

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_one_approved_per_user
ON public.organization_members (user_id)
WHERE status = 'approved';