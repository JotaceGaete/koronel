-- Reseed no destructivo de las categorías de negocio, tras el DELETE
-- FROM public.categories accidental en producción sobre el commit
-- 36d194b. Ver docs/incidente-delete-categories-produccion.md y
-- docs/diagnostico-category-id-businesses.md — confirmado por SQL real
-- que categories quedó en 0 filas (el reseed de avisos clasificados,
-- 20260702000000, ya se corrió y restauró esas 10; esta migración
-- restaura las de negocio, que seguían en cero).
--
-- Mismo contenido exacto que
-- supabase/migrations/20260310000000_business_category_hierarchy.sql
-- (sección de seed), que ya estaba escrita para ser segura de
-- re-ejecutar (ON CONFLICT ... DO UPDATE con fallback de lookup si
-- RETURNING no devuelve id). No se reutiliza el archivo ni el
-- timestamp original — se crea uno nuevo, aditivo.
--
-- category_type no se especifica en los INSERT porque la columna tiene
-- NOT NULL DEFAULT 'business' — para categorías nuevas eso es
-- exactamente correcto. city_id se deja NULL (catálogo global
-- compartido), igual que las categorías de avisos clasificados.
--
-- Alcance deliberadamente acotado: solo restaura la tabla categories.
-- NO reasigna category_id ni category_key a ningún negocio existente
-- — eso queda para una migración separada, pendiente de la decisión
-- sobre los 9 negocios con category_key ad-hoc (ver diagnóstico).

DO $$
DECLARE
  cat_restaurantes UUID;
  cat_salud UUID;
  cat_educacion UUID;
  cat_automotriz UUID;
  cat_ferreteria UUID;
  cat_supermercados UUID;
  cat_belleza UUID;
  cat_servicios UUID;
  cat_tecnologia UUID;
  cat_iglesias UUID;
BEGIN

  -- ---- PARENT CATEGORIES ----
  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Restaurantes', 'restaurantes', 'UtensilsCrossed', '#EF4444', 1, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 1, is_active = true
  RETURNING id INTO cat_restaurantes;
  IF cat_restaurantes IS NULL THEN
    SELECT id INTO cat_restaurantes FROM public.categories WHERE name_key = 'restaurantes' LIMIT 1;
  END IF;

  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Salud', 'salud', 'Heart', '#EC4899', 2, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 2, is_active = true
  RETURNING id INTO cat_salud;
  IF cat_salud IS NULL THEN
    SELECT id INTO cat_salud FROM public.categories WHERE name_key = 'salud' LIMIT 1;
  END IF;

  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Educación', 'educacion', 'GraduationCap', '#3B82F6', 3, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 3, is_active = true
  RETURNING id INTO cat_educacion;
  IF cat_educacion IS NULL THEN
    SELECT id INTO cat_educacion FROM public.categories WHERE name_key = 'educacion' LIMIT 1;
  END IF;

  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Automotriz', 'automotriz', 'Car', '#F59E0B', 4, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 4, is_active = true
  RETURNING id INTO cat_automotriz;
  IF cat_automotriz IS NULL THEN
    SELECT id INTO cat_automotriz FROM public.categories WHERE name_key = 'automotriz' LIMIT 1;
  END IF;

  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Ferreterías', 'ferreterias', 'Wrench', '#6B7280', 5, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 5, is_active = true
  RETURNING id INTO cat_ferreteria;
  IF cat_ferreteria IS NULL THEN
    SELECT id INTO cat_ferreteria FROM public.categories WHERE name_key = 'ferreterias' LIMIT 1;
  END IF;

  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Supermercados', 'supermercados', 'ShoppingCart', '#10B981', 6, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 6, is_active = true
  RETURNING id INTO cat_supermercados;
  IF cat_supermercados IS NULL THEN
    SELECT id INTO cat_supermercados FROM public.categories WHERE name_key = 'supermercados' LIMIT 1;
  END IF;

  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Belleza', 'belleza', 'Sparkles', '#8B5CF6', 7, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 7, is_active = true
  RETURNING id INTO cat_belleza;
  IF cat_belleza IS NULL THEN
    SELECT id INTO cat_belleza FROM public.categories WHERE name_key = 'belleza' LIMIT 1;
  END IF;

  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Servicios', 'servicios-negocio', 'Briefcase', '#6366F1', 8, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 8, is_active = true
  RETURNING id INTO cat_servicios;
  IF cat_servicios IS NULL THEN
    SELECT id INTO cat_servicios FROM public.categories WHERE name_key = 'servicios-negocio' LIMIT 1;
  END IF;

  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Tecnología', 'tecnologia-negocio', 'Monitor', '#14B8A6', 9, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 9, is_active = true
  RETURNING id INTO cat_tecnologia;
  IF cat_tecnologia IS NULL THEN
    SELECT id INTO cat_tecnologia FROM public.categories WHERE name_key = 'tecnologia-negocio' LIMIT 1;
  END IF;

  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Iglesias y Templos', 'iglesias-templos', 'Church', '#A78BFA', 10, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 10, is_active = true
  RETURNING id INTO cat_iglesias;
  IF cat_iglesias IS NULL THEN
    SELECT id INTO cat_iglesias FROM public.categories WHERE name_key = 'iglesias-templos' LIMIT 1;
  END IF;

  -- ---- SUBCATEGORIES: Restaurantes ----
  INSERT INTO public.categories (name, name_key, icon, color, parent_id, sort_order, is_active) VALUES
    ('Comida Chilena',    'restaurantes-chilena',    'UtensilsCrossed', '#EF4444', cat_restaurantes, 1, true),
    ('Pizzería',          'restaurantes-pizzeria',   'Pizza',           '#EF4444', cat_restaurantes, 2, true),
    ('Mariscos',          'restaurantes-mariscos',   'Fish',            '#EF4444', cat_restaurantes, 3, true),
    ('Comida Rápida',     'restaurantes-rapida',     'Sandwich',        '#EF4444', cat_restaurantes, 4, true),
    ('Café y Pastelería', 'restaurantes-cafe',       'Coffee',          '#EF4444', cat_restaurantes, 5, true),
    ('Panadería',         'restaurantes-panaderia',  'Croissant',       '#EF4444', cat_restaurantes, 6, true)
  ON CONFLICT (name_key) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ---- SUBCATEGORIES: Salud ----
  INSERT INTO public.categories (name, name_key, icon, color, parent_id, sort_order, is_active) VALUES
    ('Dentistas',         'salud-dentistas',         'Heart', '#EC4899', cat_salud, 1, true),
    ('Médicos',           'salud-medicos',           'Heart', '#EC4899', cat_salud, 2, true),
    ('Farmacia',          'salud-farmacia',          'Heart', '#EC4899', cat_salud, 3, true),
    ('Óptica',            'salud-optica',            'Heart', '#EC4899', cat_salud, 4, true),
    ('Psicología',        'salud-psicologia',        'Heart', '#EC4899', cat_salud, 5, true),
    ('Kinesiología',      'salud-kinesiologia',      'Heart', '#EC4899', cat_salud, 6, true),
    ('Veterinaria',       'salud-veterinaria',       'Heart', '#EC4899', cat_salud, 7, true)
  ON CONFLICT (name_key) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ---- SUBCATEGORIES: Educación ----
  INSERT INTO public.categories (name, name_key, icon, color, parent_id, sort_order, is_active) VALUES
    ('Colegio',            'educacion-colegio',       'GraduationCap', '#3B82F6', cat_educacion, 1, true),
    ('Jardín Infantil',    'educacion-jardin',        'GraduationCap', '#3B82F6', cat_educacion, 2, true),
    ('Academia',           'educacion-academia',      'GraduationCap', '#3B82F6', cat_educacion, 3, true),
    ('Clases Particulares','educacion-clases',        'GraduationCap', '#3B82F6', cat_educacion, 4, true)
  ON CONFLICT (name_key) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ---- SUBCATEGORIES: Automotriz ----
  INSERT INTO public.categories (name, name_key, icon, color, parent_id, sort_order, is_active) VALUES
    ('Mecánica',          'automotriz-mecanica',     'Car', '#F59E0B', cat_automotriz, 1, true),
    ('Lubricentro',       'automotriz-lubricentro',  'Car', '#F59E0B', cat_automotriz, 2, true),
    ('Electricista Auto', 'automotriz-electrico',    'Car', '#F59E0B', cat_automotriz, 3, true),
    ('Lavado de Autos',   'automotriz-lavado',       'Car', '#F59E0B', cat_automotriz, 4, true),
    ('Repuestos',         'automotriz-repuestos',    'Car', '#F59E0B', cat_automotriz, 5, true)
  ON CONFLICT (name_key) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ---- SUBCATEGORIES: Belleza ----
  INSERT INTO public.categories (name, name_key, icon, color, parent_id, sort_order, is_active) VALUES
    ('Peluquería',        'belleza-peluqueria',      'Sparkles', '#8B5CF6', cat_belleza, 1, true),
    ('Barbería',          'belleza-barberia',        'Sparkles', '#8B5CF6', cat_belleza, 2, true),
    ('Manicure',          'belleza-manicure',        'Sparkles', '#8B5CF6', cat_belleza, 3, true),
    ('Estética',          'belleza-estetica',        'Sparkles', '#8B5CF6', cat_belleza, 4, true)
  ON CONFLICT (name_key) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ---- SUBCATEGORIES: Servicios ----
  INSERT INTO public.categories (name, name_key, icon, color, parent_id, sort_order, is_active) VALUES
    ('Gasfitería',        'servicios-gasfiteria',    'Briefcase', '#6366F1', cat_servicios, 1, true),
    ('Electricidad',      'servicios-electricidad',  'Briefcase', '#6366F1', cat_servicios, 2, true),
    ('Construcción',      'servicios-construccion',  'Briefcase', '#6366F1', cat_servicios, 3, true),
    ('Jardinería',        'servicios-jardineria',    'Briefcase', '#6366F1', cat_servicios, 4, true),
    ('Mudanzas',          'servicios-mudanzas',      'Briefcase', '#6366F1', cat_servicios, 5, true),
    ('Seguridad',         'servicios-seguridad',     'Briefcase', '#6366F1', cat_servicios, 6, true)
  ON CONFLICT (name_key) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

  -- ---- SUBCATEGORIES: Tecnología ----
  INSERT INTO public.categories (name, name_key, icon, color, parent_id, sort_order, is_active) VALUES
    ('Reparación PC',     'tecnologia-reparacion-pc','Monitor', '#14B8A6', cat_tecnologia, 1, true),
    ('Celulares',         'tecnologia-celulares',    'Monitor', '#14B8A6', cat_tecnologia, 2, true),
    ('Internet y Redes',  'tecnologia-redes',        'Monitor', '#14B8A6', cat_tecnologia, 3, true),
    ('Diseño Web',        'tecnologia-diseno-web',   'Monitor', '#14B8A6', cat_tecnologia, 4, true)
  ON CONFLICT (name_key) DO UPDATE SET parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Category seed failed: %', SQLERRM;
END $$;
