-- Minimal fields for Oficios experience.
-- price_type distinguishes how a service provider charges.
-- schedule_note is a free-text "when am I available" field.

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS price_type TEXT
  CHECK (price_type IN ('free_quote', 'from', 'hourly', 'negotiable'));

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS schedule_note TEXT;
