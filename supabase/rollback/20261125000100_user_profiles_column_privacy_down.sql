-- Rollback del paso 2: vuelve EXACTAMENTE al estado anterior (lectura pública de todas
-- las columnas, incluida la filtración de email/phone). Usar solo si algo se rompe.
BEGIN;
DROP POLICY IF EXISTS user_profiles_public_read ON public.user_profiles;
DROP POLICY IF EXISTS public_read_user_profiles ON public.user_profiles;
CREATE POLICY public_read_user_profiles ON public.user_profiles
  FOR SELECT TO public
  USING (true);
REVOKE SELECT (id, full_name, avatar_url, created_at, updated_at) ON public.user_profiles FROM anon, authenticated;
REVOKE UPDATE (full_name, phone, location, avatar_url, email_notifications) ON public.user_profiles FROM authenticated;
REVOKE INSERT (id, full_name, phone, location, avatar_url, email_notifications) ON public.user_profiles FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON public.user_profiles TO anon, authenticated;
COMMIT;
