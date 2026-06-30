-- Add tags array to businesses for keyword-based search
-- tags: simple text array, e.g. '{empanadas,leña,delivery}'
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_businesses_tags ON public.businesses USING gin(tags);
