-- Administración de "Servicios para la comunidad" — 100% aditivo.
--
-- No se elimina ninguna columna ni tabla. No cambia el significado de
-- ningún dato existente. Los cambios de constraint (slug único,
-- estados de reportes, FK de reportes) solo agregan reglas nuevas o
-- vuelven más estricto un comportamiento futuro (RESTRICT en vez de
-- CASCADE) — no tocan filas ya guardadas.

-- ============================================================
-- 1. public_services — columnas nuevas para el formulario admin
-- ============================================================
ALTER TABLE public.public_services ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.public_services ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.public_services ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Único cuando existe; permite múltiples NULL (el slug no es
-- estrictamente obligatorio, solo nombre y categoría lo son).
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_services_slug_unique
  ON public.public_services(slug)
  WHERE slug IS NOT NULL;

-- Backfill de slug para las filas sembradas en la migración anterior
-- (join en el listado admin es más legible con slug ya poblado).
-- Reemplazo manual de acentos comunes en español + limpieza básica;
-- no depende de la extensión unaccent (puede no estar habilitada).
UPDATE public.public_services
SET slug = trim(both '-' from regexp_replace(
  lower(
    translate(name,
      'áéíóúÁÉÍÓÚñÑüÜ',
      'aeiouAEIOUnNuU'
    )
  ),
  '[^a-z0-9]+', '-', 'g'
))
WHERE slug IS NULL;

-- ============================================================
-- 2. public_service_reports — columnas para la pantalla de revisión
-- ============================================================
ALTER TABLE public.public_service_reports ADD COLUMN IF NOT EXISTS issue_type TEXT;
ALTER TABLE public.public_service_reports ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Amplía los estados posibles (antes: pending/reviewed/resolved).
ALTER TABLE public.public_service_reports DROP CONSTRAINT IF EXISTS public_service_reports_status_check;
ALTER TABLE public.public_service_reports ADD CONSTRAINT public_service_reports_status_check
  CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

-- Antes ON DELETE CASCADE: borrar un servicio borraba en silencio su
-- historial de reportes. Con RESTRICT, la base de datos rechaza el
-- borrado físico de un servicio mientras tenga reportes asociados —
-- hay que resolverlos/descartarlos (o simplemente desactivar el
-- servicio, que no borra nada) antes de poder eliminarlo.
ALTER TABLE public.public_service_reports DROP CONSTRAINT IF EXISTS public_service_reports_service_id_fkey;
ALTER TABLE public.public_service_reports ADD CONSTRAINT public_service_reports_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES public.public_services(id) ON DELETE RESTRICT;
