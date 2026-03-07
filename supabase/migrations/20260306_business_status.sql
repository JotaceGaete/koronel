-- Migration: Business Status System
-- Adds status, premium_until columns to businesses
-- Seeds business categories if empty
-- Updates RLS for public/owner/admin access
-- Creates check_premium_expiry() function

-- 1. Add columns to businesses table
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS premium_until timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS redes_sociales text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Backfill existing businesses to 'published'
UPDATE public.businesses
  SET status = 'published'
  WHERE status IS NULL OR status = 'pending';

-- 3. Index for status queries
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);

-- 4. Function: check_premium_expiry
-- Downgrades expired premium businesses to 'published'
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
    AND premium_until < now();
END;
$$;

-- 5. Function: is_admin_user (for RLS)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND (
        raw_user_meta_data->>'role' = 'admin'
        OR raw_app_meta_data->>'role' = 'admin'
      )
  );
$$;

-- 6. Enable RLS (idempotent)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- 7. Drop and recreate RLS policies
DROP POLICY IF EXISTS "public_read_published_businesses" ON public.businesses;
CREATE POLICY "public_read_published_businesses"
  ON public.businesses
  FOR SELECT
  TO public
  USING (status IN ('published', 'premium'));

DROP POLICY IF EXISTS "owner_read_own_businesses" ON public.businesses;
CREATE POLICY "owner_read_own_businesses"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_insert_businesses" ON public.businesses;
CREATE POLICY "owner_insert_businesses"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_update_businesses" ON public.businesses;
CREATE POLICY "owner_update_businesses"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "admin_all_businesses" ON public.businesses;
CREATE POLICY "admin_all_businesses"
  ON public.businesses
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- 8. RLS for business_images
ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_business_images" ON public.business_images;
CREATE POLICY "public_read_business_images"
  ON public.business_images
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "owner_manage_business_images" ON public.business_images;
CREATE POLICY "owner_manage_business_images"
  ON public.business_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin_manage_business_images" ON public.business_images;
CREATE POLICY "admin_manage_business_images"
  ON public.business_images
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- 9. Seed business categories if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categories LIMIT 1) THEN
    INSERT INTO public.categories (id, name, name_key, icon) VALUES
      (gen_random_uuid(), 'Restaurante', 'restaurante', 'UtensilsCrossed'),
      (gen_random_uuid(), 'Pizzería', 'pizzeria', 'Pizza'),
      (gen_random_uuid(), 'Minimarket', 'minimarket', 'ShoppingCart'),
      (gen_random_uuid(), 'Ferretería', 'ferreteria', 'Wrench'),
      (gen_random_uuid(), 'Veterinaria', 'veterinaria', 'Heart'),
      (gen_random_uuid(), 'Taller Mecánico', 'taller-mecanico', 'Car'),
      (gen_random_uuid(), 'Peluquería', 'peluqueria', 'Scissors'),
      (gen_random_uuid(), 'Farmacia', 'farmacia', 'Pill'),
      (gen_random_uuid(), 'Panadería', 'panaderia', 'Croissant'),
      (gen_random_uuid(), 'Electricista', 'electricista', 'Zap'),
      (gen_random_uuid(), 'Abogado', 'abogado', 'Scale'),
      (gen_random_uuid(), 'Iglesia y Templo', 'iglesia-templo', 'Church')
    ON CONFLICT (name_key) DO NOTHING;
  END IF;
END $$;
