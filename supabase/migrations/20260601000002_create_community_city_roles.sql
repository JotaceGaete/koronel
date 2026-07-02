-- Roles por ciudad. Reemplaza (progresivamente, no todavía) el is_admin() global.
-- Depende de 20260601000001_create_community_cities.sql (FK a community_cities).
-- Ver docs/diseno-multi-ciudad.md y docs/plan-fase-a-b.md.

CREATE TABLE IF NOT EXISTS public.community_city_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES public.community_cities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (city_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_community_city_roles_city_id ON public.community_city_roles(city_id);
CREATE INDEX IF NOT EXISTS idx_community_city_roles_user_id ON public.community_city_roles(user_id);

ALTER TABLE public.community_city_roles ENABLE ROW LEVEL SECURITY;

-- Un usuario puede ver sus propios roles (la app lo necesita para saber "soy admin de esta ciudad").
DROP POLICY IF EXISTS "users_read_own_city_roles" ON public.community_city_roles;
CREATE POLICY "users_read_own_city_roles"
ON public.community_city_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- is_admin() (global, existente) puede ver y gestionar todos los roles, como gate interino.
DROP POLICY IF EXISTS "admin_manage_community_city_roles" ON public.community_city_roles;
CREATE POLICY "admin_manage_community_city_roles"
ON public.community_city_roles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Seed: otorgar rol 'admin' de Coronel a todo usuario que YA cumpla la
-- condición de admin global existente (misma condición que is_admin()/
-- is_admin_user()). No depende de conocer un email específico: sea quien
-- sea el/los admin(es) reales hoy en este entorno, quedan cubiertos.
INSERT INTO public.community_city_roles (city_id, user_id, role)
SELECT cc.id, au.id, 'admin'
FROM public.community_cities cc
CROSS JOIN auth.users au
WHERE cc.slug = 'coronel'
  AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
ON CONFLICT (city_id, user_id, role) DO NOTHING;
