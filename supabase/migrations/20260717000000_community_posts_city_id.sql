-- Cities reference table + city_id on community_posts
--
-- CoronelLocal is a single-city product today, but community_posts rows were being created
-- with no city association whatsoever — confirmed directly against production on 2026-07-17:
-- 3 active posts have city_id = null, and only 1 carries Coronel's id. This migration adds the
-- minimal reference table and backfills existing rows, but the real fix for "why doesn't the
-- Coronel post show up" is in the application layer (see communityService.js: the public
-- listing embedded community_polls in the same select() as community_posts, so any problem
-- resolving that relation failed the whole query and hid every post, not just the untagged
-- ones — this migration alone does not fix that).
--
-- Coronel's id is pinned to the value already present on that one row, so this migration is
-- safe to run against a database that already has the column and/or the row: it never invents
-- a second id for the same city.

-- 1. TABLE
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.cities (id, name, slug, is_default)
VALUES ('8aa2d628-719d-4810-9ee3-8efd230ab000', 'Coronel', 'coronel', true)
ON CONFLICT (id) DO NOTHING;

-- 2. COLUMN + BACKFILL
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id);

-- Every row created before this migration belongs to Coronel — this has always been a
-- single-city app, so there is no ambiguity about which city legacy rows belong to.
UPDATE public.community_posts
SET city_id = '8aa2d628-719d-4810-9ee3-8efd230ab000'
WHERE city_id IS NULL;

ALTER TABLE public.community_posts
  ALTER COLUMN city_id SET DEFAULT '8aa2d628-719d-4810-9ee3-8efd230ab000';

ALTER TABLE public.community_posts
  ALTER COLUMN city_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_posts_city_id ON public.community_posts(city_id);

-- 3. RLS: cities is public reference data (name/slug only), safe to expose to anyone.
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cities_public_read" ON public.cities;
CREATE POLICY "cities_public_read"
  ON public.cities FOR SELECT
  TO public
  USING (true);
