-- Ensure businesses.claimed exists (fix PGRST204 schema cache mismatch).
-- Idempotent: safe to run even if 20260320000000_business_claimed_column was already applied.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS claimed boolean DEFAULT false;

COMMENT ON COLUMN public.businesses.claimed IS 'True when the business has an owner (created by user or claimed and approved).';

-- Backfill: any business with owner_id is considered claimed
UPDATE public.businesses
SET claimed = true
WHERE owner_id IS NOT NULL AND (claimed IS NULL OR claimed = false);
