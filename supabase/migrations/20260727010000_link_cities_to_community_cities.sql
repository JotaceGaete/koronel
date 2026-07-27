-- Fase 2 del plan de reconciliación cities/community_cities: relación
-- entre la tabla de configuración de sitio (public.cities) y la entidad
-- operativa de ciudad (public.community_cities, ver baseline
-- 20260727000000_baseline_community_cities_legacy.sql).
--
-- Alcance EXCLUSIVO:
--   - columna nueva, nullable, en cities
--   - FK hacia community_cities(id), ON DELETE NO ACTION
--   - índice sobre la columna de relación
--   - backfill genérico por coincidencia de slug, sin conocimiento de
--     ninguna ciudad en particular
--
-- NO incluye: cambios en CityContext, filtros por ciudad en servicios,
-- limpieza de campos duplicados, ni ninguna suposición sobre qué filas
-- existen hoy en ninguna de las dos tablas.

-- ============================================================
-- 1. Columna de relación
-- ============================================================
ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS community_city_id UUID;

-- FK guardada — Postgres no soporta ADD CONSTRAINT IF NOT EXISTS.
-- ON DELETE NO ACTION explícito: una fila operativa de community_cities
-- no puede eliminarse mientras esté vinculada a una configuración de
-- sitio en cities.
DO $$ BEGIN
  ALTER TABLE public.cities
    ADD CONSTRAINT cities_community_city_id_fkey
    FOREIGN KEY (community_city_id)
    REFERENCES public.community_cities(id)
    ON DELETE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_cities_community_city_id
  ON public.cities (community_city_id);

-- ============================================================
-- 2. Backfill genérico por coincidencia de slug
-- ============================================================
-- Sin UUIDs ni slugs hardcodeados: vincula cualquier fila de cities con
-- su contraparte en community_cities que comparta el mismo slug. Solo
-- toca filas todavía no vinculadas (community_city_id IS NULL), así que
-- es seguro volver a correr esta migración sin efecto sobre lo ya
-- vinculado. Si no encuentra ninguna coincidencia (entorno nuevo, datos
-- todavía no cargados), no falla: simplemente no actualiza filas.
UPDATE public.cities c
SET community_city_id = cc.id
FROM public.community_cities cc
WHERE c.slug = cc.slug
  AND c.community_city_id IS NULL;
