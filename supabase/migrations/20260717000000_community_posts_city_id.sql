-- community_posts.city_id, seeded against the REAL community_cities table
--
-- CoronelLocal is a single-city product today, but community_posts rows were being created
-- with no city association whatsoever — confirmed directly against production on 2026-07-17:
-- 3 active posts have city_id = null, and only 1 carries Coronel's id.
--
-- An earlier version of this migration created a brand-new `public.cities` table. That was
-- wrong: the reference table already exists in production as `community_cities` (added outside
-- this repo's migration history — same schema drift as the community_polls.status incident).
-- This version never creates a competing/parallel table. It does not assume anything about
-- community_cities' structure beyond the one column community_posts.city_id actually needs
-- (id): `name`/`slug` are only written to if information_schema confirms they exist on the real
-- table at migration time, and the seed is skipped (never guessed) if some other NOT NULL
-- column with no default is present that this migration doesn't know how to fill. Idempotent
-- and safe to run whether community_cities already exists (production) or not (a fresh/local
-- database), and safe to run more than once.
--
-- Coronel's id is pinned to the value already present on that one production row, so this
-- migration never invents a second id for the same city.

DO $$
DECLARE
  coronel_id CONSTANT UUID := '8aa2d628-719d-4810-9ee3-8efd230ab000';
  unknown_required_cols TEXT;
  id_is_unique BOOLEAN;
BEGIN
  -- 1. Table: created only if it doesn't exist at all (fresh/local db). Deliberately just the
  --    one column this migration depends on — no name/slug/is_default invented here.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'community_cities'
  ) THEN
    CREATE TABLE public.community_cities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
    );
  END IF;

  -- 2. Bail out of seeding (without ever guessing a value) if the real table has some other
  --    NOT NULL column with no default. Inventing a value for an unrecognized required column
  --    would itself be a parallel assumption about a structure we don't actually know.
  SELECT string_agg(column_name, ', ') INTO unknown_required_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'community_cities'
    AND is_nullable = 'NO' AND column_default IS NULL
    AND column_name NOT IN ('id', 'name', 'slug');

  IF unknown_required_cols IS NOT NULL THEN
    RAISE NOTICE 'community_cities has unrecognized required column(s) [%] with no default — skipping the Coronel seed here to avoid guessing a value. Seed that row manually.', unknown_required_cols;
  ELSE
    -- 3. Upsert the Coronel row by id, writing only to columns confirmed to exist.
    IF NOT EXISTS (SELECT 1 FROM public.community_cities WHERE id = coronel_id) THEN
      INSERT INTO public.community_cities (id) VALUES (coronel_id);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'community_cities' AND column_name = 'name'
    ) THEN
      UPDATE public.community_cities SET name = 'Coronel' WHERE id = coronel_id AND name IS NULL;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'community_cities' AND column_name = 'slug'
    ) THEN
      UPDATE public.community_cities SET slug = 'coronel' WHERE id = coronel_id AND slug IS NULL;
    END IF;
  END IF;

  -- 4. RLS: ensure public read access exists, without assuming/replacing whatever other
  --    policies the real table may already carry — only this one, uniquely named, is managed
  --    here, and it's a harmless no-op to re-run.
  EXECUTE 'ALTER TABLE public.community_cities ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS "community_cities_public_read" ON public.community_cities';
  EXECUTE 'CREATE POLICY "community_cities_public_read" ON public.community_cities FOR SELECT TO public USING (true)';

  -- 5. community_posts.city_id needs `id` to be unique/PK to be a valid FK target. Check
  --    rather than assume: a table that already existed in production could in principle lack
  --    that constraint, in which case adding the FK below would fail outright.
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = 'community_cities'
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      AND kcu.column_name = 'id'
  ) INTO id_is_unique;

  IF NOT id_is_unique THEN
    RAISE EXCEPTION 'public.community_cities.id has no PRIMARY KEY/UNIQUE constraint — cannot add community_posts.city_id as a foreign key to it. Add that constraint first.';
  END IF;
END $$;

-- 6. COLUMN + BACKFILL on community_posts (unchanged in intent from the previous version of
--    this migration — only the FK target changed, from the removed `cities` to the real
--    community_cities).
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);

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
