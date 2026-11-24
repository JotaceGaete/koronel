-- =============================================================================
-- Koronel: endurecimiento de seguridad de public.businesses y roles de admin
-- =============================================================================
-- PROPUESTA. No aplicar sin la autorización de Juan.
-- El proyecto Supabase `coronel-portal` es compartido con Walinka: esta migración
-- solo toca public.businesses, public.user_profiles y las funciones
-- is_admin()/is_admin_user(), con el mismo comportamiento que tienen hoy.
--
-- Qué hace:
--   1. is_admin()/is_admin_user(): mismas reglas que producción (solo
--      app_metadata.role), con search_path vacío. Alinea el repo con prod.
--   2. Trigger que impide a los comerciantes escribir campos reservados a la
--      administración en businesses (status, verified, featured, premium_until,
--      claimed, owner_id, rating/contadores, rejection_reason, admin_notes,
--      account_id, walinka_*). En altas, fuerza los valores por defecto.
--   3. Trigger que impide a los usuarios cambiar su propio user_profiles.role.
--   4. Políticas de businesses: elimina duplicadas y la lectura pública
--      USING (true); los visitantes solo ven negocios published/premium.
--   5. Quita a anon/authenticated privilegios que nunca deben tener sobre
--      businesses (TRUNCATE, TRIGGER, REFERENCES; y escritura para anon).
--
-- Quién NO queda restringido por los triggers:
--   * Administradores (public.is_admin(): app_metadata.role = 'admin').
--   * service_role / postgres (API con service key, cron, SQL editor).
--   * Funciones SECURITY DEFINER del propietario postgres (approve_business_claim,
--     update_business_rating, check_premium_expiry, handle_new_user...): dentro de
--     ellas current_user es el propietario, no 'authenticated'.
--     Por eso los triggers son SECURITY INVOKER y miran current_user.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Funciones de administrador (sin cambio de comportamiento)
-- -----------------------------------------------------------------------------
-- Las migraciones antiguas del repo definían is_admin_user() aceptando
-- user_metadata.role, que el propio usuario puede modificar con
-- supabase.auth.updateUser(). Producción ya usa solo app_metadata; esto lo
-- deja explícito y versionado.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE au.id = auth.uid()
      AND au.raw_app_meta_data ->> 'role' = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin();
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'true si auth.uid() tiene app_metadata.role = admin. Nunca usar user_metadata ni user_profiles.role.';
COMMENT ON FUNCTION public.is_admin_user() IS
  'Alias de public.is_admin(). Se mantiene por compatibilidad con políticas existentes.';

-- -----------------------------------------------------------------------------
-- 2. Campos reservados de businesses
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.businesses_guard_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Solo se restringen las peticiones directas de clientes (PostgREST con la
  -- anon key o con sesión). service_role, postgres y funciones SECURITY
  -- DEFINER (current_user = propietario) pasan sin cambios.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- La política authenticated_insert_businesses ya exige owner_id = auth.uid().
    -- Un negocio creado por su dueño entra siempre a revisión.
    NEW.status                := 'pending';
    NEW.verified              := false;
    NEW.featured              := false;
    NEW.premium_until         := NULL;
    NEW.claimed               := (NEW.owner_id IS NOT NULL);
    NEW.rating                := 0;
    NEW.review_count          := 0;
    NEW.profile_visits        := 0;
    NEW.contacts_count        := 0;
    NEW.rejection_reason      := NULL;
    NEW.admin_notes           := NULL;
    NEW.account_id            := NULL;
    NEW.walinka_enabled       := false;
    NEW.walinka_catalog_url   := NULL;
    NEW.walinka_business_slug := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE. Único cambio de estado permitido al dueño: reenviar a revisión
  -- una ficha rechazada (rejected -> pending).
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status = 'rejected' AND NEW.status = 'pending') THEN
    RAISE EXCEPTION 'BUSINESS_STATUS_ADMIN_ONLY'
      USING ERRCODE = '42501',
            HINT = 'Solo un administrador puede cambiar el estado de un negocio.';
  END IF;

  IF NEW.verified              IS DISTINCT FROM OLD.verified
  OR NEW.featured              IS DISTINCT FROM OLD.featured
  OR NEW.premium_until         IS DISTINCT FROM OLD.premium_until
  OR NEW.owner_id              IS DISTINCT FROM OLD.owner_id
  OR NEW.claimed               IS DISTINCT FROM OLD.claimed
  OR NEW.rating                IS DISTINCT FROM OLD.rating
  OR NEW.review_count          IS DISTINCT FROM OLD.review_count
  OR NEW.profile_visits        IS DISTINCT FROM OLD.profile_visits
  OR NEW.contacts_count        IS DISTINCT FROM OLD.contacts_count
  OR NEW.rejection_reason      IS DISTINCT FROM OLD.rejection_reason
  OR NEW.admin_notes           IS DISTINCT FROM OLD.admin_notes
  OR NEW.account_id            IS DISTINCT FROM OLD.account_id
  OR NEW.walinka_enabled       IS DISTINCT FROM OLD.walinka_enabled
  OR NEW.walinka_catalog_url   IS DISTINCT FROM OLD.walinka_catalog_url
  OR NEW.walinka_business_slug IS DISTINCT FROM OLD.walinka_business_slug THEN
    RAISE EXCEPTION 'BUSINESS_PRIVILEGED_COLUMN_ADMIN_ONLY'
      USING ERRCODE = '42501',
            HINT = 'Campos reservados a la administración: status, verified, featured, premium_until, owner_id, claimed, rating, review_count, profile_visits, contacts_count, rejection_reason, admin_notes, account_id, walinka_*.';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.businesses_guard_privileged_columns() IS
  'Impide que comerciantes (anon/authenticated no admin) escriban campos reservados de businesses.';

-- Es una función de trigger: nadie necesita ejecutarla directamente.
REVOKE ALL ON FUNCTION public.businesses_guard_privileged_columns() FROM PUBLIC;

DROP TRIGGER IF EXISTS businesses_guard_privileged_columns ON public.businesses;
CREATE TRIGGER businesses_guard_privileged_columns
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.businesses_guard_privileged_columns();

-- -----------------------------------------------------------------------------
-- 3. user_profiles.role no lo puede cambiar el propio usuario
-- -----------------------------------------------------------------------------
-- La política users_update_own_user_profiles permite actualizar cualquier
-- columna de la fila propia, incluida role. El frontend y /api/places usaban
-- role = 'admin' como prueba de administrador (corregido en este mismo cambio),
-- así que cerrarlo también en la base evita que vuelva a ser explotable.
CREATE OR REPLACE FUNCTION public.user_profiles_guard_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'user';
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'USER_ROLE_ADMIN_ONLY'
      USING ERRCODE = '42501',
            HINT = 'El rol de un usuario solo lo cambia un administrador.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.user_profiles_guard_role() FROM PUBLIC;

DROP TRIGGER IF EXISTS user_profiles_guard_role ON public.user_profiles;
CREATE TRIGGER user_profiles_guard_role
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.user_profiles_guard_role();

-- -----------------------------------------------------------------------------
-- 4. Políticas RLS de businesses
-- -----------------------------------------------------------------------------
-- Antes (producción, 2026-11-23): 11 políticas. public_read_businesses
-- USING (true) dejaba a cualquiera leer todos los negocios, incluidos
-- pending/rejected, y anulaba los filtros de las otras dos políticas públicas.
-- Había además duplicados de admin, insert y update.

DROP POLICY IF EXISTS public_read_businesses ON public.businesses;
DROP POLICY IF EXISTS "Public can read published businesses" ON public.businesses;
DROP POLICY IF EXISTS public_read_published_businesses ON public.businesses;
DROP POLICY IF EXISTS admin_all_businesses ON public.businesses;          -- duplicado de admin_manage_businesses
DROP POLICY IF EXISTS owner_insert_businesses ON public.businesses;       -- duplicado de authenticated_insert_businesses
DROP POLICY IF EXISTS owners_update_businesses ON public.businesses;      -- duplicado de owner_update_businesses

-- Visitantes y usuarios: solo negocios publicados.
DROP POLICY IF EXISTS businesses_public_read_published ON public.businesses;
CREATE POLICY businesses_public_read_published
  ON public.businesses
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'premium'));

-- Se recrean (idempotente) las que se conservan, para que el estado final no
-- dependa de lo que haya en cada entorno.
DROP POLICY IF EXISTS owner_read_own_businesses ON public.businesses;
CREATE POLICY owner_read_own_businesses
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS admin_manage_businesses ON public.businesses;
CREATE POLICY admin_manage_businesses
  ON public.businesses
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS authenticated_insert_businesses ON public.businesses;
CREATE POLICY authenticated_insert_businesses
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS owner_update_businesses ON public.businesses;
CREATE POLICY owner_update_businesses
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS owners_delete_businesses ON public.businesses;
CREATE POLICY owners_delete_businesses
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. Privilegios de tabla
-- -----------------------------------------------------------------------------
-- TRUNCATE no pasa por RLS. PostgREST no lo expone, pero ningún rol de cliente
-- debe tenerlo. anon no tiene políticas de escritura, así que quitarle
-- INSERT/UPDATE/DELETE no cambia nada visible y elimina una capa de riesgo.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.businesses FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.businesses FROM anon;

COMMIT;

-- =============================================================================
-- Verificación (ejecutar después, solo lectura)
-- =============================================================================
-- SELECT policyname, cmd, roles, qual, with_check
--   FROM pg_policies WHERE schemaname = 'public' AND tablename = 'businesses'
--   ORDER BY policyname;
--   -> 6 políticas: admin_manage_businesses, authenticated_insert_businesses,
--      businesses_public_read_published, owner_read_own_businesses,
--      owner_update_businesses, owners_delete_businesses.
-- SELECT tgname FROM pg_trigger
--   WHERE tgrelid IN ('public.businesses'::regclass, 'public.user_profiles'::regclass)
--     AND NOT tgisinternal;
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND table_name = 'businesses'
--     AND grantee IN ('anon', 'authenticated') ORDER BY 1, 2;
--   -> anon: SELECT; authenticated: DELETE, INSERT, SELECT, UPDATE.

-- =============================================================================
-- Rollback (vuelve exactamente al estado de producción del 2026-11-23)
-- =============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS businesses_guard_privileged_columns ON public.businesses;
-- DROP FUNCTION IF EXISTS public.businesses_guard_privileged_columns();
-- DROP TRIGGER IF EXISTS user_profiles_guard_role ON public.user_profiles;
-- DROP FUNCTION IF EXISTS public.user_profiles_guard_role();
-- DROP POLICY IF EXISTS businesses_public_read_published ON public.businesses;
-- CREATE POLICY public_read_businesses ON public.businesses FOR SELECT TO public USING (true);
-- CREATE POLICY public_read_published_businesses ON public.businesses FOR SELECT TO public
--   USING (status = ANY (ARRAY['published'::text, 'premium'::text]));
-- CREATE POLICY "Public can read published businesses" ON public.businesses FOR SELECT
--   TO anon, authenticated USING (status = 'published'::text);
-- CREATE POLICY admin_all_businesses ON public.businesses FOR ALL TO authenticated
--   USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
-- CREATE POLICY owner_insert_businesses ON public.businesses FOR INSERT TO authenticated
--   WITH CHECK (owner_id = auth.uid());
-- CREATE POLICY owners_update_businesses ON public.businesses FOR UPDATE TO authenticated
--   USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
-- GRANT INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.businesses TO anon;
-- GRANT TRUNCATE, TRIGGER, REFERENCES ON public.businesses TO authenticated;
-- -- is_admin()/is_admin_user() no necesitan rollback: mismo comportamiento.
-- COMMIT;
