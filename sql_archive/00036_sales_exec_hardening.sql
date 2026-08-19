-- ==============================================================================
-- SQL MIGRATION: 00036_SALES_EXEC_HARDENING
-- Canonical Row-Level Security hardening: Sales Executive scoping + role escalation guards
-- Replaces: FIX_NOTIFICATIONS_RLS_PERMISSIVE.sql, FIX_CUSTOMERS_RLS_SALES_EXEC.sql
-- Run this in your Supabase SQL Editor. Idempotent — safe to re-run.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. NOTIFICATIONS
-- Decision: INSERT may target any user (lead assignment etc.); SELECT/UPDATE/DELETE own only.
-- This REVERSES the previous permissive policies (SELECT/UPDATE/DELETE USING(true)).
-- ==============================================================================
DROP POLICY IF EXISTS "View Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Create Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Update Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Delete Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications Permissive Access" ON public.notifications;

CREATE POLICY "View Own Notifications" ON public.notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Create Notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Update Own Notifications" ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Delete Own Notifications" ON public.notifications
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ==============================================================================
-- 2. PROFILES — prevent self role/branch escalation; Admin may manage SEs only
-- Rules:
--   * Super Admin: unrestricted.
--   * Self-edit: only non-privileged fields (role/branch_id/is_active must not change).
--   * Admin: may edit OTHER users, but cannot touch Super Admins and cannot set
--     role = 'Super Admin' (no escalation). Frontend additionally restricts Admin
--     to Sales Executives only.
--   * DELETE: Super Admin only.
-- ==============================================================================
DROP POLICY IF EXISTS "Profiles_No_Self_Role_Escalation" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Update_Own_NonPrivileged" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Update_Scoped" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Delete_SuperAdmin" ON public.profiles;

CREATE POLICY "Profiles_Update_Scoped" ON public.profiles
FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR id = auth.uid()
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND id <> auth.uid()
        AND NOT EXISTS (
            SELECT 1 FROM profiles AS p
            WHERE p.id = profiles.id AND p.role = 'Super Admin'
        )
    )
)
WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR (
        id = auth.uid()
        AND role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid())
        AND branch_id IS NOT DISTINCT FROM (SELECT branch_id FROM profiles WHERE id = auth.uid())
        AND is_active IS NOT DISTINCT FROM (SELECT is_active FROM profiles WHERE id = auth.uid())
    )
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND id <> auth.uid()
        AND role <> 'Super Admin'
    )
);

CREATE POLICY "Profiles_Delete_SuperAdmin" ON public.profiles
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));

-- ==============================================================================
-- 3. LEADS — role-scoped visibility mirroring roleScopedLeads in App.tsx
-- Super Admin: all. Admin: own branch (or branch-less). Others: assigned OR created.
-- ==============================================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leads_Select_Role_Scoped" ON public.leads;
DROP POLICY IF EXISTS "Leads_Insert_Own" ON public.leads;
DROP POLICY IF EXISTS "Leads_Update_Role_Scoped" ON public.leads;

CREATE POLICY "Leads_Select_Role_Scoped" ON public.leads
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND (leads.branch_id IS NULL OR leads.branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid()))
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
);

CREATE POLICY "Leads_Insert_Own" ON public.leads
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Leads_Update_Role_Scoped" ON public.leads
FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND (leads.branch_id IS NULL OR leads.branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid()))
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
)
WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND (leads.branch_id IS NULL OR leads.branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid()))
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
);

-- ==============================================================================
-- 4. CUSTOMERS — assigned / created / converted from owned lead
-- ==============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers_SuperAdmin_All" ON public.customers;
DROP POLICY IF EXISTS "Customers_Admin_All" ON public.customers;
DROP POLICY IF EXISTS "Customers_Owner_Select" ON public.customers;
DROP POLICY IF EXISTS "Customers_Owner_Insert" ON public.customers;
DROP POLICY IF EXISTS "Customers_Owner_Update" ON public.customers;
DROP POLICY IF EXISTS "Customers_Owner_Delete" ON public.customers;
DROP POLICY IF EXISTS "Customers_Role_Based_Select" ON public.customers;
DROP POLICY IF EXISTS "Customers_Role_Based_Insert" ON public.customers;
DROP POLICY IF EXISTS "Customers_Role_Based_Update" ON public.customers;
DROP POLICY IF EXISTS "Customers_Role_Based_Delete" ON public.customers;
DROP POLICY IF EXISTS "Customers_SalesExec_Select" ON public.customers;
DROP POLICY IF EXISTS "Customers_SalesExec_Insert" ON public.customers;
DROP POLICY IF EXISTS "Customers_SalesExec_Update" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.customers;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.customers;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.customers;

CREATE POLICY "Customers_SuperAdmin_All" ON public.customers
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin'));

CREATE POLICY "Customers_Admin_All" ON public.customers
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
    AND (customers.branch_id IS NULL OR customers.branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid()))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
    AND (customers.branch_id IS NULL OR customers.branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid()))
);

CREATE POLICY "Customers_Owner_Select" ON public.customers
FOR SELECT TO authenticated
USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR lead_id IN (SELECT id FROM leads WHERE assigned_to = auth.uid() OR created_by = auth.uid())
);

CREATE POLICY "Customers_Owner_Insert" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR lead_id IN (SELECT id FROM leads WHERE assigned_to = auth.uid() OR created_by = auth.uid())
);

CREATE POLICY "Customers_Owner_Update" ON public.customers
FOR UPDATE TO authenticated
USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR lead_id IN (SELECT id FROM leads WHERE assigned_to = auth.uid() OR created_by = auth.uid())
)
WITH CHECK (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR lead_id IN (SELECT id FROM leads WHERE assigned_to = auth.uid() OR created_by = auth.uid())
);

CREATE POLICY "Customers_Owner_Delete" ON public.customers
FOR DELETE TO authenticated
USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR lead_id IN (SELECT id FROM leads WHERE assigned_to = auth.uid() OR created_by = auth.uid())
);

-- ==============================================================================
-- 5. TASKS — own tasks + Admin/Super Admin; admins branch-scoped via owning lead
-- ==============================================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasks_Select_Scoped" ON public.tasks;
DROP POLICY IF EXISTS "Tasks_Insert_Scoped" ON public.tasks;
DROP POLICY IF EXISTS "Tasks_Update_Scoped" ON public.tasks;

CREATE POLICY "Tasks_Select_Scoped" ON public.tasks
FOR SELECT TO authenticated
USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND (tasks.lead_id IS NULL OR tasks.lead_id IN (
            SELECT id FROM leads
            WHERE branch_id IS NULL OR branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
        ))
    )
);

CREATE POLICY "Tasks_Insert_Scoped" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "Tasks_Update_Scoped" ON public.tasks
FOR UPDATE TO authenticated
USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND (tasks.lead_id IS NULL OR tasks.lead_id IN (
            SELECT id FROM leads
            WHERE branch_id IS NULL OR branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
        ))
    )
)
WITH CHECK (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND (tasks.lead_id IS NULL OR tasks.lead_id IN (
            SELECT id FROM leads
            WHERE branch_id IS NULL OR branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
        ))
    )
);

-- ==============================================================================
-- 6. TEAM MESSAGES — read all (channel-based), send/delete own only
-- ==============================================================================
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TeamMessages_Select_All" ON public.team_messages;
DROP POLICY IF EXISTS "TeamMessages_Insert_Own" ON public.team_messages;
DROP POLICY IF EXISTS "TeamMessages_Update_Own" ON public.team_messages;
DROP POLICY IF EXISTS "TeamMessages_Delete_Own" ON public.team_messages;

CREATE POLICY "TeamMessages_Select_All" ON public.team_messages
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "TeamMessages_Insert_Own" ON public.team_messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "TeamMessages_Update_Own" ON public.team_messages
FOR UPDATE TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "TeamMessages_Delete_Own" ON public.team_messages
FOR DELETE TO authenticated
USING (sender_id = auth.uid());

-- ==============================================================================
-- 7. WEB LEADS — public form INSERT; authenticated read (app fetches for all roles);
--    mutation restricted to Admin/Super Admin
-- ==============================================================================
ALTER TABLE public.web_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "WebLeads_Select_Authenticated" ON public.web_leads;
DROP POLICY IF EXISTS "WebLeads_Insert_Public" ON public.web_leads;
DROP POLICY IF EXISTS "WebLeads_Update_Admin" ON public.web_leads;
DROP POLICY IF EXISTS "WebLeads_Delete_Admin" ON public.web_leads;

CREATE POLICY "WebLeads_Select_Authenticated" ON public.web_leads
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "WebLeads_Insert_Public" ON public.web_leads
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "WebLeads_Update_Admin" ON public.web_leads
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

CREATE POLICY "WebLeads_Delete_Admin" ON public.web_leads
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

-- ==============================================================================
-- 8. EXPENSES — own records; Admin/Super Admin see own branch / all
-- ==============================================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Expenses_Select_Scoped" ON public.expenses;
DROP POLICY IF EXISTS "Expenses_Insert_Own" ON public.expenses;

CREATE POLICY "Expenses_Select_Scoped" ON public.expenses
FOR SELECT TO authenticated
USING (
    submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND (expenses.branch_id IS NULL OR expenses.branch_id = (SELECT branch_id::text FROM profiles WHERE id = auth.uid()))
    )
);

CREATE POLICY "Expenses_Insert_Own" ON public.expenses
FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid());

-- ==============================================================================
-- 9. ATTENDANCE — own records; Admin/Super Admin view own branch / all
-- ==============================================================================
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Attendance_Select_Scoped" ON public.attendance;
DROP POLICY IF EXISTS "Attendance_Insert_Own" ON public.attendance;
DROP POLICY IF EXISTS "Attendance_Update_Own" ON public.attendance;
DROP POLICY IF EXISTS "Attendance_Delete_Scoped" ON public.attendance;

CREATE POLICY "Attendance_Select_Scoped" ON public.attendance
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND (attendance.branch_id IS NULL OR attendance.branch_id = (SELECT branch_id::text FROM profiles WHERE id = auth.uid()))
    )
);

CREATE POLICY "Attendance_Insert_Own" ON public.attendance
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Attendance_Update_Own" ON public.attendance
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Attendance_Delete_Scoped" ON public.attendance
FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Super Admin')
    OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
        AND (attendance.branch_id IS NULL OR attendance.branch_id = (SELECT branch_id::text FROM profiles WHERE id = auth.uid()))
    )
);

-- ==============================================================================
-- 10. LEAVE REQUESTS — own requests; Admin/Super Admin approve/review
-- ==============================================================================
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "LeaveRequests_Select_Own" ON public.leave_requests;
DROP POLICY IF EXISTS "LeaveRequests_Insert_Own" ON public.leave_requests;
DROP POLICY IF EXISTS "LeaveRequests_Update_Admin" ON public.leave_requests;

CREATE POLICY "LeaveRequests_Select_Own" ON public.leave_requests
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "LeaveRequests_Insert_Own" ON public.leave_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "LeaveRequests_Update_Admin" ON public.leave_requests
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

COMMIT;

-- ==============================================================================
-- VERIFICATION QUERY (run after migration):
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE tablename IN ('notifications','profiles','leads','customers','tasks',
--                     'team_messages','web_leads','expenses','attendance','leave_requests')
-- ORDER BY tablename, policyname;
-- ==============================================================================
NOTIFY pgrst, 'reload schema';