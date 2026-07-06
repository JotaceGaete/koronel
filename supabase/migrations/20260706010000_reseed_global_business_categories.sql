-- Reseed no destructivo de categorias globales para negocios.
-- No borra datos, no reasigna negocios y no toca categorias classified_ad.

DO $$
DECLARE
  cat_comercio_local UUID;
BEGIN
  INSERT INTO public.categories
    (name, name_key, icon, color, category_type, city_id, parent_id, sort_order, is_active)
  VALUES
    ('Restaurantes', 'restaurantes', 'UtensilsCrossed', '#EF4444', 'business', NULL, NULL, 1, true),
    ('Salud', 'salud', 'Heart', '#EC4899', 'business', NULL, NULL, 2, true),
    ('Educacion', 'educacion', 'GraduationCap', '#3B82F6', 'business', NULL, NULL, 3, true),
    ('Automotriz', 'automotriz', 'Car', '#F59E0B', 'business', NULL, NULL, 4, true),
    ('Ferreterias', 'ferreterias', 'Wrench', '#6B7280', 'business', NULL, NULL, 5, true),
    ('Supermercados', 'supermercados', 'ShoppingCart', '#10B981', 'business', NULL, NULL, 6, true),
    ('Belleza', 'belleza', 'Sparkles', '#8B5CF6', 'business', NULL, NULL, 7, true),
    ('Servicios', 'servicios-negocio', 'Briefcase', '#6366F1', 'business', NULL, NULL, 8, true),
    ('Tecnologia', 'tecnologia-negocio', 'Monitor', '#14B8A6', 'business', NULL, NULL, 9, true),
    ('Iglesias y templos', 'iglesias-templos', 'Church', '#A78BFA', 'business', NULL, NULL, 10, true),
    ('Comercio local', 'comercio-local', 'Store', '#0F766E', 'business', NULL, NULL, 11, true)
  ON CONFLICT (name_key) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    category_type = 'business',
    city_id = NULL,
    parent_id = NULL,
    sort_order = EXCLUDED.sort_order,
    is_active = true;

  SELECT id INTO cat_comercio_local
  FROM public.categories
  WHERE name_key = 'comercio-local'
    AND category_type = 'business'
  LIMIT 1;

  INSERT INTO public.categories
    (name, name_key, icon, color, category_type, city_id, parent_id, sort_order, is_active)
  VALUES
    ('Imprenta y grafica', 'imprenta-grafica', 'Printer', '#0F766E', 'business', NULL, cat_comercio_local, 1, true),
    ('Libreria y papeleria', 'libreria-papeleria', 'NotebookPen', '#0F766E', 'business', NULL, cat_comercio_local, 2, true),
    ('Envases y embalajes', 'envases-embalajes', 'Package', '#0F766E', 'business', NULL, cat_comercio_local, 3, true),
    ('Tienda de regalos', 'tienda-regalos', 'Gift', '#0F766E', 'business', NULL, cat_comercio_local, 4, true),
    ('Ropa y accesorios negocio', 'ropa-accesorios-negocio', 'Shirt', '#0F766E', 'business', NULL, cat_comercio_local, 5, true)
  ON CONFLICT (name_key) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    category_type = 'business',
    city_id = NULL,
    parent_id = EXCLUDED.parent_id,
    sort_order = EXCLUDED.sort_order,
    is_active = true;
END $$;
