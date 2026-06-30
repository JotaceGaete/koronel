-- Fix: make is_admin() and is_admin_user() consistent with the frontend.
--
-- The frontend isAdminUser() grants admin access when ANY of these is true:
--   1. user.user_metadata.role === 'admin'   (raw_user_meta_data in auth.users)
--   2. user.app_metadata.role === 'admin'    (raw_app_meta_data  in auth.users)
--   3. userProfile.role === 'admin'          (user_profiles table)
--
-- The SQL functions previously only checked (1) and (2), so a user whose admin
-- status lives exclusively in user_profiles could enter the dashboard visually
-- but every Supabase RLS operation returned a policy violation.
--
-- This migration adds the user_profiles check to both functions so they match
-- the frontend logic exactly.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
      AND (
        au.raw_user_meta_data->>'role' = 'admin'
        OR au.raw_app_meta_data->>'role' = 'admin'
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
      AND (
        au.raw_user_meta_data->>'role' = 'admin'
        OR au.raw_app_meta_data->>'role' = 'admin'
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
  )
$$;
