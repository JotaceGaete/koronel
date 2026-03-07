-- Add claimed column to businesses for explicit ownership/reclaim flow
-- claimed = true when business has been claimed by a user (owner_id set via claim approval or created by owner)

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT false;

-- Backfill: any business with owner_id is considered claimed
UPDATE public.businesses
SET claimed = true
WHERE owner_id IS NOT NULL AND (claimed IS NULL OR claimed = false);

COMMENT ON COLUMN public.businesses.claimed IS 'True when the business has an owner (created by user or claimed and approved).';
