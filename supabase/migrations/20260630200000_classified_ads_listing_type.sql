-- Add listing_type to classified_ads to distinguish:
--   'venta'   — item for sale (existing default)
--   'oficio'  — permanent personal service (gasfíter, electricista, etc.)
--   'oferta'  — time-limited business promotion/deal
--
-- This reuses all existing classified_ads infrastructure (images, RLS, status)
-- without a new table. The UI differentiates by listing_type.

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'venta'
  CHECK (listing_type IN ('venta', 'oficio', 'oferta'));

-- Backfill existing rows so /clasificados doesn't lose old ads
UPDATE public.classified_ads
  SET listing_type = 'venta'
  WHERE listing_type IS NULL;

-- Separate index for fast filtering per section
CREATE INDEX IF NOT EXISTS idx_classified_ads_listing_type
  ON public.classified_ads(listing_type);

-- For ofertas: optional link to a business
ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classified_ads_business_id
  ON public.classified_ads(business_id);
