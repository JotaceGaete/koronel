-- Servicios para la comunidad — módulo nuevo, 100% aditivo y aislado.
--
-- Objetivo: un directorio pequeño y curado de instituciones públicas y
-- servicios esenciales de Coronel (municipalidad, salud, emergencias,
-- atención ciudadana). NO es un directorio de negocios: vive en tablas
-- propias, separadas de `businesses` / `classified_ads`, para que nada
-- de lo que se toque acá pueda afectar el directorio comercial, sus
-- filtros, su búsqueda o su publicación.
--
-- No se modifica, renombra ni elimina ninguna tabla, columna ni
-- política existente.

-- ============================================================
-- 1. TABLA PRINCIPAL: public_services
-- ============================================================
CREATE TABLE IF NOT EXISTS public.public_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    institution_type TEXT NOT NULL,
    category_key TEXT NOT NULL CHECK (category_key IN (
        'instituciones_publicas',
        'salud',
        'emergencias',
        'atencion_ciudadana'
    )),
    description TEXT,

    address TEXT,
    phone TEXT,
    email TEXT,
    schedule_note TEXT,
    website TEXT,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),

    -- Fecha en que se confirmó por última vez esta ficha contra una
    -- fuente oficial. Se muestra en la ficha pública.
    verified_at DATE,

    -- Publicación simple: por ahora todo lo sembrado queda 'published'.
    -- Deja la puerta abierta a moderación futura sin tocar el resto.
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),

    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Preparado para una futura administración de fichas por la propia
    -- institución (no se construye el flujo todavía, solo la columna).
    claimed BOOLEAN NOT NULL DEFAULT false,
    managed_by_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_public_services_category_key ON public.public_services(category_key);
CREATE INDEX IF NOT EXISTS idx_public_services_status ON public.public_services(status);

-- ============================================================
-- 2. TABLA DE CORRECCIONES: public_service_reports
--
-- Arquitectura mínima para "¿Encontraste información incorrecta?".
-- Cada fila es un reporte puntual; con el tiempo, la lista de
-- reportes de una ficha funciona como su historial de correcciones
-- hasta que exista un flujo de administración institucional completo.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.public_service_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.public_services(id) ON DELETE CASCADE,

    reporter_name TEXT,
    reporter_email TEXT,
    message TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_public_service_reports_service_id ON public.public_service_reports(service_id);
CREATE INDEX IF NOT EXISTS idx_public_service_reports_status ON public.public_service_reports(status);

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE public.public_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_service_reports ENABLE ROW LEVEL SECURITY;

-- public_services: cualquiera puede leer fichas publicadas.
DROP POLICY IF EXISTS "public_read_published_public_services" ON public.public_services;
CREATE POLICY "public_read_published_public_services"
ON public.public_services
FOR SELECT
TO public
USING (status = 'published');

-- public_services: solo administradores gestionan el contenido
-- (reutiliza public.is_admin(), ya existente — no se toca la función).
DROP POLICY IF EXISTS "admin_full_access_public_services" ON public.public_services;
CREATE POLICY "admin_full_access_public_services"
ON public.public_services
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- public_service_reports: cualquiera (incluso anónimo) puede enviar un
-- reporte de corrección. Sin lectura pública — solo administradores
-- ven los reportes recibidos.
DROP POLICY IF EXISTS "public_insert_public_service_reports" ON public.public_service_reports;
CREATE POLICY "public_insert_public_service_reports"
ON public.public_service_reports
FOR INSERT
TO public
WITH CHECK (char_length(btrim(message)) > 0);

DROP POLICY IF EXISTS "admin_full_access_public_service_reports" ON public.public_service_reports;
CREATE POLICY "admin_full_access_public_service_reports"
ON public.public_service_reports
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
