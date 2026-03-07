-- Business Category Hierarchy Migration
-- Adds parent_id, sort_order, is_active to categories
-- Adds category_id (UUID FK) to businesses
-- Seeds hierarchical business categories

-- ============================================================
-- 1. ALTER categories table
-- ============================================================
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================================
-- 2. ALTER businesses table — add category_id UUID FK
-- ============================================================
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON public.businesses(category_id);

-- ============================================================
-- 4. Seed hierarchical business categories
-- ============================================================
DO $$
DECLARE
  -- Parent category IDs
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
  -- Restaurantes
  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Restaurantes', 'restaurantes', 'UtensilsCrossed', '#EF4444', 1, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 1, is_active = true
  RETURNING id INTO cat_restaurantes;
  IF cat_restaurantes IS NULL THEN
    SELECT id INTO cat_restaurantes FROM public.categories WHERE name_key = 'restaurantes' LIMIT 1;
  END IF;

  -- Salud
  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Salud', 'salud', 'Heart', '#EC4899', 2, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 2, is_active = true
  RETURNING id INTO cat_salud;
  IF cat_salud IS NULL THEN
    SELECT id INTO cat_salud FROM public.categories WHERE name_key = 'salud' LIMIT 1;
  END IF;

  -- Educación
  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Educación', 'educacion', 'GraduationCap', '#3B82F6', 3, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 3, is_active = true
  RETURNING id INTO cat_educacion;
  IF cat_educacion IS NULL THEN
    SELECT id INTO cat_educacion FROM public.categories WHERE name_key = 'educacion' LIMIT 1;
  END IF;

  -- Automotriz
  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Automotriz', 'automotriz', 'Car', '#F59E0B', 4, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 4, is_active = true
  RETURNING id INTO cat_automotriz;
  IF cat_automotriz IS NULL THEN
    SELECT id INTO cat_automotriz FROM public.categories WHERE name_key = 'automotriz' LIMIT 1;
  END IF;

  -- Ferreterías
  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Ferreterías', 'ferreterias', 'Wrench', '#6B7280', 5, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 5, is_active = true
  RETURNING id INTO cat_ferreteria;
  IF cat_ferreteria IS NULL THEN
    SELECT id INTO cat_ferreteria FROM public.categories WHERE name_key = 'ferreterias' LIMIT 1;
  END IF;

  -- Supermercados
  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Supermercados', 'supermercados', 'ShoppingCart', '#10B981', 6, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 6, is_active = true
  RETURNING id INTO cat_supermercados;
  IF cat_supermercados IS NULL THEN
    SELECT id INTO cat_supermercados FROM public.categories WHERE name_key = 'supermercados' LIMIT 1;
  END IF;

  -- Belleza
  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Belleza', 'belleza', 'Sparkles', '#8B5CF6', 7, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 7, is_active = true
  RETURNING id INTO cat_belleza;
  IF cat_belleza IS NULL THEN
    SELECT id INTO cat_belleza FROM public.categories WHERE name_key = 'belleza' LIMIT 1;
  END IF;

  -- Servicios
  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Servicios', 'servicios-negocio', 'Briefcase', '#6366F1', 8, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 8, is_active = true
  RETURNING id INTO cat_servicios;
  IF cat_servicios IS NULL THEN
    SELECT id INTO cat_servicios FROM public.categories WHERE name_key = 'servicios-negocio' LIMIT 1;
  END IF;

  -- Tecnología
  INSERT INTO public.categories (name, name_key, icon, color, sort_order, is_active)
  VALUES ('Tecnología', 'tecnologia-negocio', 'Monitor', '#14B8A6', 9, true)
  ON CONFLICT (name_key) DO UPDATE SET sort_order = 9, is_active = true
  RETURNING id INTO cat_tecnologia;
  IF cat_tecnologia IS NULL THEN
    SELECT id INTO cat_tecnologia FROM public.categories WHERE name_key = 'tecnologia-negocio' LIMIT 1;
  END IF;

  -- Iglesias y Templos
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
    ('Colegio',           'educacion-colegio',       'GraduationCap', '#3B82F6', cat_educacion, 1, true),
    ('Jardín Infantil',   'educacion-jardin',        'GraduationCap', '#3B82F6', cat_educacion, 2, true),
    ('Academia',          'educacion-academia',      'GraduationCap', '#3B82F6', cat_educacion, 3, true),
    ('Clases Particulares','educacion-clases',       'GraduationCap', '#3B82F6', cat_educacion, 4, true)
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
