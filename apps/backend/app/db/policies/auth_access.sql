-- Supabase row-level security policies for authenticated user data access.
BEGIN;

ALTER TABLE IF EXISTS app_public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_public.user_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_user_profiles_select_self ON app_public.user_profiles;
CREATE POLICY auth_user_profiles_select_self
    ON app_public.user_profiles
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS auth_user_profiles_update_self ON app_public.user_profiles;
CREATE POLICY auth_user_profiles_update_self
    ON app_public.user_profiles
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

COMMIT;
