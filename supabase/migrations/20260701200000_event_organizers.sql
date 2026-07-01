-- ══════════════════════════════════════════════════════════════════════════════
-- Phase 0: event_organizers — entidad de primer nivel
--
-- Crea la tabla event_organizers como entidad independiente (no derivada de
-- negocios). Migra los negocios que ya tienen eventos publicados. Agrega
-- organizer_id a events y hace backfill. Mantiene organizer_business_id
-- intacto para compatibilidad con el código existente (se elimina en Phase 3).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Función auxiliar para generar slugs ──────────────────────────────────────
-- Convierte "Productora Sur 2" → "productora-sur-2"
-- Si hay colisión agrega el sufijo corto del UUID.

CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(input);
  result := regexp_replace(result, '[áàäâã]', 'a', 'g');
  result := regexp_replace(result, '[éèëê]',  'e', 'g');
  result := regexp_replace(result, '[íìïî]',  'i', 'g');
  result := regexp_replace(result, '[óòöôõ]', 'o', 'g');
  result := regexp_replace(result, '[úùüû]',  'u', 'g');
  result := regexp_replace(result, '[ñ]',     'n', 'g');
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '-+',  '-', 'g');
  result := trim(both '-' from result);
  RETURN COALESCE(NULLIF(result, ''), 'organizador');
END;
$$;

-- ── Tabla principal ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_organizers (

  -- Identificación
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,

  -- Vinculación (ambas opcionales — el organizador puede existir sin ninguna)
  user_id         UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  business_id     UUID UNIQUE REFERENCES public.businesses(id) ON DELETE SET NULL,
  -- UNIQUE en business_id: un negocio → máximo un organizador

  -- Tipo de organizador
  type            TEXT NOT NULL DEFAULT 'independent',
  -- Valores esperados: 'business' | 'institution' | 'club' | 'foundation'
  --                    'municipality' | 'independent'

  -- Perfil público
  description     TEXT,
  logo_url        TEXT,
  cover_url       TEXT,
  city            TEXT,
  address         TEXT,

  -- Contacto
  phone           TEXT,
  whatsapp        TEXT,
  email           TEXT,
  website         TEXT,

  -- Redes sociales
  social_links    JSONB NOT NULL DEFAULT '{}',
  -- Estructura: { "instagram": "...", "facebook": "...", "tiktok": "...",
  --               "youtube": "...", "twitter": "...", "linkedin": "..." }

  -- Moderación
  verified        BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active',
  -- Valores: 'pending' | 'active' | 'suspended' | 'rejected'
  rejection_reason TEXT,

  -- Monetización (reservado, no implementado aún)
  plan            TEXT NOT NULL DEFAULT 'free',
  -- Valores: 'free' | 'pro' | 'enterprise'
  plan_expires_at TIMESTAMPTZ,

  -- Estadísticas desnormalizadas (se mantienen con triggers futuros)
  total_events    INTEGER NOT NULL DEFAULT 0,
  upcoming_events INTEGER NOT NULL DEFAULT 0,
  follower_count  INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Índices ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_event_organizers_user_id
  ON public.event_organizers(user_id);

CREATE INDEX IF NOT EXISTS idx_event_organizers_business_id
  ON public.event_organizers(business_id);

CREATE INDEX IF NOT EXISTS idx_event_organizers_status
  ON public.event_organizers(status);

CREATE INDEX IF NOT EXISTS idx_event_organizers_verified
  ON public.event_organizers(verified);

CREATE INDEX IF NOT EXISTS idx_event_organizers_plan
  ON public.event_organizers(plan);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.event_organizers ENABLE ROW LEVEL SECURITY;

-- Público: puede leer organizadores activos
CREATE POLICY "public_read_active_organizers"
ON public.event_organizers FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- Propietario: puede leer el suyo sin importar estado
CREATE POLICY "owner_read_own_organizer"
ON public.event_organizers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Propietario: puede actualizar su propio organizador
CREATE POLICY "owner_update_organizer"
ON public.event_organizers FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Usuario autenticado: puede crear un organizador
CREATE POLICY "auth_insert_organizer"
ON public.event_organizers FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admin: acceso completo
CREATE POLICY "admin_all_organizers"
ON public.event_organizers FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ── Backfill: migrar negocios que ya tienen eventos ───────────────────────────
-- Solo migra los negocios que tienen al menos un evento con organizer_business_id.
-- Negocios sin eventos no se tocan — el organizador solo existe si ya organizó algo
-- o si el usuario lo crea explícitamente en el futuro.

INSERT INTO public.event_organizers (
  user_id,
  business_id,
  name,
  slug,
  type,
  description,
  logo_url,
  phone,
  whatsapp,
  email,
  website,
  social_links,
  verified,
  status
)
SELECT DISTINCT ON (b.id)
  b.owner_id,
  b.id,
  b.name,
  -- Slug inicial desde el nombre; si colisiona se le agrega el sufijo corto del UUID
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.event_organizers eo2
      WHERE eo2.slug = public.slugify(b.name)
    )
    THEN public.slugify(b.name)
    ELSE public.slugify(b.name) || '-' || LEFT(b.id::text, 8)
  END,
  'business',
  b.description,
  b.logo_url,
  b.phone,
  b.whatsapp,
  b.email,
  b.website,
  COALESCE(b.social_links, '{}'),
  b.verified,
  'active'
FROM public.businesses b
WHERE EXISTS (
  SELECT 1 FROM public.events e
  WHERE e.organizer_business_id = b.id
)
ON CONFLICT (business_id) DO NOTHING;  -- idempotente si se re-ejecuta

-- ── Agregar organizer_id a events ─────────────────────────────────────────────

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_id UUID
  REFERENCES public.event_organizers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_organizer_id
  ON public.events(organizer_id);

-- ── Backfill: conectar eventos existentes con su nuevo organizador ────────────

UPDATE public.events e
SET organizer_id = eo.id
FROM public.event_organizers eo
WHERE eo.business_id = e.organizer_business_id
  AND e.organizer_business_id IS NOT NULL
  AND e.organizer_id IS NULL;

-- ── Trigger: updated_at automático ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_organizers_updated_at ON public.event_organizers;
CREATE TRIGGER trg_event_organizers_updated_at
  BEFORE UPDATE ON public.event_organizers
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Verificación ─────────────────────────────────────────────────────────────
-- Estas queries son solo para validar manualmente después de ejecutar.
-- Ejecutar en el SQL editor de Supabase:
--
-- SELECT COUNT(*) FROM event_organizers;
-- → debe coincidir con la cantidad de negocios distintos que tenían eventos
--
-- SELECT COUNT(*) FROM events WHERE organizer_business_id IS NOT NULL AND organizer_id IS NULL;
-- → debe ser 0 (todos los eventos con negocio tienen su organizer_id)
--
-- SELECT COUNT(*) FROM events WHERE organizer_id IS NOT NULL;
-- → debe coincidir con los eventos que tenían organizer_business_id
