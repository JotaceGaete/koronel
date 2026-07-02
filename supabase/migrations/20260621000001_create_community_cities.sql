-- Community Cities: entidad raíz del motor multi-ciudad.
-- Aditiva: no toca ninguna tabla existente.
-- Ver docs/diseno-multi-ciudad.md y docs/plan-fase-a-b.md.

CREATE TABLE IF NOT EXISTS public.community_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL DEFAULT 'city',
    name TEXT NOT NULL,
    region TEXT,
    country TEXT NOT NULL DEFAULT 'Chile',
    country_code TEXT NOT NULL DEFAULT 'CL',
    locale TEXT NOT NULL DEFAULT 'es-CL',
    currency TEXT NOT NULL DEFAULT 'CLP',
    phone_country_code TEXT NOT NULL DEFAULT '56',
    center_lat NUMERIC(10,7),
    center_lng NUMERIC(10,7),
    site_name TEXT NOT NULL,
    site_description TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    theme JSONB NOT NULL DEFAULT '{}'::jsonb,
    domain TEXT UNIQUE,
    subdomain TEXT UNIQUE,
    media_base_url TEXT,
    admin_whatsapp TEXT,
    status TEXT NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding','active','inactive')),
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_cities_slug ON public.community_cities(slug);
CREATE INDEX IF NOT EXISTS idx_community_cities_domain ON public.community_cities(domain);
CREATE INDEX IF NOT EXISTS idx_community_cities_status ON public.community_cities(status);

-- updated_at automático (reutiliza la función que ya existe en el proyecto,
-- verificada en docs/plan-fase-a-b.md: public.set_updated_at() existe desde
-- 20260304161514_coronellocal_schema.sql).
DROP TRIGGER IF EXISTS set_community_cities_updated_at ON public.community_cities;
CREATE TRIGGER set_community_cities_updated_at
    BEFORE UPDATE ON public.community_cities
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.community_cities ENABLE ROW LEVEL SECURITY;

-- Lectura pública: cualquier visitante necesita poder resolver "en qué ciudad estoy".
DROP POLICY IF EXISTS "public_read_community_cities" ON public.community_cities;
CREATE POLICY "public_read_community_cities"
ON public.community_cities FOR SELECT TO public
USING (is_public = true OR status = 'active');

-- Escritura: usa is_admin() (la función global existente) como gate interino.
-- Se reemplaza por is_platform_admin() en una fase posterior, NO en esta
-- migración (is_admin() no se toca ni se retira todavía).
-- Nota: el proyecto tiene dos funciones de admin equivalentes, is_admin() e
-- is_admin_user() (ver docs/plan-fase-a-b.md, sección de verificaciones) —
-- se eligió is_admin() por ser la que gobierna categories/businesses/
-- classified_ads/featured_listings, las tablas más relacionadas con esta.
DROP POLICY IF EXISTS "admin_manage_community_cities" ON public.community_cities;
CREATE POLICY "admin_manage_community_cities"
ON public.community_cities FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Seed: Coronel, con los mismos valores que hoy son default en src/config/city.js
INSERT INTO public.community_cities (
    slug, kind, name, region, country, country_code,
    locale, currency, phone_country_code,
    center_lat, center_lng,
    site_name, site_description,
    domain, media_base_url, admin_whatsapp,
    status, is_public
) VALUES (
    'coronel', 'city', 'Coronel', 'Región del Biobío', 'Chile', 'CL',
    'es-CL', 'CLP', '56',
    -37.0298, -73.1429,
    'CoronelLocal',
    'Directorio de negocios, clasificados, eventos, empleos y comunidad en Coronel y la región.',
    'koronel.cl', 'https://multimedia.koronel.cl', '56993443682',
    'active', true
)
ON CONFLICT (slug) DO NOTHING;
