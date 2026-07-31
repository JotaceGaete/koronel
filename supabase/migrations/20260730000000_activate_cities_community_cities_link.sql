-- Activa el vínculo operativo entre public.cities y
-- public.community_cities.
--
-- En la auditoría F1-A0 se confirmó que producción todavía no contiene
-- cities.community_city_id ni su FK asociada.
--
-- Esta migración reemplaza, en el árbol ejecutable actual del repositorio,
-- a 20260727010000_link_cities_to_community_cities.sql. El archivo anterior
-- no se conserva como migración ejecutable para evitar dos migraciones que
-- representen la misma operación.
--
-- Cambio estrictamente aditivo:
--   1. columna nullable;
--   2. FK;
--   3. índice;
--   4. backfill por coincidencia exacta de slug.

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
