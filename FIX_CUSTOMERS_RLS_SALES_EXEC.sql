-- Fix Customer RLS for Sales Executives
-- Grants read/write access to Sales Execs if they own the customer or the source lead.

-- Enable RLS on customers if not already enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop previous broad/restrictive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON customers;
DROP POLICY IF EXISTS "Enable update for users based on email" ON customers;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON customers;
DROP POLICY IF EXISTS "Customers_Role_Based_Select" ON customers;
DROP POLICY IF EXISTS "Customers_Role_Based_Insert" ON customers;
DROP POLICY IF EXISTS "Customers_Role_Based_Update" ON customers;
DROP POLICY IF EXISTS "Customers_Role_Based_Delete" ON customers;
DROP POLICY IF EXISTS "Customers_SuperAdmin_All" ON customers;
DROP POLICY IF EXISTS "Customers_Admin_All" ON customers;
DROP POLICY IF EXISTS "Customers_SalesExec_Select" ON customers;
DROP POLICY IF EXISTS "Customers_SalesExec_Insert" ON customers;
DROP POLICY IF EXISTS "Customers_SalesExec_Update" ON customers;

-- 1. SUPER ADMIN: Full Access
CREATE POLICY "Customers_SuperAdmin_All" ON customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 2. ADMIN: Branch Access
CREATE POLICY "Customers_Admin_All" ON customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND (
      profiles.branch_id IS NULL OR customers.branch_id = profiles.branch_id
    )
  )
);

-- 3. SALES EXEC (And general owners): Assigned to them OR created by them OR converted from a lead they owned
CREATE POLICY "Customers_Owner_Select" ON customers
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid() OR 
  created_by = auth.uid() OR
  lead_id IN (
    SELECT id FROM leads WHERE assigned_to = auth.uid() OR created_by = auth.uid()
  )
);

CREATE POLICY "Customers_Owner_Insert" ON customers
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  assigned_to = auth.uid() OR 
  created_by = auth.uid() OR
  lead_id IN (
    SELECT id FROM leads WHERE assigned_to = auth.uid() OR created_by = auth.uid()
  )
);

CREATE POLICY "Customers_Owner_Update" ON customers
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid() OR 
  created_by = auth.uid() OR
  lead_id IN (
    SELECT id FROM leads WHERE assigned_to = auth.uid() OR created_by = auth.uid()
  )
)
WITH CHECK (
  assigned_to = auth.uid() OR 
  created_by = auth.uid() OR
  lead_id IN (
    SELECT id FROM leads WHERE assigned_to = auth.uid() OR created_by = auth.uid()
  )
);
