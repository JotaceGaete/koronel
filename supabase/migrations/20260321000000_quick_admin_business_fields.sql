-- Fields for quick admin entry and incomplete business tracking
-- created_by = admin user who created the record; source = 'quick_admin' for ingreso rápido

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_businesses_source ON public.businesses(source);
CREATE INDEX IF NOT EXISTS idx_businesses_created_by ON public.businesses(created_by);

COMMENT ON COLUMN public.businesses.source IS 'e.g. quick_admin for ingreso rápido; null for normal flow';
COMMENT ON COLUMN public.businesses.admin_notes IS 'Private note visible only to admins';
