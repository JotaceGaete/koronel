-- SECURITY HOTFIX — no aplicado a ninguna base de datos por esta migración
-- en sí; requiere revisión y ejecución manual controlada (ver paso 0).
--
-- Problema: is_admin(), is_admin_user() e is_admin_jobs() (tres funciones
-- independientes, misma lógica) confían en raw_user_meta_data->>'role',
-- que es el campo "user_metadata" del SDK de Supabase — editable por
-- cualquier usuario autenticado con una llamada estándar del cliente
-- (supabase.auth.updateUser({ data: { role: 'admin' } })), sin privilegios
-- especiales. Cualquier usuario registrado puede auto-otorgarse admin hoy.
--
-- Fix: is_admin() pasa a confiar solo en raw_app_meta_data (no editable
-- por el cliente). is_admin_user() e is_admin_jobs() dejan de tener lógica
-- propia y delegan en is_admin() — misma firma, ninguna policy existente
-- se toca.

-- ============================================================
-- 0. AUDITORÍA PREVIA — correr esto POR SEPARADO antes de aplicar el resto
--    de este archivo, y revisar el resultado a mano.
-- ============================================================
-- SELECT id, email,
--        raw_user_meta_data->>'role' AS role_en_user_metadata,
--        raw_app_meta_data->>'role'  AS role_en_app_metadata,
--        created_at
-- FROM auth.users
-- WHERE raw_user_meta_data->>'role' = 'admin'
--    OR raw_app_meta_data->>'role' = 'admin';
--
-- Confirmar que la lista sea EXACTAMENTE quiénes deberían ser admin hoy.
-- Si aparece un email inesperado, es evidencia de que el hueco ya fue
-- explotado — investigar antes de seguir, y NO agregarlo a la lista de
-- abajo.
--
-- Nota: el historial de migraciones de este proyecto apuntaba a
-- carlos@coronellocal.cl como admin, pero el admin real confirmado es
-- contacto@walinka.com — el historial de datos NO era una fuente
-- confiable para esta decisión, por eso el paso 2 usa una lista explícita
-- en vez de derivarla automáticamente.

-- ============================================================
-- 1. TABLA DE AUDITORÍA (para poder revertir el paso 3 con precisión)
-- ============================================================
CREATE TABLE IF NOT EXISTS public._security_hotfix_20260713_audit (
    user_id UUID PRIMARY KEY,
    email TEXT,
    previous_raw_user_meta_data JSONB NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public._security_hotfix_20260713_audit (user_id, email, previous_raw_user_meta_data)
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE raw_user_meta_data ? 'role'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. LISTA EXPLÍCITA DE ADMINS A MIGRAR — EDITAR ANTES DE APLICAR
-- ============================================================
DO $$
DECLARE
  v_admin_emails TEXT[] := ARRAY[
    'contacto@walinka.com'
    -- agregar acá cualquier otro admin real, confirmado contra el paso 0
  ];
  v_updated INTEGER;
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                           || jsonb_build_object('role', 'admin')
  WHERE email = ANY(v_admin_emails);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE WARNING 'Ningún email de v_admin_emails existe en auth.users. Revisar la lista antes de continuar — sin esto, nadie queda con role=admin en app_metadata.';
  END IF;
END $$;

-- ============================================================
-- 3. LIMPIAR EL CAMPO INSEGURO
-- ============================================================
-- Saca solo la clave 'role' de raw_user_meta_data (resta quirúrgica de una
-- clave; no toca full_name, avatar_url ni ningún otro dato del usuario).
-- Afecta a CUALQUIER usuario que tenga la clave, no solo a los de la lista
-- de arriba — incluye a cualquiera que ya se la haya auto-asignado.
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE raw_user_meta_data ? 'role';

-- ============================================================
-- 4. is_admin(): fuente única y segura de verdad
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND au.raw_app_meta_data->>'role' = 'admin'
  )
$$;

-- ============================================================
-- 5. is_admin_user() e is_admin_jobs(): dejan de tener lógica propia.
--    Misma firma que hoy (sin argumentos, RETURNS BOOLEAN) — ninguna
--    política que las referencia por nombre necesita cambiar.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin()
$$;

CREATE OR REPLACE FUNCTION public.is_admin_jobs()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin()
$$;
