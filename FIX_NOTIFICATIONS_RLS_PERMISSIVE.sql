-- ==============================================================================
-- SQL MIGRATION: FIX NOTIFICATIONS ROW-LEVEL SECURITY & SCHEMA
-- Run this in your Supabase SQL Editor to allow instant notification delivery across all users
-- ==============================================================================

BEGIN;

-- 1. Ensure notifications table exists with proper schema
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Drop all old restrictive policies
DROP POLICY IF EXISTS "User Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "View Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Create Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Update Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Delete Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications Permissive Access" ON public.notifications;

-- 4. Create permissive policies for authenticated users
-- SELECT: Authenticated users can view their notifications
CREATE POLICY "View Own Notifications" ON public.notifications 
FOR SELECT TO authenticated
USING (true);

-- INSERT: Any authenticated user can create notifications for any user (e.g. Lead assignment)
CREATE POLICY "Create Notifications" ON public.notifications 
FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE: Authenticated users can mark notifications as read
CREATE POLICY "Update Own Notifications" ON public.notifications 
FOR UPDATE TO authenticated
USING (true);

-- DELETE: Authenticated users can delete notifications
CREATE POLICY "Delete Own Notifications" ON public.notifications 
FOR DELETE TO authenticated
USING (true);

COMMIT;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
