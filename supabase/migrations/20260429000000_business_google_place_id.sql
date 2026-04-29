-- Agrega columna google_place_id para deduplicar importaciones desde Google Maps
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS google_place_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_google_place_id
  ON public.businesses(google_place_id)
  WHERE google_place_id IS NOT NULL;
