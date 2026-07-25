-- PR-2 de la transformación multi-ciudad: tabla `cities` + backfill de
-- Coronel como primera fila. Punto de partida para que una ciudad futura se
-- dé de alta con datos, no con código — hoy nada la usa todavía para filtrar
-- otras tablas (eso es PR-3 en adelante). Requiere revisión y ejecución
-- manual controlada, igual que las migraciones de seguridad anteriores de
-- este repo: no se ejecutó contra ninguna base de datos por escribir este
-- archivo.
--
-- DOMINIOS: confirmados por el propietario del proyecto (no inferidos del
-- repositorio). koronel.cl es el dominio final; www.koronel.cl su alias con
-- "www"; beta.koronel.cl es el entorno transitorio de staging conocido.
-- CityContext normaliza (trim, minúsculas, sin punto final) tanto el
-- hostname recibido como cada valor de este arreglo antes de compararlos —
-- ver src/contexts/CityContext.jsx.

-- ============================================================
-- 1. TABLA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,

    -- Identidad — mismo split que src/config/siteConfig.js (brandName vs.
    -- cityName vs. countryName): la marca no es necesariamente igual al
    -- nombre de la ciudad.
    brand_name TEXT NOT NULL,
    city_name TEXT NOT NULL,
    country_name TEXT NOT NULL,

    -- Hostnames que resuelven a esta ciudad (window.location.hostname,
    -- normalizado). Vacío es un estado válido para una ciudad nueva sin
    -- dominio asignado todavía; el CityContext debe tratarlo como "sin
    -- match" y caer a un default seguro, nunca a un error.
    domains TEXT[] NOT NULL DEFAULT '{}'::text[],

    logo_path TEXT,
    logo_alt TEXT,

    seo_description TEXT,

    default_lat DOUBLE PRECISION,
    default_lng DOUBLE PRECISION,
    interactive_map_lat DOUBLE PRECISION,
    interactive_map_lng DOUBLE PRECISION,
    geocoding_suffix TEXT,

    currency_code TEXT,
    timezone TEXT,
    locale TEXT,

    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.cities IS
  'Configuración por ciudad (PR-2). No consumida todavía para aislar datos de otras tablas — ver PR-3.';
COMMENT ON COLUMN public.cities.domains IS
  'Hostnames que resuelven a esta ciudad. Vacío es un estado válido: significa que ningún dominio la sirve todavía.';

-- ============================================================
-- 2. TRIGGER updated_at (reutiliza la función compartida existente)
-- ============================================================
DROP TRIGGER IF EXISTS set_cities_updated_at ON public.cities;
CREATE TRIGGER set_cities_updated_at
    BEFORE UPDATE ON public.cities
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Lectura pública: las columnas de esta tabla son únicamente configuración
-- de marca/mapa/SEO por ciudad (ver lista de columnas arriba) — ninguna
-- credencial, dato de pago, referencia a admins ni información privada.
-- USING(true) es seguro porque no hay nada sensible que restringir columna
-- por columna, y el CityContext necesita poder resolverla sin sesión
-- (usuario anónimo visitando el sitio).
DROP POLICY IF EXISTS "public_read_cities" ON public.cities;
CREATE POLICY "public_read_cities"
ON public.cities
FOR SELECT
TO public
USING (true);

-- Sin política de escritura todavía: sin INSERT/UPDATE/DELETE para
-- `anon`/`authenticated`, solo se puede escribir con la service role
-- (dashboard de Supabase) hasta que exista un rol de platform_admin real
-- (PR-4) y un panel para administrarlo (PR-5).

-- ============================================================
-- 4. BACKFILL — Coronel como primera fila
-- ============================================================
-- Valores tomados de src/config/siteConfig.js (mismo commit que introdujo
-- ese archivo); domains confirmados por el propietario del proyecto (ver
-- comentario de dominios arriba), no inferidos.
INSERT INTO public.cities (
    slug, brand_name, city_name, country_name, domains,
    logo_path, logo_alt, seo_description,
    default_lat, default_lng, interactive_map_lat, interactive_map_lng, geocoding_suffix,
    currency_code, timezone, locale, status
) VALUES (
    'coronel',
    'CoronelLocal',
    'Coronel',
    'Chile',
    ARRAY[
      'koronel.cl',
      'www.koronel.cl',
      'beta.koronel.cl'
    ],
    '/koronel-logo.png',
    'Koronel.cl',
    'Directorio de negocios, clasificados, eventos, empleos y comunidad en Coronel y la región.',
    -37.0167, -73.15,
    -37.0298, -73.1429,
    'Coronel, Chile',
    'CLP',
    'America/Santiago',
    'es-CL',
    'active'
)
ON CONFLICT (slug) DO NOTHING;
