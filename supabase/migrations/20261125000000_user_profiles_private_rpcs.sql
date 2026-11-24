-- Paso 1 de 2 (aditivo, no rompe nada): RPC para leer datos privados de user_profiles
-- sin depender de la política public_read_user_profiles USING (true).
--   get_my_profile()               -> fila completa del usuario autenticado (email, phone, role...)
--   admin_get_user_contacts(uuid[]) -> email y phone de otros usuarios, solo admins por app_metadata.
-- Aplicar ANTES de desplegar el frontend; el frontend cae a select('*') si aún no existen.
-- Rollback: supabase/rollback/20261125000000_user_profiles_private_rpcs_down.sql

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.user_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.* FROM public.user_profiles p WHERE p.id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_profile() IS
  'Perfil completo del usuario autenticado. Sustituye a select(*) sobre user_profiles.';

CREATE OR REPLACE FUNCTION public.admin_get_user_contacts(p_user_ids uuid[])
RETURNS TABLE (id uuid, email text, phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Comprobación explícita sobre auth.users.raw_app_meta_data (solo la escribe el servidor
  -- con la service role). No se delega en is_admin() para no depender de cómo esté
  -- definida en producción; user_metadata y user_profiles.role NO cuentan.
  IF NOT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
      AND au.raw_app_meta_data ->> 'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo un administrador puede ver datos de contacto de usuarios'
      USING ERRCODE = '42501';
  END IF;
  IF coalesce(cardinality(p_user_ids), 0) > 1000 THEN
    RAISE EXCEPTION 'Demasiados usuarios en una sola consulta (máximo 1000)'
      USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.phone
    FROM public.user_profiles p
    WHERE p.id = ANY (p_user_ids);
END;
$$;

COMMENT ON FUNCTION public.admin_get_user_contacts(uuid[]) IS
  'Email y teléfono de los usuarios indicados. Solo admins (auth.users.raw_app_meta_data.role = admin).';

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_user_contacts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_contacts(uuid[]) TO authenticated;
