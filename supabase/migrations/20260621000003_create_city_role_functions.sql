-- Funciones de rol por ciudad. Nuevas, no reemplazan is_admin() todavía.
-- No se usan en ninguna política existente en esta migración.
-- Depende de 20260621000002_create_community_city_roles.sql.
-- Ver docs/diseno-multi-ciudad.md y docs/plan-fase-a-b.md.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'platform_role') = 'super_admin', false)
$$;

CREATE OR REPLACE FUNCTION public.is_city_admin(p_city_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.community_city_roles cr
    WHERE cr.city_id = p_city_id AND cr.user_id = auth.uid() AND cr.role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_city_moderator(p_city_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_city_admin(p_city_id) OR EXISTS (
    SELECT 1 FROM public.community_city_roles cr
    WHERE cr.city_id = p_city_id AND cr.user_id = auth.uid() AND cr.role = 'moderator'
  )
$$;
