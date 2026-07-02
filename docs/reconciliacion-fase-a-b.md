# Reconciliación Fase A/B — migraciones aplicadas parcialmente a mano

## Contexto

Al aplicar `20260601000003_create_city_role_functions.sql` en el editor SQL
de Supabase, falló con:

```
ERROR: 42P01: relation "public.community_city_roles" does not exist
```

Diagnóstico del usuario en `supabase_migrations.schema_migrations`:
ninguna de las 7 migraciones de la Fase A/B figura como aplicada, pero la
tabla `community_cities` ya existe porque parte del SQL se corrió a mano
(fuera del flujo de migraciones, probablemente pegando fragmentos en el
editor en vez de correr cada archivo completo en orden).

Esto deja dos cosas potencialmente desincronizadas, que hay que tratar por
separado:

1. **Objetos reales en la base** (tablas, columnas, índices, funciones,
   políticas, datos) — pueden estar completos, parciales, o con
   valores distintos a los del archivo commiteado.
2. **El historial de migraciones** (`supabase_migrations.schema_migrations`)
   — no registra nada, así que Supabase no sabe qué se aplicó.

**No se ejecuta nada de la Sección 3 (reconciliación) hasta compartir los
resultados de la Sección 2 (diagnóstico).** La Sección 2 es 100%
lectura — ningún `INSERT`/`UPDATE`/`ALTER`, es segura de correr en
cualquier momento.

## Por qué esto es reconciliable sin perder datos

Los 7 archivos de la Fase A/B se diseñaron a propósito para ser
idempotentes (revisión explícita antes de crearlos, ver
`docs/plan-fase-a-b.md`):

- `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` — no tocan
  nada si el objeto ya existe.
- `CREATE OR REPLACE FUNCTION` — redefine con el mismo cuerpo; sin efecto
  si ya era idéntica.
- `DROP POLICY IF EXISTS` + `CREATE POLICY` — dejan la política en el
  mismo estado que el archivo, sin depender de si ya existía.
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — no toca columnas ni filas
  existentes.
- `UPDATE ... WHERE city_id IS NULL` — solo completa filas que aún no
  tienen ciudad asignada; nunca sobrescribe una fila que ya tiene
  `city_id`.
- `INSERT ... ON CONFLICT (...) DO NOTHING` — nunca duplica ni sobrescribe
  una fila que ya existe.

**Con una excepción importante que hay que verificar primero:**
`CREATE TABLE IF NOT EXISTS` no agrega columnas si la tabla ya existe con
un esquema distinto o incompleto (por ejemplo, si lo que se corrió a mano
fue una versión más vieja o parcial del `CREATE TABLE`). Por eso la
Sección 2 revisa `community_cities` columna por columna, no solo
"¿existe la tabla?".

Y otra: `INSERT ... ON CONFLICT DO NOTHING` no corrige una fila que ya
existe con valores distintos a los del seed del archivo. Si la fila
`slug='coronel'` ya existe pero con datos distintos a los de
`20260601000001`, volver a correr ese archivo no la va a arreglar — hay
que decidirlo a mano, con los valores reales delante.

## Sección 2 — Diagnóstico (solo lectura, seguro de correr ahora)

Correr esto completo en el editor SQL de Supabase y compartir el
resultado.

### 2.1 Existencia de objetos por migración

```sql
SELECT * FROM (
  -- 20260601000001_create_community_cities
  SELECT '001' AS migracion, 'tabla' AS tipo, 'community_cities' AS objeto,
         (to_regclass('public.community_cities') IS NOT NULL) AS existe
  UNION ALL
  SELECT '001', 'trigger', 'set_community_cities_updated_at',
         EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_community_cities_updated_at' AND NOT tgisinternal)
  UNION ALL
  SELECT '001', 'rls_habilitado', 'community_cities',
         COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.community_cities')), false)
  UNION ALL
  SELECT '001', 'policy', 'public_read_community_cities',
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_cities' AND policyname = 'public_read_community_cities')
  UNION ALL
  SELECT '001', 'policy', 'admin_manage_community_cities',
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_cities' AND policyname = 'admin_manage_community_cities')
  UNION ALL
  SELECT '001', 'seed_row', 'community_cities slug=coronel',
         EXISTS (SELECT 1 FROM public.community_cities WHERE slug = 'coronel')

  -- 20260601000002_create_community_city_roles
  UNION ALL
  SELECT '002', 'tabla', 'community_city_roles',
         (to_regclass('public.community_city_roles') IS NOT NULL)
  UNION ALL
  SELECT '002', 'index', 'idx_community_city_roles_city_id',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_community_city_roles_city_id')
  UNION ALL
  SELECT '002', 'index', 'idx_community_city_roles_user_id',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_community_city_roles_user_id')
  UNION ALL
  SELECT '002', 'policy', 'users_read_own_city_roles',
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_city_roles' AND policyname = 'users_read_own_city_roles')
  UNION ALL
  SELECT '002', 'policy', 'admin_manage_community_city_roles',
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_city_roles' AND policyname = 'admin_manage_community_city_roles')

  -- 20260601000003_create_city_role_functions
  UNION ALL
  SELECT '003', 'function', 'is_platform_admin',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'is_platform_admin')
  UNION ALL
  SELECT '003', 'function', 'is_city_admin',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'is_city_admin')
  UNION ALL
  SELECT '003', 'function', 'is_city_moderator',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'is_city_moderator')

  -- 20260601000004_add_category_type_and_city
  UNION ALL
  SELECT '004', 'columna', 'categories.category_type',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'category_type')
  UNION ALL
  SELECT '004', 'columna', 'categories.city_id',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'city_id')
  UNION ALL
  SELECT '004', 'index', 'idx_categories_category_type',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_categories_category_type')
  UNION ALL
  SELECT '004', 'index', 'idx_categories_city_id',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_categories_city_id')

  -- 20260601000006_add_city_id_to_content_tables
  UNION ALL
  SELECT '006', 'columna', t || '.city_id',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'city_id')
  FROM unnest(ARRAY['businesses','classified_ads','events','jobs','community_posts','banners','popups','featured_listings','suggested_businesses']) AS t
  UNION ALL
  SELECT '006', 'index', 'idx_' || t || '_city_id',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_' || t || '_city_id')
  FROM unnest(ARRAY['businesses','classified_ads','events','jobs','community_posts','banners','popups','featured_listings','suggested_businesses']) AS t

  -- 20260601000007_add_city_id_to_daily_post_tracking
  UNION ALL
  SELECT '007', 'columna', 'daily_post_tracking.city_id',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_post_tracking' AND column_name = 'city_id')
  UNION ALL
  SELECT '007', 'index_viejo_intacto', 'idx_daily_post_tracking_unique',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_daily_post_tracking_unique')
  UNION ALL
  SELECT '007', 'index_nuevo', 'idx_daily_post_tracking_unique_by_city',
         EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_daily_post_tracking_unique_by_city')
) diag
ORDER BY migracion, tipo, objeto;
```

### 2.2 `community_cities` columna por columna (crítico — es la tabla que ya se corrió a mano)

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'community_cities'
ORDER BY ordinal_position;
```

Comparar contra las columnas esperadas por
`20260601000001_create_community_cities.sql`:
`id, slug, kind, name, region, country, country_code, locale, currency,
phone_country_code, center_lat, center_lng, site_name, site_description,
logo_url, favicon_url, theme, domain, subdomain, media_base_url,
admin_whatsapp, status, is_public, created_at, updated_at`.

### 2.3 Valores reales de la fila `coronel` (para detectar drift vs. el seed)

```sql
SELECT slug, kind, name, region, country, country_code, locale, currency,
       phone_country_code, center_lat, center_lng, site_name,
       site_description, domain, media_base_url, admin_whatsapp,
       status, is_public
FROM public.community_cities
WHERE slug = 'coronel';
```

Comparar contra el `INSERT` de `20260601000001` (domain =
`koronel.cl`, site_name = `CoronelLocal`, admin_whatsapp =
`56993443682`, status = `active`, is_public = `true`, etc.). Si algún
valor difiere, **no** correr de nuevo el archivo 001 esperando que lo
corrija — el `ON CONFLICT (slug) DO NOTHING` no va a tocar la fila.
Avisar y se decide un `UPDATE` puntual.

### 2.4 Filas sin `city_id` pendientes de backfill (solo aplica si 006/007 corrieron parcialmente)

```sql
SELECT 'businesses' AS tabla, count(*) FILTER (WHERE city_id IS NULL) AS sin_city_id FROM public.businesses
UNION ALL SELECT 'classified_ads', count(*) FILTER (WHERE city_id IS NULL) FROM public.classified_ads
UNION ALL SELECT 'events', count(*) FILTER (WHERE city_id IS NULL) FROM public.events
UNION ALL SELECT 'jobs', count(*) FILTER (WHERE city_id IS NULL) FROM public.jobs
UNION ALL SELECT 'community_posts', count(*) FILTER (WHERE city_id IS NULL) FROM public.community_posts
UNION ALL SELECT 'banners', count(*) FILTER (WHERE city_id IS NULL) FROM public.banners
UNION ALL SELECT 'popups', count(*) FILTER (WHERE city_id IS NULL) FROM public.popups
UNION ALL SELECT 'featured_listings', count(*) FILTER (WHERE city_id IS NULL) FROM public.featured_listings
UNION ALL SELECT 'suggested_businesses', count(*) FILTER (WHERE city_id IS NULL) FROM public.suggested_businesses
UNION ALL SELECT 'daily_post_tracking', count(*) FILTER (WHERE city_id IS NULL) FROM public.daily_post_tracking;
```
(Si alguna de estas tablas todavía no tiene columna `city_id` según 2.1,
esta query va a fallar en esa línea — es información también: significa
que esa migración no corrió nada todavía.)

### 2.5 Categorías de clasificados (seed de 005)

```sql
SELECT count(*) AS categorias_classified_ad
FROM public.categories
WHERE category_type = 'classified_ad';
```
Se esperan 10 si `20260601000005` corrió completo.

### 2.6 Historial de migraciones actual (confirmar lo que ya reportaste)

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version LIKE '202606%'
ORDER BY version;
```

## Sección 3 — Plan de reconciliación (NO ejecutar todavía)

Una vez compartidos los resultados de la Sección 2, el plan es:

### 3.1 Reconciliar los objetos reales de la base

- **Si 2.2/2.3 muestran que `community_cities` tiene exactamente las
  columnas esperadas y la fila `coronel` con los valores esperados**:
  es seguro volver a correr los 7 archivos completos, **en orden, uno a
  la vez**, tal cual están en el repo (sin editarlos). Por el diseño
  idempotente explicado arriba, esto no duplica nada, no pierde nada, y
  simplemente completa lo que falta. Verificar con la Sección 2 después
  de cada archivo antes de pasar al siguiente — no saltarse ninguno,
  que es justamente lo que causó este incidente.
- **Si 2.2/2.3 muestran columnas faltantes o valores distintos en
  `community_cities`**: no se puede simplemente re-correr 001 a ciegas.
  Hay que decidir explícitamente (con los valores reales delante) si se
  hace un `ALTER TABLE ... ADD COLUMN` puntual para las columnas
  faltantes y/o un `UPDATE` puntual para corregir la fila `coronel`, y
  recién después seguir con 002→007.

### 3.2 Reconciliar `supabase_migrations.schema_migrations`

Una vez confirmado (con la Sección 2, repetida) que los 7 archivos están
100% aplicados y correctos, marcar el historial usando el comando del
CLI de Supabase pensado exactamente para este caso — **no** insertar filas
a mano en `supabase_migrations.schema_migrations` (su estructura exacta
depende de la versión del CLI y es frágil de tocar directamente):

```
supabase migration repair --status applied 20260601000001
supabase migration repair --status applied 20260601000002
supabase migration repair --status applied 20260601000003
supabase migration repair --status applied 20260601000004
supabase migration repair --status applied 20260601000005
supabase migration repair --status applied 20260601000006
supabase migration repair --status applied 20260601000007
```

Si no se usa el CLI de Supabase para desplegar (todo se hace desde el
editor SQL del dashboard), este paso es opcional: el contenido real de la
base es lo que importa funcionalmente, y los archivos del repo siguen
siendo la fuente de verdad. Pero si en algún momento se usa
`supabase db push`, hacerlo evita que intente reaplicar o marque
conflicto con estas 7 migraciones.
