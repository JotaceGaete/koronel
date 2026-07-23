-- Corrige un permiso de más en las 3 RPCs de PR-K1
-- (20260723160000_business_walinka_links.sql): "REVOKE ALL ... FROM
-- PUBLIC" no retira privilegios otorgados directamente a un rol
-- específico como anon. En este proyecto Supabase existe una regla de
-- privilegios por defecto (ALTER DEFAULT PRIVILEGES ... GRANT ... TO
-- anon, authenticated) que otorga EXECUTE a anon automáticamente al
-- crear cada función nueva en public, antes de que corra el
-- "REVOKE ALL FROM PUBLIC" + "GRANT TO authenticated" de la migración
-- original — por eso anon quedó con EXECUTE pese al REVOKE ALL.
--
-- Verificado en producción: antes de este fix, anon tenía EXECUTE en
-- las 3 funciones de abajo; después, solo authenticated (y el dueño,
-- postgres/service_role).
--
-- No toca tablas, RLS ni datos. No recrea ninguna función. No afecta a
-- PR-W1 (sus 3 funciones ya estaban correctas, sin anon).

REVOKE EXECUTE ON FUNCTION public.get_business_walinka_link_status(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_business_walinka_link(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_business_walinka_link(UUID) FROM anon;
