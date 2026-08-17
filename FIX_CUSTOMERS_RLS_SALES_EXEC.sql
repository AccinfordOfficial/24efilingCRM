-- FIX_CUSTOMERS_RLS_SALES_EXEC.sql
-- Run this script in your Supabase SQL Editor.
-- Resolves the "converted customer not visible to Sales Executive" issue.
-- Replaces the overly-restrictive "Sales Exec Assigned Customers" policy
-- (assigned_to = auth.uid() only) with one that also covers customers the
-- Sales Executive created or owns through the linked lead (assigned_to OR
-- created_by OR lead ownership). Super Admin / Admin access is preserved.

BEGIN;

-- 0. Ensure ownership columns exist before policies reference them
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_id UUID;

-- 1. Drop every existing policy on the customers table for a clean slate
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'customers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.customers', pol.policyname);
    END LOOP;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 3. Recreate policies

-- Super Admin: full access on all customers
CREATE POLICY "Super Admin Full Access Customers" ON public.customers FOR ALL USING (
  (COALESCE(get_my_claim('user_role'), '')::text = 'Super Admin'::text) OR
  public.check_user_is_super_admin(auth.uid())
);

-- Admin: full access scoped to their branch
CREATE POLICY "Admin Branch Access Customers" ON public.customers FOR ALL USING (
  ((COALESCE(get_my_claim('user_role'), '')::text = 'Admin'::text) AND
   (branch_id = get_my_claim('user_branch_id') OR branch_id = get_my_claim('user_branch'))) OR
  (
    public.check_user_is_admin(auth.uid()) AND
    (branch_id = public.get_user_branch_id(auth.uid()) OR branch_id = public.get_user_branch_name(auth.uid()))
  )
);

-- Sales Executive / other staff: select, insert, and update only customers they
-- were assigned, they created, or whose source lead they own. No delete access.
CREATE POLICY "Sales Exec Assigned Customers" ON public.customers FOR ALL USING (
  assigned_to = auth.uid()
  OR created_by = auth.uid()
  OR lead_id IN (
    SELECT id FROM public.leads
    WHERE assigned_to = auth.uid() OR created_by = auth.uid()
  )
);

-- Delete: restricted to Admin and Super Admin only
CREATE POLICY "Customers Admin Delete" ON public.customers FOR DELETE TO authenticated USING (
  (COALESCE(get_my_claim('user_role'), '')::text IN ('Admin', 'Super Admin')) OR
  public.check_user_is_admin(auth.uid()) OR
  public.check_user_is_super_admin(auth.uid())
);

-- 4. Reload schema cache so the change is effective immediately
NOTIFY pgrst, 'reload config';

COMMIT;
