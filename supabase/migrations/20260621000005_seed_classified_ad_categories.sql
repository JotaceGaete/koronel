-- Seed de categorías reales para avisos clasificados.
-- Depende de 20260621000004_add_category_type_and_city.sql.
--
-- Único cambio de la Fase A/B con efecto visible potencial: hoy no existe
-- ninguna categoría category_type='classified_ad' utilizable (ver
-- diagnóstico en docs/plan-fase-a-b.md). Este INSERT solo agrega datos —
-- conectar el formulario "Publicar aviso" para que filtre por
-- category_type='classified_ad' es un cambio de frontend que queda fuera
-- de esta migración, a propósito.
--
-- name_key distintos de los usados por categorías de negocio para evitar
-- choques con la UNIQUE (name_key) existente (ver docs/plan-fase-a-b.md).

INSERT INTO public.categories (name, name_key, icon, color, category_type, city_id, sort_order, is_active) VALUES
    ('Vehículos',              'vehiculos',              'Car',        '#3B82F6', 'classified_ad', NULL, 1, true),
    ('Inmuebles',              'inmuebles',              'Home',       '#10B981', 'classified_ad', NULL, 2, true),
    ('Electrónica',            'clasificados-electronica', 'Smartphone', '#8B5CF6', 'classified_ad', NULL, 3, true),
    ('Ropa y accesorios',      'ropa-accesorios',        'Shirt',      '#EC4899', 'classified_ad', NULL, 4, true),
    ('Empleos',                'clasificados-empleos',   'Briefcase',  '#F59E0B', 'classified_ad', NULL, 5, true),
    ('Servicios',              'clasificados-servicios', 'Wrench',     '#6366F1', 'classified_ad', NULL, 6, true),
    ('Muebles y hogar',        'muebles-hogar',          'Sofa',       '#14B8A6', 'classified_ad', NULL, 7, true),
    ('Deportes y recreación',  'deportes-recreacion',    'Dumbbell',   '#F97316', 'classified_ad', NULL, 8, true),
    ('Mascotas',               'mascotas',               'PawPrint',   '#84CC16', 'classified_ad', NULL, 9, true),
    ('Otros',                  'clasificados-otros',     'Package',    '#6B7280', 'classified_ad', NULL, 10, true)
ON CONFLICT (name_key) DO NOTHING;
