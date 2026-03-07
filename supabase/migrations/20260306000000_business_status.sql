-- Migration: Business Status System
-- Adds status, premium_until, rejection_reason, whatsapp, redes_sociales columns to businesses
-- Creates check_premium_expiry() function
-- Updates RLS policies for businesses table
-- Seeds categories if table is empty

-- ============================================================
-- 1. ADD MISSING COLUMNS TO businesses
-- ============================================================
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS redes_sociales TEXT;

-- ============================================================
-- 2. BACKFILL: existing businesses without status => published
-- ============================================================
UPDATE public.businesses
SET status = 'published'
WHERE status IS NULL OR status = 'pending' AND created_at < NOW() - INTERVAL '1 day';

-- Specifically set all pre-existing businesses (those without owner_id or created before this migration) to published
UPDATE public.businesses
SET status = 'published'
WHERE status = 'pending' AND owner_id IS NULL;

-- ============================================================
-- 3. INDEX for status queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_premium_until ON public.businesses(premium_until);

-- ============================================================
-- 4. FUNCTION: check_premium_expiry
-- Updates expired premium businesses to 'published'
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_premium_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.businesses
  SET status = 'published'
  WHERE status = 'premium'
    AND premium_until IS NOT NULL
    AND premium_until < NOW();
END;
$$;

-- ============================================================
-- 5. FUNCTION: is_admin_user (for RLS policies)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
      AND (
        au.raw_user_meta_data->>'role' = 'admin'
        OR au.raw_app_meta_data->>'role' = 'admin'
      )
  );
$$;

-- ============================================================
-- 6. RLS: Enable and update policies for businesses
-- ============================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "businesses_public_read" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_read_own" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_insert" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_update" ON public.businesses;
DROP POLICY IF EXISTS "businesses_admin_all" ON public.businesses;
DROP POLICY IF EXISTS "Allow public read" ON public.businesses;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.businesses;
DROP POLICY IF EXISTS "Allow owner update" ON public.businesses;
DROP POLICY IF EXISTS "Allow admin all" ON public.businesses;
DROP POLICY IF EXISTS "public_read_businesses" ON public.businesses;
DROP POLICY IF EXISTS "owner_manage_businesses" ON public.businesses;
DROP POLICY IF EXISTS "admin_manage_businesses" ON public.businesses;

-- Public can read published and premium businesses
CREATE POLICY "businesses_public_read"
ON public.businesses
FOR SELECT
TO public
USING (status IN ('published', 'premium'));

-- Owners can read their own businesses regardless of status
CREATE POLICY "businesses_owner_read_own"
ON public.businesses
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Authenticated users can insert businesses (owner_id must match their uid)
CREATE POLICY "businesses_owner_insert"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Owners can update their own businesses
CREATE POLICY "businesses_owner_update"
ON public.businesses
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Admins can do everything
CREATE POLICY "businesses_admin_all"
ON public.businesses
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- ============================================================
-- 7. RLS for business_images
-- ============================================================
ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_images_public_read" ON public.business_images;
DROP POLICY IF EXISTS "business_images_owner_insert" ON public.business_images;
DROP POLICY IF EXISTS "business_images_owner_delete" ON public.business_images;
DROP POLICY IF EXISTS "business_images_admin_all" ON public.business_images;

CREATE POLICY "business_images_public_read"
ON public.business_images
FOR SELECT
TO public
USING (true);

CREATE POLICY "business_images_owner_insert"
ON public.business_images
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_id AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "business_images_owner_delete"
ON public.business_images
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_id AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "business_images_admin_all"
ON public.business_images
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- ============================================================
-- 8. SEED categories if table is empty
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categories LIMIT 1) THEN
    INSERT INTO public.categories (id, name, name_key, icon) VALUES
      (gen_random_uuid(), 'Restaurante',       'restaurante',       'Utensils'),
      (gen_random_uuid(), 'Pizzería',          'pizzeria',          'Pizza'),
      (gen_random_uuid(), 'Minimarket',        'minimarket',        'ShoppingCart'),
      (gen_random_uuid(), 'Ferretería',        'ferreteria',        'Wrench'),
      (gen_random_uuid(), 'Veterinaria',       'veterinaria',       'Heart'),
      (gen_random_uuid(), 'Taller Mecánico',   'taller-mecanico',   'Car'),
      (gen_random_uuid(), 'Peluquería',        'peluqueria',        'Scissors'),
      (gen_random_uuid(), 'Farmacia',          'farmacia',          'Pill'),
      (gen_random_uuid(), 'Panadería',         'panaderia',         'Croissant'),
      (gen_random_uuid(), 'Electricista',      'electricista',      'Zap'),
      (gen_random_uuid(), 'Abogado',           'abogado',           'Scale'),
      (gen_random_uuid(), 'Iglesia y Templo',  'iglesia-templo',    'Church')
    ON CONFLICT (name_key) DO NOTHING;
    RAISE NOTICE 'Categories seeded successfully.';
  ELSE
    RAISE NOTICE 'Categories already exist, skipping seed.';
  END IF;
END $$;
