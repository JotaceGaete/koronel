\pset footer off
\echo '== Permisos y configuración =='
SELECT p.prosecdef AS security_definer, p.proconfig, p.provolatile,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec,
  (SELECT count(*) FROM aclexplode(p.proacl) a WHERE a.grantee = 0) AS public_grants
FROM pg_proc p WHERE p.oid = 'public.get_public_walinka_link(uuid)'::regprocedure;

\echo '== Casos como anon =='
SET ROLE anon;
SELECT 'anon no lee la tabla de vínculos (RLS)' AS caso, count(*) AS filas FROM public.business_walinka_links;
SELECT '1 vínculo activo + negocio publicado' caso, * FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000001');
SELECT '2 negocio pendiente (esperado 0 filas)' caso, count(*) FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000002');
SELECT '3 vínculo revocado (esperado 0 filas)' caso, count(*) FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000003');
SELECT '4 catálogo inactivo (esperado 0 filas)' caso, count(*) FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000004');
SELECT '5 dominio propio activo (premium)' caso, * FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000005');
SELECT '6 negocio sin vínculo (esperado 0 filas)' caso, count(*) FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000006');
SELECT '7 catálogo sin slug ni dominio (esperado 0 filas)' caso, count(*) FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000007');
SELECT '8 dominio con caracteres inválidos (esperado 0 filas)' caso, count(*) FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000008');
SELECT '9 UUID inexistente (esperado 0 filas)' caso, count(*) FROM public.get_public_walinka_link('99999999-9999-9999-9999-999999999999');
SELECT '10 NULL (esperado 0 filas)' caso, count(*) FROM public.get_public_walinka_link(NULL);
\echo '== Columnas devueltas (no expone ids, dueños ni emails) =='
SELECT string_agg(a.attname, ', ' ORDER BY a.attnum) AS columnas
FROM pg_proc p, unnest(p.proargnames, p.proargmodes) WITH ORDINALITY AS a(attname, mode, attnum)
WHERE p.oid = 'public.get_public_walinka_link(uuid)'::regprocedure AND a.mode = 't';
RESET ROLE;

\echo '== Casos como authenticated (usuario ajeno a2 consultando negocio de a1) =='
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
SELECT 'authenticated ajeno: mismo resultado público' caso, * FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000001');
SELECT 'authenticated ajeno: negocio pendiente (0 filas)' caso, count(*) FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000002');
RESET ROLE;

\echo '== Revocar elimina el enlace y permite revincular =='
UPDATE public.business_walinka_links SET connection_status='revoked', revoked_at=now() WHERE koronel_business_id='10000000-0000-0000-0000-000000000001' AND connection_status='connected';
SET ROLE anon; SELECT 'tras revocar (esperado 0 filas)' caso, count(*) FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000001'); RESET ROLE;
INSERT INTO public.business_walinka_links(koronel_business_id,walinka_business_id,connection_status,connected_at) VALUES ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','connected',now());
SET ROLE anon; SELECT 'tras revincular' caso, * FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000001'); RESET ROLE;

\echo '== search_path: un objeto homónimo en pg_temp/otro esquema no la secuestra =='
CREATE SCHEMA evil; CREATE TABLE evil.business_walinka_links (LIKE public.business_walinka_links);
SET search_path = evil, public;
SET ROLE anon; SELECT 'con search_path hostil' caso, * FROM public.get_public_walinka_link('10000000-0000-0000-0000-000000000005'); RESET ROLE;
RESET search_path;

\echo '== La función no escribe: datos de Walinka intactos =='
SELECT md5(string_agg(t::text, '|' ORDER BY id)) AS hash_wa_businesses FROM public.wa_businesses t;
