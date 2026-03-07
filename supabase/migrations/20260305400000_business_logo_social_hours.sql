-- Migration: Add logo_url and social_links to businesses
-- Adds logo_url (direct URL for logo), social_links (JSONB array of {type, url})
-- Migrates existing redes_sociales text field to social_links JSONB
-- opening_hours already exists as JSONB

-- Add logo_url column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.businesses ADD COLUMN logo_url TEXT;
  END IF;
END;
$$;

-- Add social_links JSONB column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'social_links'
  ) THEN
    ALTER TABLE public.businesses ADD COLUMN social_links JSONB DEFAULT '[]'::jsonb;
  END IF;
END;
$$;

-- Migrate existing redes_sociales text to social_links JSONB (type=Otra)
-- Only migrate rows that have redes_sociales but no social_links yet
UPDATE public.businesses
SET social_links = jsonb_build_array(
  jsonb_build_object('type', 'Otra', 'url', redes_sociales)
)
WHERE redes_sociales IS NOT NULL
  AND redes_sociales <> ''
  AND (social_links IS NULL OR social_links = '[]'::jsonb);

-- Ensure opening_hours defaults to null (already nullable, just confirm)
-- No change needed, opening_hours already exists as JSONB nullable
