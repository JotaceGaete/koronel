-- Trust attributes for Oficios professional profiles.
-- These are structured signals (not buried in free text) that a neighbor
-- needs to see in seconds when deciding whether to contact a provider.

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS available_urgency BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS weekend_service BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS issues_invoice BOOLEAN NOT NULL DEFAULT false;

-- Manual admin verification ("Koronel verificó que este profesional existe").
-- No moderation workflow yet — toggled directly by an admin.
ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS provider_verified BOOLEAN NOT NULL DEFAULT false;

-- Extend price_type to support "visit fee" pricing, common for trade services
-- (e.g. an electrician charges a visit fee before any work estimate).
ALTER TABLE public.classified_ads
  DROP CONSTRAINT IF EXISTS classified_ads_price_type_check;

ALTER TABLE public.classified_ads
  ADD CONSTRAINT classified_ads_price_type_check
  CHECK (price_type IN ('free_quote', 'visit', 'from', 'hourly', 'negotiable'));
