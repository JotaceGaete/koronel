-- Centro de Crecimiento — Fase 1
-- Tablas: commercial_actions, action_images, business_followers,
--         commercial_calendar, business_pulse_history, growth_advisor_log

-- ─── commercial_actions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commercial_actions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id                 uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Intención declarada por el comerciante
  trigger_intent              text,
  -- low_sales | new_customers | excess_stock | new_product | event | free_publish

  -- Tipo de acción elegida (sugerida o propia)
  action_type                 text NOT NULL DEFAULT 'offer',
  -- offer | liquidation | launch | event | happy_hour | season | anniversary | new_product

  -- Sugerencia del sistema
  suggested_action_type       text,
  accepted_suggestion         boolean DEFAULT false,

  -- Fecha comercial que motivó la creación
  calendar_event_id           uuid,

  -- Contenido
  title                       text NOT NULL,
  headline                    text,
  description                 text,
  cover_image_url             text,

  -- Precio / descuento (todo opcional — no toda acción es un descuento)
  discount_type               text,           -- pct | amount | label | null
  discount_pct                int,
  discount_amount             int,
  discount_label              text,           -- "2x1", "Gratis despacho", etc.
  original_price              int,
  promo_price                 int,
  promo_code                  text,

  -- Urgencia
  starts_at                   timestamptz NOT NULL DEFAULT now(),
  ends_at                     timestamptz NOT NULL,
  max_redemptions             int,
  redemptions_count           int NOT NULL DEFAULT 0,
  show_countdown              boolean NOT NULL DEFAULT true,

  -- Estado
  status                      text NOT NULL DEFAULT 'draft',
  -- draft | scheduled | active | paused | expired | cancelled
  featured                    boolean NOT NULL DEFAULT false,
  tier                        text NOT NULL DEFAULT 'free',
  -- free | boost | premium

  -- Distribución por canal
  dist_koronel                boolean NOT NULL DEFAULT true,
  dist_map                    boolean NOT NULL DEFAULT true,
  dist_profile                boolean NOT NULL DEFAULT true,
  dist_followers              boolean NOT NULL DEFAULT true,
  dist_walinka                boolean NOT NULL DEFAULT false,

  -- Walinka — preparado para deep linking
  walinka_link_type           text,   -- null | catalog | category | product | collection | promotion
  walinka_link_ref            text,   -- ID o slug del destino en Walinka
  walinka_catalog_url         text,

  -- Targeting
  target_sector               text,
  category_key                text,
  tags                        text[],

  -- Analytics (contadores planos)
  views                       int NOT NULL DEFAULT 0,
  unique_views                int NOT NULL DEFAULT 0,
  whatsapp_clicks             int NOT NULL DEFAULT 0,
  catalog_clicks              int NOT NULL DEFAULT 0,
  share_count                 int NOT NULL DEFAULT 0,
  redemption_clicks           int NOT NULL DEFAULT 0,

  -- Distribución — estado de envío
  followers_notified_at       timestamptz,
  walinka_synced_at           timestamptz,

  -- Pulso y contexto en el momento de creación
  pulse_at_creation           text,
  days_inactive_at_creation   int,

  -- Snapshot para IA futura
  ai_context_snapshot         jsonb,

  -- URL pública
  slug                        text UNIQUE,

  -- Metadata
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  published_at                timestamptz
);

CREATE INDEX IF NOT EXISTS idx_commercial_actions_business_id ON commercial_actions(business_id);
CREATE INDEX IF NOT EXISTS idx_commercial_actions_status      ON commercial_actions(status);
CREATE INDEX IF NOT EXISTS idx_commercial_actions_ends_at     ON commercial_actions(ends_at);
CREATE INDEX IF NOT EXISTS idx_commercial_actions_featured    ON commercial_actions(featured);
CREATE INDEX IF NOT EXISTS idx_commercial_actions_created_at  ON commercial_actions(created_at DESC);

-- ─── action_images ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS action_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id     uuid NOT NULL REFERENCES commercial_actions(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  alt_text      text,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_images_action_id ON action_images(action_id);

-- ─── business_followers ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_followers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel         text NOT NULL DEFAULT 'app',   -- app | whatsapp
  whatsapp_number text,
  notify_actions  boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_followers_business_id ON business_followers(business_id);
CREATE INDEX IF NOT EXISTS idx_business_followers_user_id     ON business_followers(user_id);

-- ─── commercial_calendar ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commercial_calendar (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date         date NOT NULL,
  name         text NOT NULL,
  type         text NOT NULL,
  -- national_holiday | commercial_date | seasonal | payday | local_event | weather_event
  relevance    text[],  -- category_keys que más se benefician; vacío = todos
  lead_days    int NOT NULL DEFAULT 7,
  country      text NOT NULL DEFAULT 'CL',
  region       text,    -- null = nacional, 'BI' = Biobío
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_calendar_date ON commercial_calendar(date);

-- ─── Fechas comerciales 2026-2027 (Chile) ────────────────────────────────────
INSERT INTO commercial_calendar (date, name, type, relevance, lead_days, description) VALUES
  ('2026-01-01', 'Año Nuevo',             'national_holiday', ARRAY['gastronomia','bebidas'],           3,  'Celebración de inicio de año'),
  ('2026-02-14', 'Día de San Valentín',   'commercial_date',  ARRAY['regalos','flores','restaurantes'], 14, 'Día del amor. Ideal para regalos, flores y cenas románticas'),
  ('2026-03-08', 'Día de la Mujer',       'commercial_date',  ARRAY['ropa','belleza','flores'],         7,  'Celebración internacional de la mujer'),
  ('2026-03-21', 'Inicio del Otoño',      'seasonal',         ARRAY['ropa','calzado','hogar'],          14, 'Cambio de temporada. Ropa de abrigo y artículos de hogar'),
  ('2026-05-01', 'Día del Trabajo',       'national_holiday', ARRAY['gastronomia','entretenimiento'],   3,  'Feriado nacional'),
  ('2026-05-10', 'Día de la Madre',       'commercial_date',  ARRAY['flores','regalos','ropa','gastronomia'], 14, 'Una de las fechas comerciales más importantes del año'),
  ('2026-06-01', 'Pago de sueldos',       'payday',           ARRAY[]::text[],                          2,  'Inicio de mes — alto poder de compra'),
  ('2026-06-21', 'Inicio del Invierno',   'seasonal',         ARRAY['ropa','calzado','mascotas'],       14, 'Temporada de frío. Ropa de abrigo, calefacción, ropa para mascotas'),
  ('2026-07-01', 'Pago de sueldos',       'payday',           ARRAY[]::text[],                          2,  'Inicio de mes — alto poder de compra'),
  ('2026-08-01', 'Pago de sueldos',       'payday',           ARRAY[]::text[],                          2,  'Inicio de mes — alto poder de compra'),
  ('2026-08-16', 'Día del Niño',          'commercial_date',  ARRAY['juguetes','ropa','dulces','tecnologia'], 14, 'Tercer domingo de agosto. Alta demanda de juguetes y regalos para niños'),
  ('2026-09-01', 'Pago de sueldos',       'payday',           ARRAY[]::text[],                          2,  'Inicio de mes — alto poder de compra'),
  ('2026-09-18', 'Fiestas Patrias',       'national_holiday', ARRAY['gastronomia','bebidas','ropa'],    21, 'La fecha más importante del año en Chile. Gastronomía típica, chicha, empanadas'),
  ('2026-09-19', 'Día de las Glorias del Ejército', 'national_holiday', ARRAY['gastronomia'],           2,  'Feriado nacional'),
  ('2026-09-21', 'Inicio de la Primavera','seasonal',         ARRAY['ropa','flores','deportes'],        14, 'Cambio de temporada. Ropa liviana, actividad al aire libre'),
  ('2026-10-01', 'Pago de sueldos',       'payday',           ARRAY[]::text[],                          2,  'Inicio de mes — alto poder de compra'),
  ('2026-10-31', 'Halloween',             'commercial_date',  ARRAY['dulces','ropa','entretenimiento'], 7,  'Celebración de Halloween. Disfraces, dulces, decoración'),
  ('2026-11-01', 'Pago de sueldos',       'payday',           ARRAY[]::text[],                          2,  'Inicio de mes — alto poder de compra'),
  ('2026-11-27', 'Viernes Negro (Black Friday)', 'commercial_date', ARRAY[]::text[],                   14, 'Descuentos masivos. Alta expectativa de compra en todos los rubros'),
  ('2026-12-01', 'Pago de sueldos',       'payday',           ARRAY[]::text[],                          2,  'Inicio de mes — alto poder de compra'),
  ('2026-12-08', 'Inmaculada Concepción', 'national_holiday', ARRAY['gastronomia'],                    2,  'Feriado nacional'),
  ('2026-12-24', 'Nochebuena',            'commercial_date',  ARRAY['gastronomia','regalos','ropa'],   30, 'Víspera de Navidad. Alta demanda en todos los rubros'),
  ('2026-12-25', 'Navidad',              'national_holiday',  ARRAY['gastronomia','regalos'],          30, 'La fecha de mayor consumo del año'),
  ('2026-12-31', 'Año Nuevo (víspera)',   'commercial_date',  ARRAY['gastronomia','bebidas'],           7,  'Celebración de fin de año'),
  -- 2027
  ('2027-01-01', 'Año Nuevo',             'national_holiday', ARRAY['gastronomia','bebidas'],           3,  'Celebración de inicio de año'),
  ('2027-02-14', 'Día de San Valentín',   'commercial_date',  ARRAY['regalos','flores','restaurantes'], 14, 'Día del amor'),
  ('2027-05-09', 'Día de la Madre',       'commercial_date',  ARRAY['flores','regalos','ropa','gastronomia'], 14, 'Segundo domingo de mayo'),
  ('2027-08-15', 'Día del Niño',          'commercial_date',  ARRAY['juguetes','ropa','dulces'],        14, 'Tercer domingo de agosto'),
  ('2027-09-18', 'Fiestas Patrias',       'national_holiday', ARRAY['gastronomia','bebidas','ropa'],   21, 'Fiestas Patrias 2027'),
  ('2027-12-25', 'Navidad',              'national_holiday',  ARRAY['gastronomia','regalos'],          30, 'Navidad 2027')
ON CONFLICT DO NOTHING;

-- ─── business_pulse_history ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_pulse_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  pulse           text NOT NULL,   -- green | yellow | red | blue
  pulse_reason    text,
  views_7d        int NOT NULL DEFAULT 0,
  actions_active  int NOT NULL DEFAULT 0,
  followers       int NOT NULL DEFAULT 0,
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_pulse_history_business_id ON business_pulse_history(business_id);
CREATE INDEX IF NOT EXISTS idx_business_pulse_history_recorded_at ON business_pulse_history(recorded_at DESC);

-- ─── growth_advisor_log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth_advisor_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  suggestion_type   text NOT NULL,  -- calendar_event | reactivation | opportunity
  suggestion_text   text,
  calendar_event_id uuid REFERENCES commercial_calendar(id),
  shown_at          timestamptz NOT NULL DEFAULT now(),
  action_taken      text,  -- created_action | dismissed | ignored
  action_id         uuid REFERENCES commercial_actions(id)
);

CREATE INDEX IF NOT EXISTS idx_growth_advisor_log_business_id ON growth_advisor_log(business_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE commercial_actions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_images          ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_followers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_calendar    ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_pulse_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_advisor_log     ENABLE ROW LEVEL SECURITY;

-- commercial_actions: lectura pública de activas, escritura propia
CREATE POLICY "public_read_active_actions" ON commercial_actions
  FOR SELECT USING (status = 'active');

CREATE POLICY "owner_all_actions" ON commercial_actions
  FOR ALL USING (auth.uid() = user_id);

-- action_images: pública para imágenes de acciones activas
CREATE POLICY "public_read_action_images" ON action_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM commercial_actions ca WHERE ca.id = action_id AND ca.status = 'active')
  );

CREATE POLICY "owner_all_action_images" ON action_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM commercial_actions ca WHERE ca.id = action_id AND ca.user_id = auth.uid())
  );

-- business_followers: usuario ve y gestiona los suyos
CREATE POLICY "user_own_follows" ON business_followers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "public_read_follower_counts" ON business_followers
  FOR SELECT USING (true);

-- commercial_calendar: lectura pública
CREATE POLICY "public_read_calendar" ON commercial_calendar
  FOR SELECT USING (true);

-- business_pulse_history: solo el dueño
CREATE POLICY "owner_read_pulse" ON business_pulse_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "system_insert_pulse" ON business_pulse_history
  FOR INSERT WITH CHECK (true);

-- growth_advisor_log: solo el dueño
CREATE POLICY "owner_read_advisor_log" ON growth_advisor_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "system_all_advisor_log" ON growth_advisor_log
  FOR ALL USING (true);

-- ─── Función helper: incrementar contador de acción ───────────────────────────
CREATE OR REPLACE FUNCTION increment_action_counter(
  p_action_id uuid,
  p_column    text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE format(
    'UPDATE commercial_actions SET %I = %I + 1, updated_at = now() WHERE id = $1',
    p_column, p_column
  ) USING p_action_id;
END;
$$;

-- ─── Función: auto-generar slug en insert ─────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_action_slug() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base_slug text;
  candidate text;
  counter   int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base_slug := lower(regexp_replace(
    translate(NEW.title,
      'áéíóúàèìòùäëïöüâêîôûñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ',
      'aeiouaeiouaeiouaeiounaeiouaeiouaeiouaeioun'
    ),
    '[^a-z0-9]+', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'accion'; END IF;
  candidate := base_slug;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM commercial_actions WHERE slug = candidate);
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_action_slug ON commercial_actions;
CREATE TRIGGER trg_action_slug
  BEFORE INSERT ON commercial_actions
  FOR EACH ROW EXECUTE FUNCTION generate_action_slug();
