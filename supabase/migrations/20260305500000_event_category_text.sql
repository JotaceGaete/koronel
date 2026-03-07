-- Migration: Convert event_category ENUM to TEXT
-- Reason: Dynamic categories (e.g. 'farmacias') cannot be added to a fixed ENUM.
-- This migration converts the column to TEXT so any category value is accepted.

-- ============================================================
-- 1. ALTER events.category column from enum to TEXT
-- ============================================================

-- Step 1: Add a temporary TEXT column
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category_text TEXT;

-- Step 2: Copy existing enum values into the text column
UPDATE public.events
  SET category_text = category::TEXT
  WHERE category_text IS NULL;

-- Step 3: Drop the old enum column (CASCADE removes the index too)
ALTER TABLE public.events
  DROP COLUMN IF EXISTS category;

-- Step 4: Rename the text column to 'category'
ALTER TABLE public.events
  RENAME COLUMN category_text TO category;

-- Step 5: Set a default value and NOT NULL constraint
ALTER TABLE public.events
  ALTER COLUMN category SET DEFAULT 'other',
  ALTER COLUMN category SET NOT NULL;

-- Step 6: Drop the now-unused enum type (CASCADE handles any remaining references)
DROP TYPE IF EXISTS public.event_category CASCADE;

-- ============================================================
-- 2. Recreate the index on the category column (was dropped with CASCADE)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);

-- ============================================================
-- 3. No RLS changes needed — existing policies are unaffected
-- ============================================================
