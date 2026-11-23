-- =====================================================================
-- Koronel ↔ Walinka: lectura pública del catálogo vinculado
-- ---------------------------------------------------------------------
-- ESTADO: PROPUESTA. NO APLICADA EN PRODUCCIÓN.
-- Aplicar solo con autorización expresa del responsable del proyecto.
--
-- Qué hace:
--   Crea UNA función de solo lectura que la ficha pública de Koronel usa
--   para saber si mostrar el botón «Ver catálogo y pedir por WhatsApp».
--
-- Qué NO hace:
--   - No crea ni modifica tablas, columnas, índices, políticas RLS ni
--     funciones existentes (ni de Koronel ni de Walinka).
--   - No escribe datos.
--
-- Decisiones de seguridad:
--   * SECURITY DEFINER: necesario porque la RLS de business_walinka_links
--     solo permite leer al dueño/admin y anon no puede ejecutar
--     wa_resolve_catalog_url. La función compensa devolviendo solo datos
--     que ya son públicos (nombre del catálogo y su URL pública oficial).
--   * search_path = '' y todos los objetos calificados con su esquema:
--     evita que un objeto homónimo en otro esquema secuestre la ejecución.
--   * Consulta por UUID de un negocio ajeno: es el caso de uso esperado
--     (ficha pública). Solo responde si el negocio Koronel está publicado
--     (status published/premium, igual que su política pública), el vínculo
--     está 'connected', el catálogo Walinka está activo y tiene URL pública.
--     No devuelve IDs de Walinka, dueños, emails, fechas ni estado interno.
--     En cualquier otro caso devuelve 0 filas (sin distinguir el motivo).
--   * La URL se calcula con wa_resolve_catalog_url (dominio propio activo o
--     https://miralatienda.de/catalogo/<slug>) y además se exige https://.
--   * EXECUTE: se revoca de PUBLIC y se concede solo a anon y authenticated.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_public_walinka_link(p_koronel_business_id uuid)
RETURNS TABLE (walinka_name text, public_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wb.name::text AS walinka_name,
         r.public_url::text AS public_url
  FROM public.business_walinka_links bwl
  JOIN public.businesses b
    ON b.id = bwl.koronel_business_id
   AND b.status IN ('published', 'premium')
  JOIN public.wa_businesses wb
    ON wb.id = bwl.walinka_business_id
   AND wb.is_active IS TRUE
  CROSS JOIN LATERAL public.wa_resolve_catalog_url(wb.id) AS r
  WHERE p_koronel_business_id IS NOT NULL
    AND bwl.koronel_business_id = p_koronel_business_id
    AND bwl.connection_status = 'connected'
    AND r.public_url IS NOT NULL
    AND r.public_url ~ '^https://[A-Za-z0-9.-]+(/[A-Za-z0-9._~%/-]*)?$'
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_public_walinka_link(uuid) IS
  'Koronel: devuelve nombre y URL pública del catálogo Walinka vinculado a un negocio publicado, solo si el vínculo y el catálogo están activos. Solo lectura.';

REVOKE ALL ON FUNCTION public.get_public_walinka_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_walinka_link(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Verificación posterior (solo lectura), para ejecutar tras aplicar:
--
--   SELECT p.prosecdef, p.proconfig,
--          has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
--   FROM pg_proc p WHERE p.oid = 'public.get_public_walinka_link(uuid)'::regprocedure;
--   -- Esperado: true, {search_path=""}, true, true
--
--   SELECT * FROM public.get_public_walinka_link('00000000-0000-0000-0000-000000000000');
--   -- Esperado: 0 filas
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.get_public_walinka_link(uuid);
-- ---------------------------------------------------------------------
