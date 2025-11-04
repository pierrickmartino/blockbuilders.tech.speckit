-- Supabase SQL assertions for auth access policies.
-- Run with `supabase db remote commit` or via the Supabase SQL editor after deploying policies.

-- Ensure row level security is active for the user_profiles table.
select
  tablename,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'app_public'
  and c.relname = 'user_profiles';

-- Validate SELECT policy restricts records to auth.uid().
select
  policyname,
  permissive,
  roles,
  cmd,
  qual
from pg_catalog.pg_policies
where schemaname = 'app_public'
  and tablename = 'user_profiles'
  and policyname = 'auth_user_profiles_select_self';

-- Validate UPDATE policy enforces auth.uid() on both qualifier and check constraints.
select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'app_public'
  and tablename = 'user_profiles'
  and policyname = 'auth_user_profiles_update_self';

-- Verify no policy grants access to anonymous role.
select
  policyname
from pg_catalog.pg_policies
where schemaname = 'app_public'
  and tablename = 'user_profiles'
  and 'anon' = any(roles);
