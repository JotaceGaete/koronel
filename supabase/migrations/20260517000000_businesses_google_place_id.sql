ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS google_place_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_google_place_id_unique
  ON public.businesses(google_place_id)
  WHERE google_place_id IS NOT NULL;

COMMENT ON COLUMN public.businesses.google_place_id IS 'Google Places place_id used to prevent duplicate imports.';
