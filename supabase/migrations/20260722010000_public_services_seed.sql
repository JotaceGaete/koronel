-- Datos semilla para "Servicios para la comunidad".
--
-- Máximo 10 instituciones esenciales, tal como se pidió (entre 8 y 12).
-- Cada campo se cargó solo si pudo corroborarse con al menos una fuente
-- pública identificable; cuando no hubo corroboración suficiente
-- (por ejemplo, un correo o un horario puntual), el campo se dejó
-- fuera en vez de completarlo con un valor inventado.
--
-- Los teléfonos de emergencia nacionales (132 Bomberos, 133 Carabineros,
-- 134 PDI) y las líneas de call center nacionales (101 ChileAtiende,
-- 600 370 2000 Registro Civil) son de conocimiento público estable y
-- no dependen de la comuna.
--
-- Fuentes consultadas (búsqueda web, julio 2026) — para verificación
-- humana posterior antes de publicar en producción:
--   Municipalidad: coronel.cl/contacto, Foursquare, Mercantil.com
--   Hospital San José: hospitaldecoronel.cl, ISL, Superintendencia de Salud
--   CESFAM/SAPU Lagunillas: dascoronel.cl, establecimientosdesalud.info (MINSAL)
--   Bomberos: bomberos.cl/cuerpo-de-bomberos-de-coronel
--   Carabineros 4ta Comisaría: InforedChile
--   PDI Coronel: listado de correos PDI (pdichile.cl)
--   Registro Civil: registro-civil.cl, registrocivilenlinea.org (agregadores)
--   ChileAtiende: chileatiende.gob.cl/ayuda/sucursales, InforedChile
--   Seguridad Pública Municipal: coronel.cl/noticias (número 1486)
--
-- Este archivo es solo datos (INSERT). El esquema vive en
-- 20260722000000_public_services.sql. Idempotente: si la tabla ya
-- tiene filas, no hace nada (no duplica ni pisa datos existentes).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.public_services LIMIT 1) THEN
    INSERT INTO public.public_services
      (name, institution_type, category_key, description, address, phone, website, schedule_note, verified_at, sort_order)
    VALUES
      (
        'Municipalidad de Coronel',
        'Municipalidad',
        'instituciones_publicas',
        'Sede del gobierno comunal de Coronel: trámites municipales, oficinas administrativas y atención ciudadana.',
        'Los Notros 1489, Coronel',
        '+56 41 240 7000',
        'https://www.coronel.cl',
        'Lunes a jueves 8:30–17:30, viernes 8:30–16:30',
        '2026-07-22',
        10
      ),
      (
        'Hospital San José de Coronel',
        'Hospital público',
        'salud',
        'Hospital público de la comuna, con servicio de urgencia las 24 horas.',
        'Lautaro 600, Coronel',
        '+56 41 272 3250',
        'https://www.hospitaldecoronel.cl',
        'Urgencia: todos los días, 24 horas',
        '2026-07-22',
        20
      ),
      (
        'CESFAM Lagunillas',
        'Centro de salud familiar (CESFAM)',
        'salud',
        'Centro de salud familiar de atención primaria, dependiente del Departamento de Salud Municipal de Coronel.',
        'Los Álamos 2428, Coronel',
        '+56 41 339 3200',
        'https://www.dascoronel.cl',
        'Lunes a jueves 8:00–17:00 (con extensión hasta las 20:00), viernes 8:00–16:00',
        '2026-07-22',
        30
      ),
      (
        'SAPU Lagunillas',
        'Servicio de urgencia (SAPU)',
        'emergencias',
        'Servicio de atención primaria de urgencia, ubicado en el mismo recinto del CESFAM Lagunillas.',
        'Los Álamos 2428, Coronel',
        '+56 41 271 5071',
        'https://www.dascoronel.cl',
        NULL,
        '2026-07-22',
        40
      ),
      (
        'Cuerpo de Bomberos de Coronel',
        'Bomberos',
        'emergencias',
        'Servicio de bomberos de la comuna. En caso de incendio o emergencia, marque 132.',
        NULL,
        '132',
        'https://www.bomberos.cl/cuerpo-de-bomberos-de-coronel',
        NULL,
        '2026-07-22',
        50
      ),
      (
        'Carabineros de Chile – 4ª Comisaría Coronel',
        'Carabineros de Chile',
        'emergencias',
        'Comisaría de Carabineros de Coronel. Para emergencias, marque 133.',
        'Manuel Montt 798, Coronel',
        '133',
        'https://www.carabineros.cl',
        NULL,
        '2026-07-22',
        60
      ),
      (
        'PDI Coronel',
        'Policía de Investigaciones (PDI)',
        'emergencias',
        'Unidad de la Policía de Investigaciones en Coronel. Para denuncias, marque 134.',
        NULL,
        '134',
        'https://www.pdichile.cl',
        NULL,
        '2026-07-22',
        70
      ),
      (
        'Registro Civil e Identificación – Coronel',
        'Registro Civil e Identificación',
        'atencion_ciudadana',
        'Oficina de Registro Civil e Identificación: cédulas, certificados y trámites de estado civil.',
        'Sargento Aldea 101, Coronel',
        '600 370 2000',
        'https://www.registrocivil.cl',
        'Lunes a viernes 8:30–14:00',
        '2026-07-22',
        80
      ),
      (
        'ChileAtiende Coronel',
        'Atención ciudadana (ChileAtiende)',
        'atencion_ciudadana',
        'Punto de atención presencial de ChileAtiende para trámites y beneficios del Estado.',
        'Remigio Castro 121, Coronel',
        '101',
        'https://www.chileatiende.gob.cl',
        'Lunes a viernes 8:30–14:00',
        '2026-07-22',
        90
      ),
      (
        'Seguridad Pública Municipal de Coronel',
        'Seguridad pública municipal',
        'atencion_ciudadana',
        'Línea municipal de seguridad y patrullaje preventivo de Coronel.',
        NULL,
        '1486',
        'https://www.coronel.cl',
        NULL,
        '2026-07-22',
        100
      );
  END IF;
END $$;
