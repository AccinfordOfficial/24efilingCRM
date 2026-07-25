-- ==============================================================================
-- SQL MIGRATION: ADD AADHAAR CARD COLUMN TO LEADS TABLE
-- Run this in your Supabase SQL Editor to add the 'aadhar_number' column to 'leads'
-- ==============================================================================

-- 1. Add aadhar_number column to the leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS aadhar_number TEXT;

-- 2. Reload PostgREST schema cache to ensure API picks up the new column immediately
NOTIFY pgrst, 'reload schema';
