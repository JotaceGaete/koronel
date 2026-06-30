-- Explicit separation between a provider's profile photo and their portfolio images.
-- Previously, position (is_primary / index 0) was used as a proxy, which is fragile.
-- Now every row declares its intent.
--
-- Existing rows default to 'portfolio'. The profile photo for legacy oficios rows
-- cannot be recovered automatically — they will show no profile avatar until re-uploaded.
-- New uploads from PostOficioForm will always set image_type explicitly.

ALTER TABLE public.ad_images
  ADD COLUMN IF NOT EXISTS image_type TEXT NOT NULL DEFAULT 'portfolio'
  CHECK (image_type IN ('profile', 'portfolio'));

CREATE INDEX IF NOT EXISTS idx_ad_images_image_type
  ON public.ad_images(ad_id, image_type);
