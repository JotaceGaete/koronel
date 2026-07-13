-- SECURITY HOTFIX (parte 2) — no aplicado a ninguna base de datos por esta
-- migración en sí; requiere ejecución manual controlada, igual que
-- 20260713000000_secure_admin_role_check.sql.
--
-- Problema: public.user_profiles.role es una columna normal, y la única
-- policy de escritura existente es:
--
--   CREATE POLICY "users_manage_own_user_profiles"
--   ON public.user_profiles FOR ALL TO authenticated
--   USING (id = auth.uid()) WITH CHECK (id = auth.uid());
--
-- "FOR ALL ... USING (id = auth.uid())" solo controla DE QUIÉN es la fila,
-- no QUÉ columnas se pueden tocar. Cualquier usuario autenticado puede
-- hacer supabase.from('user_profiles').update({ role: 'admin' }) sobre su
-- propia fila y quedar admin, sin tocar auth.users en absoluto — un
-- segundo camino de escalación de privilegios, independiente del que
-- corrige 20260713000000_secure_admin_role_check.sql (que solo cubre
-- raw_user_meta_data en auth.users).
--
-- RLS de Postgres no distingue columnas dentro de una policy (no existe
-- "WITH CHECK" que compare NEW.role contra OLD.role sin un trigger
-- aparte). El mecanismo correcto y ya soportado nativamente es el
-- privilegio de columna de SQL estándar: revocar UPDATE/INSERT a nivel de
-- tabla para el rol authenticated y volver a otorgarlo solo sobre las
-- columnas que un usuario puede legítimamente autoeditar. role queda
-- fuera de esa lista en ambos casos.
--
-- No borra ni modifica ninguna fila existente. No cambia SELECT (sigue
-- gobernado por las policies "public_read_user_profiles" y
-- "admin_read_user_profiles", que no se tocan). No cambia DELETE.

-- ============================================================
-- 1. REEMPLAZAR LA POLICY "FOR ALL" POR INSERT/UPDATE SEPARADOS
-- ============================================================
-- Mismo alcance de fila que antes (id = auth.uid()) para INSERT y UPDATE;
-- la restricción de columnas se aplica abajo vía GRANT/REVOKE, no acá,
-- porque RLS no puede expresarla.
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;

DROP POLICY IF EXISTS "users_insert_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_insert_own_user_profiles"
ON public.user_profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_update_own_user_profiles"
ON public.user_profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_delete_own_user_profiles"
ON public.user_profiles FOR DELETE TO authenticated
USING (id = auth.uid());

-- ============================================================
-- 2. PRIVILEGIOS DE COLUMNA: quitar el permiso amplio, dar uno acotado
-- ============================================================
-- El proyecto Supabase ya trae, por defecto, GRANT INSERT/UPDATE a nivel
-- de tabla para "authenticated". Un GRANT (columnas) adicional NO reduce
-- ese permiso amplio -- los privilegios de Postgres son aditivos-- por
-- eso el REVOKE de tabla completa es obligatorio antes de otorgar el
-- permiso acotado.
REVOKE INSERT, UPDATE ON public.user_profiles FROM authenticated;

-- INSERT: columnas con las que ya trabaja el trigger de alta
-- (handle_new_user) más las que el propio usuario podría fijar en un
-- alta manual. role queda fuera -- toda fila nueva usa su DEFAULT 'user'.
GRANT INSERT (id, email, full_name, phone, location, avatar_url, email_notifications)
ON public.user_profiles TO authenticated;

-- UPDATE: solo los campos de perfil que ya edita la UI
-- (AccountSettingsTab, AuthContext.updateProfile). id/email/role/
-- created_at/updated_at quedan fuera -- identidad, privilegio y campos
-- administrados por trigger no son autoeditables por columna.
GRANT UPDATE (full_name, phone, location, avatar_url, email_notifications)
ON public.user_profiles TO authenticated;

-- Nota: el trigger handle_new_user() es SECURITY DEFINER y corre con los
-- privilegios de su dueño (no "authenticated"), así que el alta
-- automática de perfil en el signup no depende de este GRANT y sigue
-- funcionando igual.

-- ============================================================
-- 3. RPC SEGURA PARA CAMBIAR EL ROL -- único camino legítimo
-- ============================================================
-- SECURITY DEFINER + chequeo interno de is_admin(): el privilegio real de
-- escribir la columna role lo tiene el dueño de la función, no quien la
-- llama: cualquier "authenticated" puede invocarla, pero la función
-- misma rechaza a quien no sea admin antes de tocar la fila.
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id UUID, p_role TEXT)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.user_profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado: se requiere rol admin.' USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Rol inválido: %. Valores permitidos: user, admin.', p_role;
  END IF;

  UPDATE public.user_profiles
  SET role = p_role
  WHERE id = p_user_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'No existe user_profiles.id = %', p_user_id;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;

-- service_role ya tiene bypass de RLS/GRANTs por diseño de Supabase --
-- no necesita un GRANT explícito para seguir pudiendo cambiar role
-- directamente si algún proceso de backend/admin ya lo hace así.
