-- Adds person identity fields for Oficios ("contrato a una persona, no un aviso")
-- and a non-destructive opt-in flag for future reputation/reviews system.
-- Nullable at DB level to avoid breaking existing rows (venta/oferta/oficio).
-- provider_name is required at the form level for oficios, not enforced in DB.

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS provider_name TEXT;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS provider_last_name TEXT;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS provider_display_name TEXT;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS ratings_enabled BOOLEAN NOT NULL DEFAULT false;
