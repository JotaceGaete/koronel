-- city_id (nullable, con backfill) en las tablas raíz de contenido.
-- Depende de 20260601000001_create_community_cities.sql.
--
-- A propósito: ninguna columna queda NOT NULL en esta migración, y no se
-- toca ninguna política RLS existente. Ningún INSERT existente que no
-- mencione city_id se rompe. Ver docs/diseno-multi-ciudad.md y
-- docs/plan-fase-a-b.md.

DO $$
DECLARE
  v_coronel_id UUID;
BEGIN
  SELECT id INTO v_coronel_id FROM public.community_cities WHERE slug = 'coronel';
  IF v_coronel_id IS NULL THEN
    RAISE EXCEPTION 'No existe la ciudad "coronel" en community_cities — aplicar 20260601000001 primero.';
  END IF;

  -- businesses
  ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.businesses SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- classified_ads
  ALTER TABLE public.classified_ads ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.classified_ads SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- events
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.events SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- jobs
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.jobs SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- community_posts
  ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.community_posts SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- banners
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.banners SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- popups
  ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.popups SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- featured_listings
  ALTER TABLE public.featured_listings ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.featured_listings SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- suggested_businesses
  ALTER TABLE public.suggested_businesses ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.suggested_businesses SET city_id = v_coronel_id WHERE city_id IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses(city_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_city_id ON public.classified_ads(city_id);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events(city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON public.jobs(city_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_city_id ON public.community_posts(city_id);
CREATE INDEX IF NOT EXISTS idx_banners_city_id ON public.banners(city_id);
CREATE INDEX IF NOT EXISTS idx_popups_city_id ON public.popups(city_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_city_id ON public.featured_listings(city_id);
CREATE INDEX IF NOT EXISTS idx_suggested_businesses_city_id ON public.suggested_businesses(city_id);
