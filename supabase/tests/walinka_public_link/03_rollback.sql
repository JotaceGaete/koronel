DROP FUNCTION IF EXISTS public.get_public_walinka_link(uuid);
SELECT 'rollback OK: función eliminada' AS resultado, to_regprocedure('public.get_public_walinka_link(uuid)') IS NULL AS eliminada;
SELECT md5(string_agg(t::text, '|' ORDER BY id)) AS hash_wa_businesses FROM public.wa_businesses t;
