-- Reseed no destructivo de categorías de avisos clasificados, tras un
-- `DELETE FROM public.categories;` ejecutado accidentalmente en
-- producción sobre el commit 36d194b.
-- Ver docs/incidente-delete-categories-produccion.md para el diagnóstico
-- completo (qué se perdió, qué no, y qué queda fuera de esta migración
-- a propósito: categorías de negocio y businesses.category_id).
--
-- Seguro de correr sin importar el estado real de la tabla: si la fila
-- no existe la crea; si ya existe (por ejemplo, si algo la recreó a
-- mano) solo corrige category_type y name, sin tocar su id. No borra ni
-- modifica ninguna otra fila.
--
-- Mismo contenido que 20260621000005_seed_classified_ad_categories.sql
-- (incluyendo el ajuste clasificados-electronica ya aprobado), con
-- ON CONFLICT ... DO UPDATE en vez de DO NOTHING.

INSERT INTO public.categories (name, name_key, icon, color, category_type, city_id, sort_order, is_active) VALUES
    ('Vehículos',              'vehiculos',                'Car',        '#3B82F6', 'classified_ad', NULL, 1, true),
    ('Inmuebles',              'inmuebles',                'Home',       '#10B981', 'classified_ad', NULL, 2, true),
    ('Electrónica',            'clasificados-electronica', 'Smartphone', '#8B5CF6', 'classified_ad', NULL, 3, true),
    ('Ropa y accesorios',      'ropa-accesorios',          'Shirt',      '#EC4899', 'classified_ad', NULL, 4, true),
    ('Empleos',                'clasificados-empleos',     'Briefcase',  '#F59E0B', 'classified_ad', NULL, 5, true),
    ('Servicios',              'clasificados-servicios',   'Wrench',     '#6366F1', 'classified_ad', NULL, 6, true),
    ('Muebles y hogar',        'muebles-hogar',            'Sofa',       '#14B8A6', 'classified_ad', NULL, 7, true),
    ('Deportes y recreación',  'deportes-recreacion',      'Dumbbell',   '#F97316', 'classified_ad', NULL, 8, true),
    ('Mascotas',               'mascotas',                 'PawPrint',   '#84CC16', 'classified_ad', NULL, 9, true),
    ('Otros',                  'clasificados-otros',       'Package',    '#6B7280', 'classified_ad', NULL, 10, true)
ON CONFLICT (name_key) DO UPDATE SET
    category_type = excluded.category_type,
    name = excluded.name;
