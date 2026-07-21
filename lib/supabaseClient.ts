import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';
import { Database } from '../types/database.types';

export type { Database, Json } from '../types/database.types';

const supabaseUrl = ENV.SUPABASE_URL;
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials not found in env.ts. Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are correctly set.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// IMPORTANT: The initial Super Admin sign-up is now handled by a server-side function,
// so running this script is NO LONGER REQUIRED to get started.
// This script is for setting up the correct, non-recursive security policies for Admins
// and Sales Executives to ensure they can only access the data they are permitted to see.
export const SETUP_SQL_SCRIPT = `
BEGIN;

-- 1. CLEANUP (Drop Policies and Triggers first to ensure clean slate)
DO $$ 
DECLARE pol record; 
BEGIN 
    -- Drop all policies on public tables
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename); 
    END LOOP;
END $$;

-- Drop Triggers to prevent side-effects during setup
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_lead_created_meta ON public.leads;
DROP TRIGGER IF EXISTS on_customer_created_meta ON public.customers;

-- Add structured address columns to public.leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS personal_flat_no TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS personal_street TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS personal_city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS personal_state TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS personal_country TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS personal_zip_code TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_flat_no TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_street TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_state TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_country TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_zip_code TEXT;

-- Add structured address columns to public.customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS personal_flat_no TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS personal_street TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS personal_city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS personal_state TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS personal_country TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS personal_zip_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_flat_no TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_street TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_state TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_country TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_zip_code TEXT;

-- 2. HELPER FUNCTIONS
-- Standardize get_my_claim to avoid recursion
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> claim,
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> claim,
    current_setting('request.jwt.claims', true)::jsonb ->> claim
  );
$$ LANGUAGE sql STABLE;

-- Sync Profile -> Auth Metadata
CREATE OR REPLACE FUNCTION on_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || 
    jsonb_build_object(
        'user_role', NEW.role, 
        'user_branch', COALESCE(NEW.branch_name, ''),
        'user_branch_id', COALESCE(NEW.branch_id, NEW.branch_name)
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-populating lead fields
CREATE OR REPLACE FUNCTION public.handle_lead_creation_metadata()
RETURNS TRIGGER AS $$
DECLARE
  creator_role public.user_role;
  creator_branch text;
  creator_branch_id text;
  creator_id uuid;
BEGIN
  SELECT role, branch_name, branch_id, id INTO creator_role, creator_branch, creator_branch_id, creator_id 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF creator_role = 'Admin' THEN
     NEW.branch_id := COALESCE(NEW.branch_id, creator_branch_id, creator_branch);
     NEW.admin_id := creator_id;
  ELSIF creator_role = 'Sales Executive' THEN
     NEW.branch_id := COALESCE(NEW.branch_id, creator_branch_id, creator_branch);
     IF NEW.admin_id IS NULL THEN
        SELECT id INTO NEW.admin_id 
        FROM public.profiles 
        WHERE (branch_id = NEW.branch_id OR branch_name = NEW.branch_id) 
        AND role = 'Admin' 
        LIMIT 1;
     END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle New User (Signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, is_active, branch_name, branch_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'Sales Executive'::public.user_role),
    true,
    NEW.raw_user_meta_data->>'branch_name',
    NEW.raw_user_meta_data->>'branch_id'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2b. FIX FOREIGN KEYS (Ensure CASCADE DELETE)
DELETE FROM public.customers WHERE lead_id NOT IN (SELECT id FROM public.leads);

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_lead_id_fkey;
ALTER TABLE public.customers
    ADD CONSTRAINT customers_lead_id_fkey
    FOREIGN KEY (lead_id)
    REFERENCES public.leads(id)
    ON DELETE CASCADE;

-- 3. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RE-CREATE POLICIES (Explicit & Non-Recursive)

-- Profiles
CREATE POLICY "Super Admin View All Profiles" ON public.profiles FOR SELECT USING (
  (COALESCE(get_my_claim('user_role'), '')::text = 'Super Admin'::text)
);
CREATE POLICY "View Own Profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin View Branch Profiles" ON public.profiles FOR SELECT USING (
  (COALESCE(get_my_claim('user_role'), '')::text = 'Admin'::text) AND
  (branch_id = get_my_claim('user_branch_id') OR branch_name = get_my_claim('user_branch'))
);
CREATE POLICY "Manage Own Profile" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Leads
CREATE POLICY "Super Admin Full Access Leads" ON public.leads FOR ALL USING (
  (COALESCE(get_my_claim('user_role'), '')::text = 'Super Admin'::text)
);
CREATE POLICY "Admin Branch Access Leads" ON public.leads FOR ALL USING (
  (COALESCE(get_my_claim('user_role'), '')::text = 'Admin'::text) AND
  (branch_id = get_my_claim('user_branch_id') OR branch_id = get_my_claim('user_branch'))
);
CREATE POLICY "Sales Exec Assigned Leads" ON public.leads FOR ALL USING (
  assigned_to = auth.uid()
);

-- Customers
CREATE POLICY "Super Admin Full Access Customers" ON public.customers FOR ALL USING (
  (COALESCE(get_my_claim('user_role'), '')::text = 'Super Admin'::text)
);
CREATE POLICY "Admin Branch Access Customers" ON public.customers FOR ALL USING (
  (COALESCE(get_my_claim('user_role'), '')::text = 'Admin'::text) AND
  (branch_id = get_my_claim('user_branch_id') OR branch_id = get_my_claim('user_branch'))
);
CREATE POLICY "Sales Exec Assigned Customers" ON public.customers FOR ALL USING (
  assigned_to = auth.uid()
);

-- Notifications
CREATE POLICY "User Own Notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Documents (Simplified)
CREATE POLICY "Authenticated Access Documents" ON public.documents FOR ALL USING (auth.role() = 'authenticated');

-- Offers
CREATE POLICY "Offers Permissive Access" ON public.offers FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 5. RE-APPLY TRIGGERS
CREATE TRIGGER on_profile_updated
AFTER INSERT OR UPDATE OF role, branch_name, branch_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION on_profile_change();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_lead_created_meta
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.handle_lead_creation_metadata();

CREATE TRIGGER on_customer_created_meta
BEFORE INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.handle_lead_creation_metadata();

UPDATE public.profiles SET branch_id = branch_name WHERE branch_id IS NULL AND branch_name IS NOT NULL;

COMMIT;
`;
