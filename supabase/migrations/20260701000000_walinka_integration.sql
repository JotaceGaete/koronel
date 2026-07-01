-- Walinka catalog fields on businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS walinka_catalog_url TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS walinka_business_slug TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS walinka_enabled BOOLEAN NOT NULL DEFAULT false;

-- Walinka catalog fields on classified_ads (profesionales)
ALTER TABLE public.classified_ads ADD COLUMN IF NOT EXISTS walinka_catalog_url TEXT;
ALTER TABLE public.classified_ads ADD COLUMN IF NOT EXISTS walinka_business_slug TEXT;
ALTER TABLE public.classified_ads ADD COLUMN IF NOT EXISTS walinka_enabled BOOLEAN NOT NULL DEFAULT false;

-- Click tracking table
CREATE TABLE IF NOT EXISTS public.walinka_catalog_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL,
  listing_type TEXT NOT NULL,
  walinka_business_slug TEXT,
  source TEXT NOT NULL DEFAULT 'koronel_listing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_walinka_clicks_listing ON public.walinka_catalog_clicks(listing_id, listing_type);
CREATE INDEX IF NOT EXISTS idx_walinka_clicks_slug ON public.walinka_catalog_clicks(walinka_business_slug);
CREATE INDEX IF NOT EXISTS idx_walinka_clicks_created ON public.walinka_catalog_clicks(created_at);
