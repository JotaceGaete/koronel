-- Profesionales / Oficios — recuperado desde claude/vibrant-bohr-098sv5
-- (rama no fusionada donde se construyó originalmente), consolidado en
-- una sola migración con timestamp nuevo. No se reutilizan los
-- timestamps ni el historial de esa rama.
-- Ver docs/recuperacion-profesionales-oficios.md para el diagnóstico
-- completo y qué se dejó fuera a propósito (Wallet, Cuentas,
-- event_organizers, Walinka, acciones comerciales — nada de eso se
-- trae, no es necesario para esta función).
--
-- Contrato:
--   Profesionales = classified_ads.listing_type = 'oficio'
--   Clasificados  = todo aviso que no sea 'oficio'
--
-- 100% aditivo. listing_type tiene NOT NULL DEFAULT 'venta' y se
-- backfillea explícitamente, así que ningún aviso existente cambia de
-- categoría ni se pierde de /classified-ads-listing.

-- 1. listing_type — distingue avisos de venta de fichas de profesional.
--    (el valor 'oferta' se deja habilitado en el CHECK por si en el
--    futuro se recupera esa función también, pero nada en esta
--    migración ni en el código recuperado la genera todavía).
ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'venta'
  CHECK (listing_type IN ('venta', 'oficio', 'oferta'));

UPDATE public.classified_ads
  SET listing_type = 'venta'
  WHERE listing_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_classified_ads_listing_type
  ON public.classified_ads(listing_type);

-- 2. Campos de precio/disponibilidad para fichas de profesional.
ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS price_type TEXT;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS schedule_note TEXT;

ALTER TABLE public.classified_ads
  DROP CONSTRAINT IF EXISTS classified_ads_price_type_check;

ALTER TABLE public.classified_ads
  ADD CONSTRAINT classified_ads_price_type_check
  CHECK (price_type IN ('free_quote', 'visit', 'from', 'hourly', 'negotiable'));

-- 3. Identidad del profesional ("se contrata a una persona, no un aviso").
--    Nullable a nivel de base — la validación de obligatoriedad para
--    oficios vive en el formulario, no en la DB, para no afectar avisos
--    de venta/oferta existentes.
ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS provider_name TEXT;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS provider_last_name TEXT;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS provider_display_name TEXT;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS ratings_enabled BOOLEAN NOT NULL DEFAULT false;

-- 4. Señales de confianza — visibles de un vistazo en la tarjeta.
ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS available_urgency BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS weekend_service BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS issues_invoice BOOLEAN NOT NULL DEFAULT false;

-- Verificación manual por admin ("Koronel verificó que este profesional
-- existe"). Sin flujo de moderación todavía — se activa directo desde
-- el panel admin.
ALTER TABLE public.classified_ads
  ADD COLUMN IF NOT EXISTS provider_verified BOOLEAN NOT NULL DEFAULT false;

-- 5. Separación explícita entre foto de perfil y fotos de portafolio.
--    Antes se usaba la posición (is_primary / índice 0) como proxy —
--    frágil. Ahora cada fila declara su intención. Filas existentes
--    quedan 'portfolio' por default; no se puede recuperar
--    retroactivamente cuál era "la" foto de perfil de un aviso viejo.
ALTER TABLE public.ad_images
  ADD COLUMN IF NOT EXISTS image_type TEXT NOT NULL DEFAULT 'portfolio'
  CHECK (image_type IN ('profile', 'portfolio'));

CREATE INDEX IF NOT EXISTS idx_ad_images_image_type
  ON public.ad_images(ad_id, image_type);
