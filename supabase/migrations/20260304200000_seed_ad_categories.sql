-- Seed classified ad categories if the categories table is empty
-- This ensures the "Nuevo aviso" dropdown always has options

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categories LIMIT 1) THEN
    INSERT INTO public.categories (name, name_key, icon, color) VALUES
      ('Vehículos',          'vehiculos',          'Car',          '#3B82F6'),
      ('Inmuebles',           'inmuebles',          'Home',         '#10B981'),
      ('Electrónica',         'electronica',        'Smartphone',   '#8B5CF6'),
      ('Ropa y accesorios',   'ropa-accesorios',    'Shirt',        '#EC4899'),
      ('Empleos',             'empleos',            'Briefcase',    '#F59E0B'),
      ('Servicios',           'servicios',          'Wrench',       '#6366F1'),
      ('Muebles y hogar',     'muebles-hogar',      'Sofa',         '#14B8A6'),
      ('Deportes y recreación','deportes-recreacion','Dumbbell',     '#F97316'),
      ('Mascotas',            'mascotas',           'PawPrint',     '#84CC16'),
      ('Otros',               'otros',              'Package',      '#6B7280')
    ON CONFLICT (name_key) DO NOTHING;
  END IF;
END $$;
