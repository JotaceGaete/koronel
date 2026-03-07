-- Map & Events Update Migration
-- Adds lat/lng to businesses, extends events table, seeds Coronel data

-- ============================================================
-- 1. ADD LAT/LNG TO BUSINESSES (if not already present)
-- ============================================================
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS lat FLOAT8,
  ADD COLUMN IF NOT EXISTS lng FLOAT8;

-- Also ensure latitude/longitude aliases work (copy existing data)
DO $$
BEGIN
  -- Sync latitude/longitude -> lat/lng if lat is null
  UPDATE public.businesses
  SET lat = CAST(latitude AS FLOAT8), lng = CAST(longitude AS FLOAT8)
  WHERE lat IS NULL AND latitude IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'lat/lng sync skipped: %', SQLERRM;
END $$;

-- ============================================================
-- 2. EXTEND EVENTS TABLE
-- ============================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS lat FLOAT8,
  ADD COLUMN IF NOT EXISTS lng FLOAT8,
  ADD COLUMN IF NOT EXISTS address_text TEXT,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Sync existing address -> address_text
DO $$
BEGIN
  UPDATE public.events SET address_text = address WHERE address_text IS NULL AND address IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'address_text sync skipped: %', SQLERRM;
END $$;

-- ============================================================
-- 3. UPDATE EVENT STATUS ENUM (add 'active' value)
-- MUST be outside a transaction block to commit before use
-- ============================================================
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'active';

-- ============================================================
-- 4. CREATE event-images STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event-images
DROP POLICY IF EXISTS "public_read_event_images" ON storage.objects;
CREATE POLICY "public_read_event_images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "auth_upload_event_images" ON storage.objects;
CREATE POLICY "auth_upload_event_images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "auth_delete_event_images" ON storage.objects;
CREATE POLICY "auth_delete_event_images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- 5. SEED BUSINESSES WITH CORONEL COORDINATES
-- ============================================================
DO $$
DECLARE
  b1 UUID := gen_random_uuid();
  b2 UUID := gen_random_uuid();
  b3 UUID := gen_random_uuid();
  b4 UUID := gen_random_uuid();
  b5 UUID := gen_random_uuid();
BEGIN
  -- Update existing businesses with coordinates if they have none
  UPDATE public.businesses
  SET lat = -37.0298 + (random() * 0.02 - 0.01),
      lng = -73.1429 + (random() * 0.02 - 0.01)
  WHERE lat IS NULL;

  -- Insert new seed businesses with Coronel coordinates
  INSERT INTO public.businesses (id, name, category, category_key, description, address, phone, lat, lng, featured, verified, is_open)
  VALUES
    (b1, 'Supermercado El Ahorro', 'Supermercados', 'supermercados', 'El supermercado más completo de Coronel con productos frescos y variedad.', 'Av. Colón 1234, Coronel', '+56412345678', -37.0285, -73.1445, true, true, true),
    (b2, 'Farmacia Cruz Verde Coronel', 'Farmacias', 'farmacias', 'Farmacia con amplio stock de medicamentos y atención profesional.', 'Calle Freire 456, Coronel', '+56412345679', -37.0302, -73.1418, false, true, true),
    (b3, 'Restaurante El Muelle', 'Restaurantes', 'restaurantes', 'Los mejores mariscos y pescados frescos del Biobío.', 'Av. Costanera 789, Coronel', '+56412345680', -37.0315, -73.1460, true, true, true),
    (b4, 'Iglesia Evangélica Coronel', 'Iglesias y Templos', 'iglesias-templos', 'Comunidad cristiana con cultos dominicales y actividades semanales.', 'Calle Freire 789, Coronel', '+56412345681', -37.0270, -73.1435, false, false, true),
    (b5, 'Ferretería Los Andes', 'Ferreterías', 'ferreterias', 'Todo en materiales de construcción y herramientas para el hogar.', 'Av. Colón 567, Coronel', '+56412345682', -37.0310, -73.1400, false, true, true)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Business seed error: %', SQLERRM;
END $$;

-- ============================================================
-- 6. SEED EVENTS WITH CORONEL COORDINATES
-- ============================================================
DO $$
DECLARE
  existing_user_id UUID;
  b1_id UUID;
  b3_id UUID;
  e1 UUID := gen_random_uuid();
  e2 UUID := gen_random_uuid();
  e3 UUID := gen_random_uuid();
BEGIN
  SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;
  SELECT id INTO b1_id FROM public.businesses WHERE name = 'Supermercado El Ahorro' LIMIT 1;
  SELECT id INTO b3_id FROM public.businesses WHERE name = 'Restaurante El Muelle' LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    INSERT INTO public.events (
      id, user_id, organizer_business_id, title, description, category,
      start_datetime, end_datetime, venue_name, address, address_text,
      lat, lng, image_url, contact_whatsapp, status, is_featured
    ) VALUES
    (
      e1, existing_user_id, b3_id,
      'Feria Gastronómica de Coronel',
      'Gran feria con los mejores sabores de la región. Disfruta de comida típica chilena, mariscos frescos y empanadas artesanales.',
      'meetups'::public.event_category,
      (CURRENT_TIMESTAMP + INTERVAL '3 days'),
      (CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '6 hours'),
      'Plaza de Armas de Coronel',
      'Plaza de Armas, Coronel, Biobío',
      'Plaza de Armas, Coronel, Biobío',
      -37.0298, -73.1429,
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&fit=crop',
      '+56912345678',
      'approved'::public.event_status,
      true
    ),
    (
      e2, existing_user_id, NULL,
      'Taller de Emprendimiento Digital',
      'Aprende a crear tu negocio online desde cero. Taller práctico con expertos locales.',
      'courses'::public.event_category,
      (CURRENT_TIMESTAMP + INTERVAL '7 days'),
      (CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '3 hours'),
      'Centro Comunitario Coronel Norte',
      'Av. Colón 456, Coronel Norte',
      'Av. Colón 456, Coronel Norte',
      -37.0265, -73.1410,
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&fit=crop',
      '+56987654321',
      'approved'::public.event_status,
      false
    ),
    (
      e3, existing_user_id, b1_id,
      'Encuentro de Vecinos Boca Sur',
      'Reunión comunitaria para tratar temas del barrio y organizar actividades vecinales.',
      'meetups'::public.event_category,
      (CURRENT_TIMESTAMP + INTERVAL '10 days'),
      (CURRENT_TIMESTAMP + INTERVAL '10 days' + INTERVAL '2 hours'),
      'Sede Social Boca Sur',
      'Pasaje Los Pinos 123, Boca Sur',
      'Pasaje Los Pinos 123, Boca Sur',
      -37.0330, -73.1450,
      'https://images.unsplash.com/photo-1561650714-2c92f02c21de?w=800&fit=crop',
      '+56911223344',
      'approved'::public.event_status,
      false
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Event seed error: %', SQLERRM;
END $$;

-- ============================================================
-- 7. RLS POLICY FOR APPROVED/ACTIVE EVENTS (map visibility)
-- ============================================================
DROP POLICY IF EXISTS "public_read_active_events" ON public.events;
CREATE POLICY "public_read_active_events"
ON public.events
FOR SELECT
TO public
USING (status = 'approved'::public.event_status OR status = 'active'::public.event_status);
