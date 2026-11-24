-- Paso 2 de 2: anon y authenticated dejan de poder leer email, phone, location, role y
-- email_notifications de user_profiles. Siguen leyendo id, full_name, avatar_url,
-- created_at y updated_at de todas las filas (reseñas, comunidad, mensajes, avisos).
-- Además, authenticated solo puede escribir full_name, phone, location, avatar_url y
-- email_notifications (no role ni email).
-- Aplicar DESPUÉS de desplegar el frontend que usa get_my_profile / admin_get_user_contacts
-- y DESPUÉS de correr supabase/tests/user_profiles_privacy_precheck.sql en producción.
-- Rollback: supabase/rollback/20261125000100_user_profiles_column_privacy_down.sql

BEGIN;

-- La fila sigue siendo visible para todos (necesario para los embeds públicos);
-- lo que cambia es qué columnas se pueden leer (permisos por columna, más abajo).
DROP POLICY IF EXISTS public_read_user_profiles ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_public_read ON public.user_profiles;
CREATE POLICY user_profiles_public_read ON public.user_profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- Lectura solo por columnas. Las columnas nuevas que se agreguen en el futuro
-- quedan privadas salvo que se otorguen explícitamente aquí.
REVOKE SELECT ON public.user_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, created_at, updated_at)
  ON public.user_profiles TO anon, authenticated;

-- Escritura también por columna: el usuario solo edita los datos que la app le deja editar.
-- role y email quedan fuera, así nadie puede hacerse admin ni suplantar el email de otro
-- (ni con UPDATE, ni borrando su perfil y volviéndolo a crear). Independiente del trigger
-- user_profiles_guard_role del PR de businesses; ambos pueden coexistir.
REVOKE INSERT, UPDATE ON public.user_profiles FROM PUBLIC, authenticated;
GRANT UPDATE (full_name, phone, location, avatar_url, email_notifications)
  ON public.user_profiles TO authenticated;
GRANT INSERT (id, full_name, phone, location, avatar_url, email_notifications)
  ON public.user_profiles TO authenticated;

-- anon no tiene políticas de escritura; se le quita también el permiso de tabla.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON public.user_profiles FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.user_profiles FROM authenticated;

COMMIT;
