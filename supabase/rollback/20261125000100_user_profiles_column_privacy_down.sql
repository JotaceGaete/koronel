-- Rollback del paso 2 (reversión de EMERGENCIA, no es un estado seguro).
--
-- COSTO DE SEGURIDAD: vuelve a abrir la lectura de email, phone, location, role y
-- email_notifications de todos los usuarios para anon y authenticated (la filtración
-- original). También devuelve a authenticated la escritura de todas las columnas de su
-- propio perfil, incluido role (si el trigger user_profiles_guard_role del PR #2 está
-- aplicado, sigue impidiendo cambiar role).
--
-- MÍNIMOS PRIVILEGIOS: a diferencia del estado original de producción (GRANT ALL), aquí
-- solo se devuelve lo que la app usaba: SELECT a anon/authenticated e INSERT/UPDATE/DELETE
-- a authenticated. NO se devuelven TRUNCATE, TRIGGER, REFERENCES ni escritura a anon.
--
-- RECUPERACIÓN: corregir la causa y volver a aplicar 20261125000100 (es idempotente) lo
-- antes posible. Mientras tanto, las RPC del paso 1 siguen funcionando.
BEGIN;
DROP POLICY IF EXISTS user_profiles_public_read ON public.user_profiles;
DROP POLICY IF EXISTS public_read_user_profiles ON public.user_profiles;
CREATE POLICY public_read_user_profiles ON public.user_profiles
  FOR SELECT TO public
  USING (true);
REVOKE SELECT (id, full_name, avatar_url, created_at, updated_at) ON public.user_profiles FROM anon, authenticated;
REVOKE UPDATE (full_name, phone, location, avatar_url, email_notifications) ON public.user_profiles FROM authenticated;
REVOKE INSERT (id, full_name, phone, location, avatar_url, email_notifications) ON public.user_profiles FROM authenticated;
GRANT SELECT ON public.user_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
COMMIT;
