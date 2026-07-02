-- city_id en daily_post_tracking — caso especial de la Fase B.
-- Depende de 20260601000001_create_community_cities.sql.
--
-- IMPORTANTE (ver docs/plan-fase-a-b.md para el detalle completo):
-- esta migración agrega la columna y un nuevo índice único que la incluye,
-- pero NO elimina el índice único viejo (sin city_id) y NO toca las
-- funciones RPC check_post_cooldown / check_daily_post_limit /
-- increment_daily_post_count. Esas funciones siguen contando publicaciones
-- SIN distinguir ciudad después de esta migración — el límite diario /
-- cooldown anti-spam sigue siendo GLOBAL entre ciudades hasta que una fase
-- posterior actualice esas 3 funciones para usar city_id y recién ahí se
-- elimine el índice viejo. Con una sola ciudad activa esto no tiene ningún
-- efecto observable hoy; hay que resolverlo antes de activar una segunda
-- ciudad (Fase E), no antes de esta migración.

DO $$
DECLARE
  v_coronel_id UUID;
BEGIN
  SELECT id INTO v_coronel_id FROM public.community_cities WHERE slug = 'coronel';
  IF v_coronel_id IS NULL THEN
    RAISE EXCEPTION 'No existe la ciudad "coronel" en community_cities — aplicar 20260601000001 primero.';
  END IF;

  ALTER TABLE public.daily_post_tracking
    ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);

  UPDATE public.daily_post_tracking SET city_id = v_coronel_id WHERE city_id IS NULL;
END $$;

-- Índice único nuevo, incluyendo city_id. El índice viejo
-- (idx_daily_post_tracking_unique, sin city_id) se deja intacto a propósito
-- — ver nota arriba.
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_post_tracking_unique_by_city
    ON public.daily_post_tracking (identifier, identifier_type, city_id, post_date);
