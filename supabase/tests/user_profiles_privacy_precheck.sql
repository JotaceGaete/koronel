-- Comprobación previa al paso 2 (20261125000100). SOLO LECTURA: consulta el catálogo, no
-- lee datos de usuarios. Correr en el SQL Editor de producción y revisar cada bloque:
-- cualquier fila en los bloques 2, 3 o 4 debe revisarse antes de aplicar el paso 2.

-- 1. Políticas actuales de user_profiles (esperado: public_read_user_profiles, users_*_own_*,
--    y quizá admin_read_user_profiles).
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- 2. Vistas que leen user_profiles. Una vista sin security_invoker se ejecuta como su dueño
--    y SEGUIRÍA exponiendo email/phone aunque se apliquen los permisos por columna.
SELECT c.relname AS vista, pg_get_userbyid(c.relowner) AS dueno, c.reloptions,
       has_table_privilege('anon', c.oid, 'select') AS anon_select
FROM pg_class c
WHERE c.relkind IN ('v', 'm') AND c.relnamespace = 'public'::regnamespace
  AND pg_get_viewdef(c.oid) ILIKE '%user_profiles%';

-- 3. Funciones SECURITY INVOKER que tocan user_profiles: si leen email/phone/role/location
--    fallarán con "permission denied" cuando las llame anon o authenticated (p. ej. Walinka).
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('anon', p.oid, 'execute') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'execute') AS auth_exec
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace AND NOT p.prosecdef
  AND p.prosrc ILIKE '%user_profiles%';

-- 4. Políticas de OTRAS tablas que consultan user_profiles (se evalúan con los permisos
--    del usuario: si leen role/email se romperán).
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage') AND tablename <> 'user_profiles'
  AND (qual ILIKE '%user_profiles%' OR with_check ILIKE '%user_profiles%');

-- 5. Permisos por columna ya existentes para anon/authenticated (normalmente vacío).
SELECT grantee, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'user_profiles'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type = 'SELECT'
  AND NOT has_table_privilege(grantee, 'public.user_profiles', 'select');

-- 6. Columnas actuales (si hay columnas nuevas, decidir si son públicas o privadas).
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles' ORDER BY ordinal_position;
