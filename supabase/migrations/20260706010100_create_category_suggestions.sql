-- Tabla no destructiva para sugerencias de categorias de negocio.
-- No implementa aprobacion automatica ni reasigna negocios.

CREATE TABLE IF NOT EXISTS public.category_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  suggested_name TEXT NOT NULL,
  fallback_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_suggestions_business_id
ON public.category_suggestions (business_id);

CREATE INDEX IF NOT EXISTS idx_category_suggestions_user_id
ON public.category_suggestions (user_id);

CREATE INDEX IF NOT EXISTS idx_category_suggestions_status
ON public.category_suggestions (status);

CREATE INDEX IF NOT EXISTS idx_category_suggestions_fallback_category_id
ON public.category_suggestions (fallback_category_id);

ALTER TABLE public.category_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_category_suggestions" ON public.category_suggestions;
CREATE POLICY "users_read_own_category_suggestions"
ON public.category_suggestions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_category_suggestions" ON public.category_suggestions;
CREATE POLICY "users_insert_own_category_suggestions"
ON public.category_suggestions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_category_suggestions" ON public.category_suggestions;
CREATE POLICY "admin_manage_category_suggestions"
ON public.category_suggestions
FOR ALL TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
