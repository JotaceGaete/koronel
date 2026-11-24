-- Rollback del paso 1. Ejecutar solo si el paso 2 ya se revirtió (el frontend nuevo
-- cae a select('*') cuando las RPC no existen, así que no se rompe).
DROP FUNCTION IF EXISTS public.admin_get_user_contacts(uuid[]);
DROP FUNCTION IF EXISTS public.get_my_profile();
