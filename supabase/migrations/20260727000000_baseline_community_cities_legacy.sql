-- Baseline de solo lectura del esquema legacy multi-ciudad ya existente en
-- producción, fuera del historial de migraciones hasta ahora.
--
-- Cada atributo de este archivo proviene de una consulta literal ejecutada
-- contra producción (columnas, constraints, índices, policies, grants,
-- trigger, y metadatos de función) — ninguno fue completado por inferencia.
--
-- Alcance EXCLUSIVO (Fase 1 del plan de reconciliación cities/community_cities):
--   - community_cities, community_city_roles
--   - columnas city_id ya existentes en 11 tablas de contenido
--   - FKs, índices, policies, grants, trigger y funciones ya existentes
--
-- NO incluye: relación con public.cities, cambios de nombre, limpieza de
-- campos, filtros de frontend, ni correcciones de lo detectado (grants
-- amplios a anon, doble policy de lectura redundante en community_cities,
-- SECURITY DEFINER sin search_path en las 3 funciones) — se documentan
-- tal cual existen hoy.
--
-- Este archivo todavía no fue aplicado a ninguna base de datos ni marcado
-- como aplicado en supabase_migrations.schema_migrations. Requiere
-- autorización explícita y separada para cualquiera de los dos.

-- ============================================================
-- 1. community_cities
-- ============================================================
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
    status TEXT NOT NULL DEFAULT 'onboarding'
        CHECK (status = ANY (ARRAY['onboarding'::text, 'active'::text, 'inactive'::text])),
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_cities_domain ON public.community_cities (domain);
CREATE INDEX IF NOT EXISTS idx_community_cities_slug ON public.community_cities (slug);
CREATE INDEX IF NOT EXISTS idx_community_cities_status ON public.community_cities (status);

DROP TRIGGER IF EXISTS set_community_cities_updated_at ON public.community_cities;
CREATE TRIGGER set_community_cities_updated_at
    BEFORE UPDATE ON public.community_cities
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.community_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_community_cities" ON public.community_cities;
CREATE POLICY "admin_manage_community_cities"
ON public.community_cities FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "community_cities_public_read" ON public.community_cities;
CREATE POLICY "community_cities_public_read"
ON public.community_cities FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "public_read_community_cities" ON public.community_cities;
CREATE POLICY "public_read_community_cities"
ON public.community_cities FOR SELECT TO public
USING ((is_public = true) OR (status = 'active'::text));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON public.community_cities TO anon, authenticated, postgres, service_role;

-- ============================================================
-- 2. community_city_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_city_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES public.community_cities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'moderator'::text])),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (city_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_community_city_roles_city_id ON public.community_city_roles (city_id);
CREATE INDEX IF NOT EXISTS idx_community_city_roles_user_id ON public.community_city_roles (user_id);

ALTER TABLE public.community_city_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_community_city_roles" ON public.community_city_roles;
CREATE POLICY "admin_manage_community_city_roles"
ON public.community_city_roles FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "users_read_own_city_roles" ON public.community_city_roles;
CREATE POLICY "users_read_own_city_roles"
ON public.community_city_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON public.community_city_roles TO anon, authenticated, postgres, service_role;

-- ============================================================
-- 3. Columnas city_id en las 11 tablas de contenido existentes
-- ============================================================
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS city_id UUID;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS city_id UUID;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS city_id UUID;
ALTER TABLE public.classified_ads ADD COLUMN IF NOT EXISTS city_id UUID;
ALTER TABLE public.daily_post_tracking ADD COLUMN IF NOT EXISTS city_id UUID;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city_id UUID;
ALTER TABLE public.featured_listings ADD COLUMN IF NOT EXISTS city_id UUID;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS city_id UUID;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS city_id UUID;
ALTER TABLE public.suggested_businesses ADD COLUMN IF NOT EXISTS city_id UUID;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS city_id UUID NOT NULL DEFAULT '8aa2d628-719d-4810-9ee3-8efd230ab000'::uuid;

DO $$ BEGIN
  ALTER TABLE public.banners ADD CONSTRAINT banners_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.businesses ADD CONSTRAINT businesses_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.categories ADD CONSTRAINT categories_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.classified_ads ADD CONSTRAINT classified_ads_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.daily_post_tracking ADD CONSTRAINT daily_post_tracking_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.events ADD CONSTRAINT events_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.featured_listings ADD CONSTRAINT featured_listings_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.jobs ADD CONSTRAINT jobs_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.popups ADD CONSTRAINT popups_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.suggested_businesses ADD CONSTRAINT suggested_businesses_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.community_cities(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_banners_city_id ON public.banners (city_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses (city_id);
CREATE INDEX IF NOT EXISTS idx_categories_city_id ON public.categories (city_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_city_id ON public.classified_ads (city_id);
CREATE INDEX IF NOT EXISTS idx_daily_post_tracking_city_id ON public.daily_post_tracking (city_id);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events (city_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_city_id ON public.featured_listings (city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON public.jobs (city_id);
CREATE INDEX IF NOT EXISTS idx_popups_city_id ON public.popups (city_id);
CREATE INDEX IF NOT EXISTS idx_suggested_businesses_city_id ON public.suggested_businesses (city_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_city_id ON public.community_posts (city_id);

-- ============================================================
-- 4. Funciones de autorización con alcance de ciudad
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'platform_role') = 'super_admin', false)
$$;

CREATE OR REPLACE FUNCTION public.is_city_admin(p_city_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.community_city_roles cr
    WHERE cr.city_id = p_city_id AND cr.user_id = auth.uid() AND cr.role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_city_moderator(p_city_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.is_city_admin(p_city_id) OR EXISTS (
    SELECT 1 FROM public.community_city_roles cr
    WHERE cr.city_id = p_city_id AND cr.user_id = auth.uid() AND cr.role = 'moderator'
  )
$$;
