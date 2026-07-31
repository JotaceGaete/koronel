-- city_zones: sectores/zonas administrables por ciudad, para reemplazar los
-- arreglos hardcodeados de sectores que hoy existen en varios formularios
-- (ProfesionalForm, AdForm, post-community-question-form). Bloque C1 del
-- plan de Administrador de Ciudades — solo tabla y RLS; sin permisos por
-- ciudad (community_city_roles) todavía, sin datos iniciales, sin tocar
-- frontend ni servicios.

-- ============================================================
-- 1. Tabla
-- ============================================================
CREATE TABLE IF NOT EXISTS public.city_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES public.community_cities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (city_id, slug)
);

COMMENT ON TABLE public.city_zones IS
  'Sectores/zonas administrables por ciudad (Administrador de Ciudades, bloque C1). Reemplaza en C9 a los arreglos hardcodeados de sectores en formularios.';

-- ============================================================
-- 2. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_city_zones_city_id
  ON public.city_zones (city_id);

CREATE INDEX IF NOT EXISTS idx_city_zones_city_id_status_sort_order
  ON public.city_zones (city_id, status, sort_order);

-- ============================================================
-- 3. Trigger updated_at (reutiliza la función compartida existente)
-- ============================================================
DROP TRIGGER IF EXISTS set_city_zones_updated_at ON public.city_zones;
CREATE TRIGGER set_city_zones_updated_at
    BEFORE UPDATE ON public.city_zones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE public.city_zones ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo zonas activas.
DROP POLICY IF EXISTS "public_read_active_city_zones" ON public.city_zones;
CREATE POLICY "public_read_active_city_zones"
ON public.city_zones
FOR SELECT
TO public
USING (status = 'active');

-- Administración: el mismo flag global is_admin() que ya protege el resto
-- del panel. Permisos por ciudad vía community_city_roles quedan fuera de
-- este bloque.
DROP POLICY IF EXISTS "admin_full_access_city_zones" ON public.city_zones;
CREATE POLICY "admin_full_access_city_zones"
ON public.city_zones
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 5. Privilegios explícitos
-- ============================================================
-- No depender únicamente de ALTER DEFAULT PRIVILEGES (puede variar según
-- el rol propietario que ejecute la migración, o al reconstruir otro
-- entorno). Las policies de arriba siguen siendo la barrera efectiva: anon
-- y authenticated solo leen zonas activas; solo quien pasa is_admin()
-- puede escribir; un usuario autenticado común queda rechazado por RLS
-- pese a tener el privilegio base de escritura.
GRANT SELECT ON public.city_zones TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.city_zones TO authenticated;
