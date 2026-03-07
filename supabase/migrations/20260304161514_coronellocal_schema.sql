-- CoronelLocal Full Schema Migration
-- Tables: user_profiles, categories, businesses, business_images, classified_ads, ad_images, business_claims, featured_listings

-- ============================================================
-- 1. TYPES
-- ============================================================
DROP TYPE IF EXISTS public.ad_status CASCADE;
CREATE TYPE public.ad_status AS ENUM ('active', 'expired', 'draft', 'deleted');

DROP TYPE IF EXISTS public.claim_status CASCADE;
CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- 2. CORE TABLES
-- ============================================================

-- user_profiles (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT,
    location TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_key TEXT NOT NULL UNIQUE,
    icon TEXT,
    color TEXT,
    business_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- businesses
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    category_key TEXT,
    description TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    rating NUMERIC(3,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    is_open BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    opening_hours JSONB,
    profile_visits INTEGER DEFAULT 0,
    contacts_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- business_images
CREATE TABLE IF NOT EXISTS public.business_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- classified_ads
CREATE TABLE IF NOT EXISTS public.classified_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    category_key TEXT,
    price NUMERIC(15,0),
    price_negotiable BOOLEAN DEFAULT false,
    condition TEXT,
    phone TEXT,
    whatsapp BOOLEAN DEFAULT false,
    location TEXT DEFAULT 'Coronel',
    ad_status public.ad_status DEFAULT 'active'::public.ad_status,
    featured BOOLEAN DEFAULT false,
    views INTEGER DEFAULT 0,
    duration_days INTEGER DEFAULT 30,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ad_images
CREATE TABLE IF NOT EXISTS public.ad_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES public.classified_ads(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- business_claims
CREATE TABLE IF NOT EXISTS public.business_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    claimant_name TEXT NOT NULL,
    claimant_email TEXT NOT NULL,
    claimant_phone TEXT,
    claimant_role TEXT,
    claim_status public.claim_status DEFAULT 'pending'::public.claim_status,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- featured_listings
CREATE TABLE IF NOT EXISTS public.featured_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_type TEXT NOT NULL CHECK (listing_type IN ('business', 'ad')),
    listing_id UUID NOT NULL,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_businesses_category_key ON public.businesses(category_key);
CREATE INDEX IF NOT EXISTS idx_businesses_featured ON public.businesses(featured);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_user_id ON public.classified_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_category_key ON public.classified_ads(category_key);
CREATE INDEX IF NOT EXISTS idx_classified_ads_status ON public.classified_ads(ad_status);
CREATE INDEX IF NOT EXISTS idx_classified_ads_featured ON public.classified_ads(featured);
CREATE INDEX IF NOT EXISTS idx_business_images_business_id ON public.business_images(business_id);
CREATE INDEX IF NOT EXISTS idx_ad_images_ad_id ON public.ad_images(ad_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_business_id ON public.business_claims(business_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_user_id ON public.business_claims(user_id);

-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- Trigger: auto-create user_profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Trigger: update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- ============================================================
-- 5. ENABLE RLS
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classified_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "public_read_user_profiles" ON public.user_profiles;
CREATE POLICY "public_read_user_profiles"
ON public.user_profiles FOR SELECT TO public
USING (true);

-- categories (public read)
DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories"
ON public.categories FOR SELECT TO public
USING (true);

-- businesses (public read, owner write)
DROP POLICY IF EXISTS "public_read_businesses" ON public.businesses;
CREATE POLICY "public_read_businesses"
ON public.businesses FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_businesses" ON public.businesses;
CREATE POLICY "authenticated_insert_businesses"
ON public.businesses FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owners_update_businesses" ON public.businesses;
CREATE POLICY "owners_update_businesses"
ON public.businesses FOR UPDATE TO authenticated
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owners_delete_businesses" ON public.businesses;
CREATE POLICY "owners_delete_businesses"
ON public.businesses FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- business_images (public read, owner write)
DROP POLICY IF EXISTS "public_read_business_images" ON public.business_images;
CREATE POLICY "public_read_business_images"
ON public.business_images FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "owners_manage_business_images" ON public.business_images;
CREATE POLICY "owners_manage_business_images"
ON public.business_images FOR ALL TO authenticated
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

-- classified_ads (public read, owner write)
DROP POLICY IF EXISTS "public_read_classified_ads" ON public.classified_ads;
CREATE POLICY "public_read_classified_ads"
ON public.classified_ads FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_classified_ads" ON public.classified_ads;
CREATE POLICY "authenticated_insert_classified_ads"
ON public.classified_ads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owners_update_classified_ads" ON public.classified_ads;
CREATE POLICY "owners_update_classified_ads"
ON public.classified_ads FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owners_delete_classified_ads" ON public.classified_ads;
CREATE POLICY "owners_delete_classified_ads"
ON public.classified_ads FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ad_images (public read, owner write)
DROP POLICY IF EXISTS "public_read_ad_images" ON public.ad_images;
CREATE POLICY "public_read_ad_images"
ON public.ad_images FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "owners_manage_ad_images" ON public.ad_images;
CREATE POLICY "owners_manage_ad_images"
ON public.ad_images FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.classified_ads ca
        WHERE ca.id = ad_id AND ca.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.classified_ads ca
        WHERE ca.id = ad_id AND ca.user_id = auth.uid()
    )
);

-- business_claims
DROP POLICY IF EXISTS "authenticated_insert_claims" ON public.business_claims;
CREATE POLICY "authenticated_insert_claims"
ON public.business_claims FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owners_read_own_claims" ON public.business_claims;
CREATE POLICY "owners_read_own_claims"
ON public.business_claims FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- featured_listings (public read)
DROP POLICY IF EXISTS "public_read_featured_listings" ON public.featured_listings;
CREATE POLICY "public_read_featured_listings"
ON public.featured_listings FOR SELECT TO public
USING (true);

-- ============================================================
-- 7. TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_businesses_updated_at ON public.businesses;
CREATE TRIGGER set_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_classified_ads_updated_at ON public.classified_ads;
CREATE TRIGGER set_classified_ads_updated_at
    BEFORE UPDATE ON public.classified_ads
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 8. STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'business-images',
    'business-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ad-images',
    'ad-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "public_read_business_images_storage" ON storage.objects;
CREATE POLICY "public_read_business_images_storage"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'business-images');

DROP POLICY IF EXISTS "authenticated_upload_business_images" ON storage.objects;
CREATE POLICY "authenticated_upload_business_images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'business-images');

DROP POLICY IF EXISTS "owners_delete_business_images_storage" ON storage.objects;
CREATE POLICY "owners_delete_business_images_storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'business-images' AND owner = auth.uid());

DROP POLICY IF EXISTS "public_read_ad_images_storage" ON storage.objects;
CREATE POLICY "public_read_ad_images_storage"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'ad-images');

DROP POLICY IF EXISTS "authenticated_upload_ad_images" ON storage.objects;
CREATE POLICY "authenticated_upload_ad_images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ad-images');

DROP POLICY IF EXISTS "owners_delete_ad_images_storage" ON storage.objects;
CREATE POLICY "owners_delete_ad_images_storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ad-images' AND owner = auth.uid());

DROP POLICY IF EXISTS "public_read_avatars_storage" ON storage.objects;
CREATE POLICY "public_read_avatars_storage"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "authenticated_upload_avatars" ON storage.objects;
CREATE POLICY "authenticated_upload_avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "owners_update_avatars" ON storage.objects;
CREATE POLICY "owners_update_avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

DROP POLICY IF EXISTS "owners_delete_avatars" ON storage.objects;
CREATE POLICY "owners_delete_avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

-- ============================================================
-- 9. SEED DATA
-- ============================================================

-- Categories
INSERT INTO public.categories (id, name, name_key, icon, color, business_count) VALUES
    (gen_random_uuid(), 'Restaurantes', 'restaurants', 'Utensils', '#E53E3E', 145),
    (gen_random_uuid(), 'Salud', 'health', 'Heart', '#38A169', 89),
    (gen_random_uuid(), 'Educacion', 'education', 'GraduationCap', '#3182CE', 67),
    (gen_random_uuid(), 'Automotriz', 'automotive', 'Car', '#D69E2E', 54),
    (gen_random_uuid(), 'Ferreterias', 'hardware', 'Wrench', '#805AD5', 43),
    (gen_random_uuid(), 'Supermercados', 'supermarkets', 'ShoppingCart', '#DD6B20', 28),
    (gen_random_uuid(), 'Belleza', 'beauty', 'Scissors', '#D53F8C', 76),
    (gen_random_uuid(), 'Servicios', 'services', 'Briefcase', '#2B6CB0', 112),
    (gen_random_uuid(), 'Tecnologia', 'technology', 'Monitor', '#2C7A7B', 38),
    (gen_random_uuid(), 'Deportes', 'sports', 'Dumbbell', '#276749', 29)
ON CONFLICT (name_key) DO NOTHING;

-- Mock auth users
DO $$
DECLARE
    user1_uuid UUID := gen_random_uuid();
    user2_uuid UUID := gen_random_uuid();
    biz1_uuid UUID := gen_random_uuid();
    biz2_uuid UUID := gen_random_uuid();
    ad1_uuid UUID := gen_random_uuid();
    ad2_uuid UUID := gen_random_uuid();
    ad3_uuid UUID := gen_random_uuid();
BEGIN
    -- Create auth users (trigger creates user_profiles automatically)
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (user1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'carlos@coronellocal.cl', crypt('coronel2026', gen_salt('bf', 10)), now(), now(), now(),
         jsonb_build_object('full_name', 'Carlos Munoz Perez'),
         jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (user2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'maria@coronellocal.cl', crypt('coronel2026', gen_salt('bf', 10)), now(), now(), now(),
         jsonb_build_object('full_name', 'Maria Gonzalez'),
         jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
    ON CONFLICT (id) DO NOTHING;

    -- Businesses
    INSERT INTO public.businesses (
        id, owner_id, name, category, category_key, description, address, phone,
        rating, review_count, is_open, featured, verified, profile_visits, contacts_count
    ) VALUES
        (biz1_uuid, user1_uuid, 'Restaurante El Rincon Coronelino', 'Restaurantes', 'restaurants',
         'El mejor restaurante de comida chilena tradicional en Coronel. Especialidad en mariscos y carnes a la parrilla.',
         'Av. Arturo Prat 345, Coronel', '+56 41 2234567',
         4.7, 128, true, true, true, 1240, 58),
        (biz2_uuid, user2_uuid, 'Farmacia Cruz Verde Coronel', 'Salud', 'health',
         'Farmacia con amplio stock de medicamentos, cosmeticos y productos de salud. Atendemos las 24 horas.',
         'Calle Freire 120, Coronel', '+56 41 2345678',
         4.5, 89, true, true, false, 331, 36)
    ON CONFLICT (id) DO NOTHING;

    -- Classified Ads
    INSERT INTO public.classified_ads (
        id, user_id, title, description, category, category_key, price, condition,
        phone, location, ad_status, featured, views, duration_days, expires_at
    ) VALUES
        (ad1_uuid, user1_uuid, 'Toyota Corolla 2018 - Excelente estado, unico dueno',
         'Vendo Toyota Corolla 2018 en excelente estado. Un solo dueno, mantencion al dia, papeles al dia. Motor 1.8, automatico, color plata.',
         'Vehiculos', 'vehicles', 9500000, 'Buen estado',
         '912345678', 'Coronel Centro', 'active'::public.ad_status, true, 342, 30,
         CURRENT_TIMESTAMP + INTERVAL '30 days'),
        (ad2_uuid, user1_uuid, 'iPhone 14 Pro 256GB - Como nuevo, con caja',
         'Vendo iPhone 14 Pro 256GB color morado oscuro. Como nuevo, con caja original, cargador y funda. Sin rayones.',
         'Electronica', 'electronics', 650000, 'Como nuevo',
         '912345678', 'Coronel Norte', 'active'::public.ad_status, false, 509, 30,
         CURRENT_TIMESTAMP + INTERVAL '30 days'),
        (ad3_uuid, user2_uuid, 'Departamento 2D/2B en arriendo - Sector Playa',
         'Arriendo departamento 2 dormitorios 2 banos en sector Playa Blanca. Piso 3, vista al mar, estacionamiento incluido.',
         'Inmuebles', 'real-estate', 350000, 'Como nuevo',
         '923456789', 'Playa Blanca', 'active'::public.ad_status, true, 218, 30,
         CURRENT_TIMESTAMP + INTERVAL '30 days')
    ON CONFLICT (id) DO NOTHING;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Seed data error: %', SQLERRM;
END $$;
