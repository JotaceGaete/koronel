-- ============================================================================
-- AUDITORÍA DE SOLO LECTURA — quién es admin hoy, por cada campo, antes de
-- aplicar 20260713000000_secure_admin_role_check.sql y
-- 20260713000001_restrict_user_profiles_role_updates.sql.
--
-- Resultado de esta auditoría (confirmado antes de fijar v_admin_emails en
-- 20260713000000): 4 administradores legítimos en raw_app_meta_data
-- (artesellos@outlook.com, contacto@ventalink.app, contacto@walinka.com,
-- jotacegaete@gmail.com), 0 en raw_user_meta_data, los 4 conservan acceso
-- tras el hotfix, y el bloque 6 (pérdida de acceso) devolvió 0 filas.
--
-- Copiar y pegar en el SQL Editor de Supabase. Solo contiene SELECT — no
-- modifica ninguna fila, no crea tablas, no toca funciones ni policies.
--
-- Supabase suele mostrar solo el resultado del ÚLTIMO statement si corres
-- todo el archivo de una vez. Ejecuta cada bloque (1 a 6) por separado
-- ("Run selection") para ver los 6 resultados.
-- ============================================================================


-- ============================================================
-- 1. Usuarios con raw_app_meta_data.role = 'admin'
--    (el ÚNICO campo que el hotfix seguirá aceptando)
-- ============================================================
SELECT
  id,
  email,
  raw_app_meta_data->>'role' AS app_metadata_role,
  created_at
FROM auth.users
WHERE raw_app_meta_data->>'role' = 'admin'
ORDER BY email;


-- ============================================================
-- 2. Usuarios con raw_user_meta_data.role = 'admin'
--    (campo inseguro — cualquier usuario puede escribirlo con
--    supabase.auth.updateUser({ data: { role: 'admin' } }))
-- ============================================================
SELECT
  id,
  email,
  raw_user_meta_data->>'role' AS user_metadata_role,
  created_at
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'admin'
ORDER BY email;


-- ============================================================
-- 3. Usuarios con public.user_profiles.role = 'admin'
--    (columna que, hasta antes de 20260713000001, cualquier usuario
--    podía escribir sobre su propia fila)
-- ============================================================
SELECT
  up.id,
  au.email,
  up.role AS user_profiles_role,
  up.created_at
FROM public.user_profiles up
LEFT JOIN auth.users au ON au.id = up.id
WHERE up.role = 'admin'
ORDER BY au.email;


-- ============================================================
-- 4. VISTA CONSOLIDADA — un usuario por fila, los 3 campos juntos,
--    si conservaría acceso admin después del hotfix, y por qué.
--    Incluye a cualquiera que sea 'admin' en AL MENOS UNO de los 3
--    campos (unión, no intersección).
-- ============================================================
WITH candidatos AS (
  SELECT
    au.id,
    au.email,
    au.raw_app_meta_data->>'role'  AS app_metadata_role,
    au.raw_user_meta_data->>'role' AS user_metadata_role,
    up.role                        AS user_profiles_role
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON up.id = au.id
  WHERE au.raw_app_meta_data->>'role' = 'admin'
     OR au.raw_user_meta_data->>'role' = 'admin'
     OR up.role = 'admin'
)
SELECT
  id,
  email,
  app_metadata_role,
  user_metadata_role,
  user_profiles_role,
  (app_metadata_role = 'admin') AS conserva_acceso_tras_hotfix,
  CASE
    WHEN app_metadata_role = 'admin' THEN
      'app_metadata ya tiene role=admin — conserva acceso sin necesitar ningún ajuste.'
    WHEN app_metadata_role IS DISTINCT FROM 'admin'
         AND (user_metadata_role = 'admin' OR user_profiles_role = 'admin') THEN
      'Es "admin" solo en un campo inseguro (user_metadata y/o user_profiles). '
      || 'Perdería acceso al aplicar el hotfix, salvo que se agregue su email a '
      || 'v_admin_emails en 20260713000000 ANTES de ejecutarla.'
    ELSE 'No calificaba como admin en ningún campo.'
  END AS motivo
FROM candidatos
ORDER BY conserva_acceso_tras_hotfix ASC, email;


-- ============================================================
-- 5. Confirmación específica de contacto@walinka.com
--    (el primer email que la migración 20260713000000 traía
--    precargado en v_admin_emails, antes de completarse con los
--    otros 3 confirmados en esta misma auditoría)
-- ============================================================
SELECT
  au.id,
  au.email,
  au.raw_app_meta_data->>'role'  AS app_metadata_role,
  au.raw_user_meta_data->>'role' AS user_metadata_role,
  up.role                        AS user_profiles_role,
  au.created_at,
  au.last_sign_in_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
WHERE au.email = 'contacto@walinka.com';


-- ============================================================
-- 6. Administradores actuales que PERDERÍAN acceso si la migración
--    se ejecuta SIN AJUSTES (v_admin_emails con un único email:
--    contacto@walinka.com, el estado del archivo en el momento en
--    que se corrió esta auditoría). Devolvió 0 filas — por eso
--    v_admin_emails se completó con los otros 3 emails confirmados
--    en el bloque 1, y no con ningún email nuevo descubierto acá.
-- ============================================================
WITH candidatos AS (
  SELECT
    au.id,
    au.email,
    au.raw_app_meta_data->>'role'  AS app_metadata_role,
    au.raw_user_meta_data->>'role' AS user_metadata_role,
    up.role                        AS user_profiles_role
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON up.id = au.id
  WHERE au.raw_app_meta_data->>'role' = 'admin'
     OR au.raw_user_meta_data->>'role' = 'admin'
     OR up.role = 'admin'
)
SELECT
  id,
  email,
  app_metadata_role,
  user_metadata_role,
  user_profiles_role
FROM candidatos
WHERE app_metadata_role IS DISTINCT FROM 'admin'   -- perdería el chequeo is_admin()
  AND email <> 'contacto@walinka.com'                -- no estaba ya en v_admin_emails
ORDER BY email;
