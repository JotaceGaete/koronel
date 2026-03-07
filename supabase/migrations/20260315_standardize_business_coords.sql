-- Migration: Standardize business coordinates to lat/lng only
-- Add address_text column and backfill lat/lng from latitude/longitude

-- 1. Add address_text column if not exists
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address_text TEXT;

-- 2. Backfill lat from latitude where lat is null
UPDATE businesses
SET lat = latitude
WHERE lat IS NULL AND latitude IS NOT NULL;

-- 3. Backfill lng from longitude where lng is null
UPDATE businesses
SET lng = longitude
WHERE lng IS NULL AND longitude IS NOT NULL;

-- 4. Backfill address_text from address where address_text is null
UPDATE businesses
SET address_text = address
WHERE address_text IS NULL AND address IS NOT NULL;
