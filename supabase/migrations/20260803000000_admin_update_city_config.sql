-- admin_update_city_config: actualiza la configuración de una ciudad ya
-- existente (cities + community_cities, ya vinculadas por community_city_id
-- desde F1-A0) en una sola llamada. Bloque 1 del MVP "Editar Coronel desde
-- el panel".
--
-- A diferencia de la RPC de creación diseñada en C2 (pausada, no aplicada),
-- esta función NO crea ciudades ni resuelve conflictos por slug — solo
-- actualiza una fila que ya existe en ambas tablas. Si no existe, falla
-- explícitamente en vez de crear nada.
--
-- Un parámetro NULL conserva el valor existente, nunca lo borra. Los 5
-- campos de portada/marca visual (título, subtítulo, placeholder, texto de
-- footer, color principal) se guardan dentro de community_cities.theme
-- (JSONB ya existente), fusionando solo las claves provistas — nunca se
-- pisan las claves existentes que esta función no recibe.
--
-- No incluye campos de ubicación (lat/lng): el alcance de este MVP, según
-- los 11 campos pedidos, no los incluye.
--
-- Corrección tras revisión crítica de la primera versión de este archivo
-- (dos hallazgos bloqueantes):
--   1. Ambigüedad SQL real: RETURNS TABLE declaraba una columna de salida
--      llamada community_city_id, y varias referencias sin calificar a esa
--      misma cadena (en el WHERE de un UPDATE y en un EXISTS) eran
--      ambiguas entre esa variable de salida y la columna real de
--      cities.community_city_id. Con plpgsql.variable_conflict = error
--      (el valor por defecto), esto habría fallado en tiempo de ejecución.
--      Se corrige renombrando las columnas de salida (out_cities_id,
--      out_community_city_id) y calificando explícitamente con alias
--      (c./cc.) cada referencia a columna en todo el cuerpo de la función
--      — ninguna resolución implícita de nombres.
--   2. La primera versión abrió GRANT INSERT/UPDATE + policies de
--      escritura directa sobre cities para el rol authenticated. Eso
--      contradice la decisión de que esta RPC sea el único camino de
--      escritura. Se reemplaza por SECURITY DEFINER + validación interna
--      de is_admin() + GRANT EXECUTE únicamente sobre la función — sin
--      ningún GRANT ni policy de escritura directa nueva sobre cities ni
--      community_cities.

CREATE OR REPLACE FUNCTION public.admin_update_city_config(
  p_community_city_id UUID,
  p_city_name TEXT DEFAULT NULL,
  p_brand_name TEXT DEFAULT NULL,
  p_country_name TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_seo_description TEXT DEFAULT NULL,
  p_hero_title TEXT DEFAULT NULL,
  p_hero_subtitle TEXT DEFAULT NULL,
  p_search_placeholder TEXT DEFAULT NULL,
  p_footer_text TEXT DEFAULT NULL,
  p_color_primary TEXT DEFAULT NULL
)
RETURNS TABLE (out_cities_id UUID, out_community_city_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cities_id UUID;
  v_theme JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_update_city_config: solo administradores pueden ejecutar esta función';
  END IF;

  IF p_community_city_id IS NULL THEN
    RAISE EXCEPTION 'admin_update_city_config: p_community_city_id es obligatorio';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_cities AS cc WHERE cc.id = p_community_city_id
  ) THEN
    RAISE EXCEPTION 'admin_update_city_config: no existe community_cities.id = %', p_community_city_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cities AS c WHERE c.community_city_id = p_community_city_id
  ) THEN
    RAISE EXCEPTION 'admin_update_city_config: no existe cities.community_city_id = % — esta función solo actualiza ciudades ya vinculadas, no crea ciudades nuevas', p_community_city_id;
  END IF;

  -- Fusión superficial de theme por sub-objeto (texts / colors): conserva
  -- las claves existentes de cada sub-objeto y solo sobrescribe las que
  -- llegan con valor. jsonb_strip_nulls evita que un parámetro NULL
  -- (no provisto) borre una clave ya guardada.
  SELECT cc.theme INTO v_theme FROM public.community_cities AS cc WHERE cc.id = p_community_city_id;
  v_theme := COALESCE(v_theme, '{}'::jsonb);

  v_theme := jsonb_set(
    v_theme,
    '{texts}',
    COALESCE(v_theme->'texts', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'heroTitle', p_hero_title,
      'heroSubtitle', p_hero_subtitle,
      'searchPlaceholder', p_search_placeholder,
      'footerText', p_footer_text
    )),
    true
  );

  v_theme := jsonb_set(
    v_theme,
    '{colors}',
    COALESCE(v_theme->'colors', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'primary', p_color_primary
    )),
    true
  );

  UPDATE public.community_cities AS cc SET
    name = COALESCE(p_city_name, cc.name),
    site_name = COALESCE(p_brand_name, cc.site_name),
    country = COALESCE(p_country_name, cc.country),
    region = COALESCE(p_region, cc.region),
    logo_url = COALESCE(p_logo_url, cc.logo_url),
    site_description = COALESCE(p_seo_description, cc.site_description),
    theme = v_theme
  WHERE cc.id = p_community_city_id;

  UPDATE public.cities AS c SET
    city_name = COALESCE(p_city_name, c.city_name),
    brand_name = COALESCE(p_brand_name, c.brand_name),
    country_name = COALESCE(p_country_name, c.country_name),
    logo_path = COALESCE(p_logo_url, c.logo_path),
    seo_description = COALESCE(p_seo_description, c.seo_description)
  WHERE c.community_city_id = p_community_city_id
  RETURNING c.id INTO v_cities_id;

  RETURN QUERY SELECT v_cities_id, p_community_city_id;
END;
$$;

-- Permisos: la función es el único camino de escritura. Sin GRANT ni
-- policy directa nueva sobre cities ni community_cities — SECURITY DEFINER
-- (función creada por la migración, propiedad del rol que la aplica, con
-- privilegio para eludir RLS igual que is_admin() y las demás funciones de
-- autorización ya existentes en este esquema) más la validación interna de
-- is_admin() son la única puerta.
REVOKE ALL ON FUNCTION public.admin_update_city_config(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.admin_update_city_config(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM anon;

GRANT EXECUTE ON FUNCTION public.admin_update_city_config(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
