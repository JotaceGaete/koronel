-- Admin Module Migration: banners, popups, admin RLS policies
-- Extends existing schema with admin-specific tables and role-based access

-- ============================================================
-- 1. ADMIN ROLE FUNCTION (BEFORE RLS POLICIES)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
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
  )
$$;

-- ============================================================
-- 2. NEW TABLES: banners, popups
-- ============================================================

-- banners
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT,
    link_url TEXT,
    position TEXT NOT NULL DEFAULT 'homepage_top' CHECK (position IN ('homepage_top', 'sidebar', 'footer', 'homepage_bottom')),
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- popups
CREATE TABLE IF NOT EXISTS public.popups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT,
    button_text TEXT DEFAULT 'Cerrar',
    button_link TEXT,
    active BOOLEAN DEFAULT false,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_banners_position ON public.banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners(active);
CREATE INDEX IF NOT EXISTS idx_popups_active ON public.popups(active);

-- ============================================================
-- 4. ENABLE RLS
-- ============================================================
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES FOR NEW TABLES
-- ============================================================

-- banners: public read, admin write
DROP POLICY IF EXISTS "public_read_banners" ON public.banners;
CREATE POLICY "public_read_banners"
ON public.banners FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "admin_manage_banners" ON public.banners;
CREATE POLICY "admin_manage_banners"
ON public.banners FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- popups: public read, admin write
DROP POLICY IF EXISTS "public_read_popups" ON public.popups;
CREATE POLICY "public_read_popups"
ON public.popups FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "admin_manage_popups" ON public.popups;
CREATE POLICY "admin_manage_popups"
ON public.popups FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 6. ADMIN POLICIES FOR EXISTING TABLES
-- ============================================================

-- Admin full access to categories
DROP POLICY IF EXISTS "admin_manage_categories" ON public.categories;
CREATE POLICY "admin_manage_categories"
ON public.categories FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin full access to businesses
DROP POLICY IF EXISTS "admin_manage_businesses" ON public.businesses;
CREATE POLICY "admin_manage_businesses"
ON public.businesses FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin full access to classified_ads
DROP POLICY IF EXISTS "admin_manage_classified_ads" ON public.classified_ads;
CREATE POLICY "admin_manage_classified_ads"
ON public.classified_ads FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin full access to business_claims
DROP POLICY IF EXISTS "admin_manage_business_claims" ON public.business_claims;
CREATE POLICY "admin_manage_business_claims"
ON public.business_claims FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin full access to featured_listings
DROP POLICY IF EXISTS "admin_manage_featured_listings" ON public.featured_listings;
CREATE POLICY "admin_manage_featured_listings"
ON public.featured_listings FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin full access to user_profiles
DROP POLICY IF EXISTS "admin_read_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_read_user_profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (public.is_admin());

-- ============================================================
-- 7. ADD ROLE COLUMN TO USER_PROFILES (for admin check via profiles)
-- ============================================================
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- ============================================================
-- 8. SEED ADMIN USER (update existing user to admin role)
-- ============================================================
DO $$
BEGIN
    -- Update existing users to have admin role in metadata
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', 'admin')
    WHERE email = 'carlos@coronellocal.cl';

    -- Update user_profiles role column
    UPDATE public.user_profiles
    SET role = 'admin'
    WHERE email = 'carlos@coronellocal.cl';

    -- Insert sample banners
    INSERT INTO public.banners (title, image_url, link_url, position, active, sort_order)
    VALUES
        ('Banner Principal', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=200&fit=crop', '/business-directory-listing', 'homepage_top', true, 1),
        ('Banner Lateral', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&h=250&fit=crop', '/classified-ads-listing', 'sidebar', true, 1),
        ('Banner Footer', 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=100&fit=crop', '/homepage', 'footer', false, 1)
    ON CONFLICT (id) DO NOTHING;

    -- Insert sample popup
    INSERT INTO public.popups (title, message, button_text, button_link, active)
    VALUES
        ('Bienvenido a CoronelLocal', 'Descubre los mejores negocios de Coronel. Regístrate gratis y publica tu negocio hoy.', 'Explorar Negocios', '/business-directory-listing', false)
    ON CONFLICT (id) DO NOTHING;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Admin seed data error: %', SQLERRM;
END $$;
