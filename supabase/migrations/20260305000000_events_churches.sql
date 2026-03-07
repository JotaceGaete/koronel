-- Events & Churches Module Migration
-- Tables: events, church_details
-- Extends existing CoronelLocal schema

-- ============================================================
-- 1. TYPES
-- ============================================================
DROP TYPE IF EXISTS public.event_status CASCADE;
CREATE TYPE public.event_status AS ENUM ('pending', 'approved', 'rejected');

DROP TYPE IF EXISTS public.event_category CASCADE;
CREATE TYPE public.event_category AS ENUM ('church', 'courses', 'meetups', 'other');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- events
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    organizer_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category public.event_category NOT NULL DEFAULT 'other'::public.event_category,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    venue_name TEXT,
    address TEXT,
    image_url TEXT,
    contact_whatsapp TEXT,
    status public.event_status NOT NULL DEFAULT 'pending'::public.event_status,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- church_details
CREATE TABLE IF NOT EXISTS public.church_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    pastor_name TEXT,
    service_schedule TEXT,
    weekly_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON public.events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_business_id ON public.events(organizer_business_id);
CREATE INDEX IF NOT EXISTS idx_church_details_business_id ON public.church_details(business_id);

-- ============================================================
-- 4. FUNCTIONS (BEFORE RLS POLICIES)
-- ============================================================

-- Function to check if user has an approved claim on a business
CREATE OR REPLACE FUNCTION public.has_approved_claim(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_claims bc
    WHERE bc.business_id = p_business_id
    AND bc.user_id = auth.uid()
    AND bc.claim_status = 'approved'
  )
$$;

-- ============================================================
-- 5. ENABLE RLS
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_details ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- events: anyone can read approved events
DROP POLICY IF EXISTS "public_read_approved_events" ON public.events;
CREATE POLICY "public_read_approved_events"
ON public.events
FOR SELECT
TO public
USING (status = 'approved'::public.event_status);

-- events: authenticated users can read their own events (any status)
DROP POLICY IF EXISTS "users_read_own_events" ON public.events;
CREATE POLICY "users_read_own_events"
ON public.events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- events: authenticated users can insert
DROP POLICY IF EXISTS "users_insert_events" ON public.events;
CREATE POLICY "users_insert_events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- events: owner can update/delete their own events
DROP POLICY IF EXISTS "users_update_own_events" ON public.events;
CREATE POLICY "users_update_own_events"
ON public.events
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_events" ON public.events;
CREATE POLICY "users_delete_own_events"
ON public.events
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- events: admin full access
DROP POLICY IF EXISTS "admin_full_access_events" ON public.events;
CREATE POLICY "admin_full_access_events"
ON public.events
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- church_details: anyone can read
DROP POLICY IF EXISTS "public_read_church_details" ON public.church_details;
CREATE POLICY "public_read_church_details"
ON public.church_details
FOR SELECT
TO public
USING (true);

-- church_details: approved claimant can insert/update
DROP POLICY IF EXISTS "claimant_insert_church_details" ON public.church_details;
CREATE POLICY "claimant_insert_church_details"
ON public.church_details
FOR INSERT
TO authenticated
WITH CHECK (public.has_approved_claim(business_id));

DROP POLICY IF EXISTS "claimant_update_church_details" ON public.church_details;
CREATE POLICY "claimant_update_church_details"
ON public.church_details
FOR UPDATE
TO authenticated
USING (public.has_approved_claim(business_id))
WITH CHECK (public.has_approved_claim(business_id));

-- church_details: admin full access
DROP POLICY IF EXISTS "admin_full_access_church_details" ON public.church_details;
CREATE POLICY "admin_full_access_church_details"
ON public.church_details
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 7. ADD IGLESIAS Y TEMPLOS CATEGORY
-- ============================================================
DO $$
BEGIN
    INSERT INTO public.categories (id, name, name_key, icon, color, business_count)
    VALUES (
        gen_random_uuid(),
        'Iglesias y Templos',
        'iglesias-templos',
        'Church',
        '#7c3aed',
        0
    )
    ON CONFLICT (name_key) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Category insert failed: %', SQLERRM;
END $$;

-- ============================================================
-- 8. MOCK DATA
-- ============================================================
DO $$
DECLARE
    existing_user_id UUID;
    existing_business_id UUID;
    event1_id UUID := gen_random_uuid();
    event2_id UUID := gen_random_uuid();
    event3_id UUID := gen_random_uuid();
    event4_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
    ) THEN
        SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;

        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'businesses'
        ) THEN
            SELECT id INTO existing_business_id FROM public.businesses LIMIT 1;
        END IF;

        IF existing_user_id IS NOT NULL THEN
            INSERT INTO public.events (
                id, user_id, organizer_business_id, title, description, category,
                start_datetime, end_datetime, venue_name, address,
                image_url, contact_whatsapp, status, is_featured
            ) VALUES
            (
                event1_id, existing_user_id, existing_business_id,
                'Feria Gastronómica de Coronel',
                'Gran feria con los mejores sabores de la región. Disfruta de comida típica chilena, mariscos frescos y empanadas artesanales. Entrada liberada para toda la familia.',
                'meetups'::public.event_category,
                (CURRENT_TIMESTAMP + INTERVAL '3 days'),
                (CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '6 hours'),
                'Plaza de Armas de Coronel',
                'Plaza de Armas, Coronel, Biobío',
                'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
                '+56912345678',
                'approved'::public.event_status,
                true
            ),
            (
                event2_id, existing_user_id, NULL,
                'Taller de Emprendimiento Digital',
                'Aprende a crear tu negocio online desde cero. Taller práctico con expertos locales en marketing digital, redes sociales y ventas por internet.',
                'courses'::public.event_category,
                (CURRENT_TIMESTAMP + INTERVAL '7 days'),
                (CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '3 hours'),
                'Centro Comunitario Coronel Norte',
                'Av. Colón 456, Coronel Norte',
                'https://images.unsplash.com/photo-1552664730-d307ca884978',
                '+56987654321',
                'approved'::public.event_status,
                false
            ),
            (
                event3_id, existing_user_id, NULL,
                'Culto de Alabanza y Adoración',
                'Únete a nuestra comunidad en un especial culto de alabanza. Música en vivo, predicación y tiempo de oración. Todos son bienvenidos.',
                'church'::public.event_category,
                (CURRENT_TIMESTAMP + INTERVAL '5 days'),
                (CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '2 hours'),
                'Iglesia Evangélica Coronel',
                'Calle Freire 789, Coronel',
                'https://images.unsplash.com/photo-1438032005730-c779502df39b',
                '+56911223344',
                'approved'::public.event_status,
                false
            ),
            (
                event4_id, existing_user_id, NULL,
                'Encuentro de Vecinos Boca Sur',
                'Reunión comunitaria para tratar temas de seguridad, mejoras de infraestructura y actividades culturales del sector. Participación abierta a todos los vecinos.',
                'meetups'::public.event_category,
                (CURRENT_TIMESTAMP + INTERVAL '10 days'),
                (CURRENT_TIMESTAMP + INTERVAL '10 days' + INTERVAL '2 hours'),
                'Sede Social Boca Sur',
                'Pasaje Los Pinos 123, Boca Sur, Coronel',
                'https://images.unsplash.com/photo-1529156069898-49953e39b3ac',
                '+56955667788',
                'approved'::public.event_status,
                false
            )
            ON CONFLICT (id) DO NOTHING;
        ELSE
            RAISE NOTICE 'No existing users found. Skipping event mock data.';
        END IF;
    ELSE
        RAISE NOTICE 'Table user_profiles does not exist. Run auth migration first.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
