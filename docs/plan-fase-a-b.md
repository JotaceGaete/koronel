# Plan exacto de implementación: Fase A + Fase B

**Estado: plan de implementación. Ninguna migración de este documento existe todavía en `supabase/migrations/`. Nada se ha ejecutado.**

Este documento continúa `docs/diseno-multi-ciudad.md` con las decisiones ya confirmadas:

1. `community_cities` / `city_id`
2. Categorías híbridas: globales (`city_id NULL`) + propias por ciudad
3. Se sembrarán categorías reales de avisos clasificados (único cambio visible de todo el plan)
4. Roles v1: `admin` y `moderator`
5. Sin `community_countries` por ahora — país/moneda/locale/prefijo denormalizados en `community_cities`
6. Dominio propio (`community_cities.domain`) como mecanismo principal, subdominio como fallback

Cada migración de abajo es: **aditiva** (no borra ni reescribe nada existente salvo donde se indica explícitamente), **reversible** (rollback incluido), y **verificable** (query de verificación incluida). El orden importa por las dependencias de FK — están numeradas en el orden exacto en que deben aplicarse.

Los nombres de archivo usan el mismo formato que ya usa el proyecto (`YYYYMMDDHHMMSS_descripcion.sql`). **Actualización: los 7 archivos ya fueron creados en `supabase/migrations/` con estos nombres exactos, después de las verificaciones de abajo — ver el diff al final de este documento. Ninguno fue aplicado/ejecutado contra ninguna base de datos.**

---

## Verificaciones pedidas antes de crear los archivos

**Importante: no tengo acceso a la base de datos en vivo de Supabase en este entorno.** Todo lo que sigue está verificado contra el **historial de migraciones del repositorio** (que es lo único a lo que tengo acceso), no contra el estado real de producción. Si la base de datos de producción tiene cambios manuales que no pasaron por una migración versionada, estas verificaciones no los detectan.

### 1. Email del admin de producción

`carlos@coronellocal.cl` aparece de forma consistente en el historial: se crea como usuario mock en `20260304161514_coronellocal_schema.sql` y se promueve explícitamente a `role='admin'` en `20260304163200_admin_tables.sql`. Eso es evidencia razonable de que es (o fue) el admin real, pero no es una confirmación contra la base viva — pudo haberse creado otra cuenta admin después, o esa cuenta pudo cambiar de email.

**Cambio al plan**: en vez de depender de saber el email exacto, reescribí el `INSERT` de A2 para que use la **misma condición que ya usan las funciones `is_admin()`/`is_admin_user()` existentes** (`raw_user_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'admin'`), y otorgue el rol de ciudad a **todo usuario que hoy cumpla esa condición**, sea cual sea su email. Es más robusto: no importa si el admin real es Carlos, otra persona, o si hay más de un admin global hoy — todos quedan con rol `admin` en Coronel automáticamente, sin tener que acertarle a un string. Ver A2 actualizado abajo.

### 2. Nombre de la función `updated_at`

Confirmado: `public.set_updated_at()` existe desde la migración inicial (`20260304161514_coronellocal_schema.sql`, línea 173), y ya la usan los triggers de `businesses` y `classified_ads`. El nombre que usa A1 es correcto — sin cambios.

(Nota al margen, no bloqueante: existe también `public.set_review_updated_at()`, una función *distinta* con el mismo propósito pero específica de `business_reviews` — no es la que necesito, y no la uso.)

### 3. Constraint única en `categories.name_key`

Confirmado: `name_key TEXT NOT NULL UNIQUE` está declarado inline en la definición original de la tabla (`20260304161514_coronellocal_schema.sql`, línea 33) y nunca se altera ni se elimina en ninguna migración posterior — de hecho la propia migración de jerarquía de categorías (`20260310000000_business_category_hierarchy.sql`) ya depende de este mismo `ON CONFLICT (name_key)` para su seed, así que está probado en el propio historial del proyecto. A5 puede usar `ON CONFLICT (name_key) DO NOTHING` sin cambios.

### 4. Hallazgo no pedido, pero relevante para A1/A2: hay dos funciones de admin duplicadas

Al verificar el punto 1 encontré algo que no estaba buscando: el proyecto tiene **dos funciones de "es admin" con lógica idéntica pero nombres distintos**, creadas en migraciones separadas sin que la segunda supiera que la primera ya existía:

- `public.is_admin()` — definida en `20260304163200_admin_tables.sql`, usada por las políticas de `categories`, `businesses`, `classified_ads`, `business_claims`, `featured_listings`, `user_profiles`.
- `public.is_admin_user()` — definida (dos veces, en migraciones distintas) en `20260305_community_qa.sql` y `20260306000000_business_status.sql`, usada por las políticas de `community_posts`, `community_replies`, `community_votes`, `suggested_businesses`, `community_question_images`.

Ambas funciones son byte-idénticas en su lógica (mismo `SELECT EXISTS (...)`, misma condición `raw_user_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'admin'`), así que no hay riesgo de que devuelvan resultados distintos para el mismo usuario — pero es la misma clase de duplicación silenciosa que venimos encontrando en frontend, ahora en el esquema. **No lo toco en esta fase** (consolidarlas es un cambio de RLS a tablas existentes, fuera del alcance de Fase A/B), pero es la razón por la que A1/A2 usan específicamente `is_admin()` y no `is_admin_user()`: es la que gobierna `categories`, `businesses`, `classified_ads` y `featured_listings` — las tablas más directamente relacionadas con lo que `community_cities`/`community_city_roles` están extendiendo. Queda anotado como candidato a limpieza para cuando se aborde el reemplazo de RLS en Fase D.

---

## Antes de aplicar nada: checklist

- [x] ~~Confirmar el email exacto del admin~~ — ya no hace falta: A2 (ver abajo) otorga el rol a todo usuario que ya cumpla la condición de `is_admin()`/`is_admin_user()` hoy, sin depender de un email específico.
- [ ] Confirmar que `koronel.cl` es el valor correcto para `community_cities.domain` (coincide con `VITE_SITE_DOMAIN`/`.env.example` actual).
- [ ] Idealmente, aplicar primero en un proyecto Supabase de *staging* o una copia de desarrollo antes que en el proyecto de producción de `koronel.cl`, aunque cada migración individual ya está diseñada para no romper nada si se aplica directo. Decisión tuya — lo dejo como recomendación, no como bloqueo.
- [ ] Tener a mano acceso al SQL Editor de Supabase (o `supabase db push` vía CLI) para ejecutar las verificaciones después de cada paso.

---

## Fase A

### A1 — `community_cities`

**Archivo:** `supabase/migrations/20260621000001_create_community_cities.sql`

```sql
-- Community Cities: entidad raíz del motor multi-ciudad.
-- Aditiva: no toca ninguna tabla existente.

CREATE TABLE IF NOT EXISTS public.community_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL DEFAULT 'city',
    name TEXT NOT NULL,
    region TEXT,
    country TEXT NOT NULL DEFAULT 'Chile',
    country_code TEXT NOT NULL DEFAULT 'CL',
    locale TEXT NOT NULL DEFAULT 'es-CL',
    currency TEXT NOT NULL DEFAULT 'CLP',
    phone_country_code TEXT NOT NULL DEFAULT '56',
    center_lat NUMERIC(10,7),
    center_lng NUMERIC(10,7),
    site_name TEXT NOT NULL,
    site_description TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    theme JSONB NOT NULL DEFAULT '{}'::jsonb,
    domain TEXT UNIQUE,
    subdomain TEXT UNIQUE,
    media_base_url TEXT,
    admin_whatsapp TEXT,
    status TEXT NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding','active','inactive')),
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_cities_slug ON public.community_cities(slug);
CREATE INDEX IF NOT EXISTS idx_community_cities_domain ON public.community_cities(domain);
CREATE INDEX IF NOT EXISTS idx_community_cities_status ON public.community_cities(status);

-- updated_at automático (reutiliza la función que ya existe en el proyecto)
DROP TRIGGER IF EXISTS set_community_cities_updated_at ON public.community_cities;
CREATE TRIGGER set_community_cities_updated_at
    BEFORE UPDATE ON public.community_cities
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.community_cities ENABLE ROW LEVEL SECURITY;

-- Lectura pública: cualquier visitante necesita poder resolver "en qué ciudad estoy".
DROP POLICY IF EXISTS "public_read_community_cities" ON public.community_cities;
CREATE POLICY "public_read_community_cities"
ON public.community_cities FOR SELECT TO public
USING (is_public = true OR status = 'active');

-- Escritura: usa is_admin() (la función global existente) como gate interino.
-- Se reemplaza por is_platform_admin() en una fase posterior, NO en esta migración
-- (is_admin() no se toca ni se retira todavía, tal como acordamos).
DROP POLICY IF EXISTS "admin_manage_community_cities" ON public.community_cities;
CREATE POLICY "admin_manage_community_cities"
ON public.community_cities FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Seed: Coronel, con los mismos valores que hoy son default en src/config/city.js
INSERT INTO public.community_cities (
    slug, kind, name, region, country, country_code,
    locale, currency, phone_country_code,
    center_lat, center_lng,
    site_name, site_description,
    domain, media_base_url, admin_whatsapp,
    status, is_public
) VALUES (
    'coronel', 'city', 'Coronel', 'Región del Biobío', 'Chile', 'CL',
    'es-CL', 'CLP', '56',
    -37.0298, -73.1429,
    'CoronelLocal',
    'Directorio de negocios, clasificados, eventos, empleos y comunidad en Coronel y la región.',
    'koronel.cl', 'https://multimedia.koronel.cl', '56993443682',
    'active', true
)
ON CONFLICT (slug) DO NOTHING;
```

**Verificación:**

```sql
SELECT id, slug, name, domain, status, is_public FROM public.community_cities WHERE slug = 'coronel';
-- Esperado: exactamente 1 fila, status='active', is_public=true, domain='koronel.cl'.

SELECT policyname, cmd FROM pg_policies WHERE tablename = 'community_cities';
-- Esperado: 2 filas (public_read_community_cities / SELECT, admin_manage_community_cities / ALL).
```

**Rollback:**

```sql
DROP POLICY IF EXISTS "admin_manage_community_cities" ON public.community_cities;
DROP POLICY IF EXISTS "public_read_community_cities" ON public.community_cities;
DROP TRIGGER IF EXISTS set_community_cities_updated_at ON public.community_cities;
DROP TABLE IF EXISTS public.community_cities;
-- (sin CASCADE: si A2+ ya se aplicó, hay que hacer rollback de A2 en adelante primero, en orden inverso)
```

---

### A2 — `community_city_roles`

**Archivo:** `supabase/migrations/20260621000002_create_community_city_roles.sql`

**Depende de A1** (FK a `community_cities`).

```sql
-- Roles por ciudad. Reemplaza (progresivamente, no todavía) el is_admin() global.

CREATE TABLE IF NOT EXISTS public.community_city_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES public.community_cities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (city_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_community_city_roles_city_id ON public.community_city_roles(city_id);
CREATE INDEX IF NOT EXISTS idx_community_city_roles_user_id ON public.community_city_roles(user_id);

ALTER TABLE public.community_city_roles ENABLE ROW LEVEL SECURITY;

-- Un usuario puede ver sus propios roles (la app lo necesita para saber "soy admin de esta ciudad").
DROP POLICY IF EXISTS "users_read_own_city_roles" ON public.community_city_roles;
CREATE POLICY "users_read_own_city_roles"
ON public.community_city_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- is_admin() (global, existente) puede ver y gestionar todos los roles, como gate interino.
DROP POLICY IF EXISTS "admin_manage_community_city_roles" ON public.community_city_roles;
CREATE POLICY "admin_manage_community_city_roles"
ON public.community_city_roles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Seed: otorgar rol 'admin' de Coronel a todo usuario que YA cumpla la
-- condición de admin global existente (misma condición que is_admin()/
-- is_admin_user()). No depende de conocer un email específico: sea quien
-- sea el/los admin(es) reales hoy en este entorno, quedan cubiertos.
INSERT INTO public.community_city_roles (city_id, user_id, role)
SELECT cc.id, au.id, 'admin'
FROM public.community_cities cc
CROSS JOIN auth.users au
WHERE cc.slug = 'coronel'
  AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
ON CONFLICT (city_id, user_id, role) DO NOTHING;
```

**Verificación:**

```sql
SELECT cr.role, au.email, cc.slug
FROM public.community_city_roles cr
JOIN auth.users au ON au.id = cr.user_id
JOIN public.community_cities cc ON cc.id = cr.city_id;
-- Esperado: al menos 1 fila (una por cada admin global que exista hoy),
-- todas con role='admin', slug='coronel'.
-- Si devuelve 0 filas: no hay ningún usuario con role='admin' en
-- raw_user_meta_data/raw_app_meta_data en este entorno — hay que revisar
-- manualmente quién debería ser admin de Coronel y otorgarle el rol con un
-- INSERT directo antes de continuar a Fase D (sin admin de ciudad, el swap
-- de RLS futuro dejaría a Coronel sin nadie que pueda administrar contenido).
```

**Rollback:**

```sql
DROP POLICY IF EXISTS "admin_manage_community_city_roles" ON public.community_city_roles;
DROP POLICY IF EXISTS "users_read_own_city_roles" ON public.community_city_roles;
DROP TABLE IF EXISTS public.community_city_roles;
```

---

### A3 — Funciones de rol

**Archivo:** `supabase/migrations/20260621000003_create_city_role_functions.sql`

**Depende de A2** (`is_city_admin`/`is_city_moderator` consultan `community_city_roles`).

```sql
-- Funciones nuevas, no reemplazan is_admin() todavía.
-- No se usan en ninguna política existente en esta migración.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'platform_role') = 'super_admin', false)
$$;

CREATE OR REPLACE FUNCTION public.is_city_admin(p_city_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.community_city_roles cr
    WHERE cr.city_id = p_city_id AND cr.user_id = auth.uid() AND cr.role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_city_moderator(p_city_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_city_admin(p_city_id) OR EXISTS (
    SELECT 1 FROM public.community_city_roles cr
    WHERE cr.city_id = p_city_id AND cr.user_id = auth.uid() AND cr.role = 'moderator'
  )
$$;
```

**Verificación:**

```sql
SELECT proname FROM pg_proc
WHERE proname IN ('is_platform_admin', 'is_city_admin', 'is_city_moderator');
-- Esperado: 3 filas.
```

Nota: probar el *comportamiento* real de estas funciones (que devuelvan `true` para Carlos) requiere una request autenticada de verdad — `auth.uid()`/`auth.jwt()` son `NULL` cuando se ejecuta como superusuario desde el SQL Editor. La verificación de comportamiento se hace desde la app (o con `supabase.auth.signInWithPassword` + una llamada RPC de prueba), no con SQL directo. Como estas funciones todavía no están conectadas a ninguna política, no hay urgencia en probarlas ahora — se validan en la fase donde efectivamente reemplazan `is_admin()`.

**Rollback:**

```sql
DROP FUNCTION IF EXISTS public.is_city_moderator(UUID);
DROP FUNCTION IF EXISTS public.is_city_admin(UUID);
DROP FUNCTION IF EXISTS public.is_platform_admin();
```

---

### A4 — `categories`: tipo + ciudad

**Archivo:** `supabase/migrations/20260621000004_add_category_type_and_city.sql`

**Depende de A1** (FK a `community_cities`). No depende de A2/A3.

```sql
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS category_type TEXT NOT NULL DEFAULT 'business'
    CHECK (category_type IN ('business', 'classified_ad', 'event')),
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);

CREATE INDEX IF NOT EXISTS idx_categories_category_type ON public.categories(category_type);
CREATE INDEX IF NOT EXISTS idx_categories_city_id ON public.categories(city_id);

-- No se toca ninguna política RLS de categories en esta migración.
-- Las ~40 filas existentes quedan category_type='business' (correcto, son todas
-- de negocio) y city_id=NULL (correcto: catálogo global compartido).
```

**Verificación:**

```sql
SELECT category_type, count(*) AS total, count(*) FILTER (WHERE city_id IS NULL) AS globales
FROM public.categories GROUP BY category_type;
-- Esperado: una sola fila, category_type='business', total = globales
-- (todas las categorías actuales quedan como globales de tipo negocio).
```

**Rollback:**

```sql
DROP INDEX IF EXISTS idx_categories_city_id;
DROP INDEX IF EXISTS idx_categories_category_type;
ALTER TABLE public.categories DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.categories DROP COLUMN IF EXISTS category_type;
```

---

### A5 — Seed de categorías de avisos clasificados (único cambio visible)

**Archivo:** `supabase/migrations/20260621000005_seed_classified_ad_categories.sql`

**Depende de A4.** Este es el paso que confirmaste como aceptable pese al efecto visible: hoy no hay categorías `classified_ad` utilizables.

```sql
INSERT INTO public.categories (name, name_key, icon, color, category_type, city_id, sort_order, is_active) VALUES
    ('Vehículos',              'vehiculos',           'Car',          '#3B82F6', 'classified_ad', NULL, 1, true),
    ('Inmuebles',              'inmuebles',           'Home',         '#10B981', 'classified_ad', NULL, 2, true),
    ('Electrónica',            'electronica',         'Smartphone',   '#8B5CF6', 'classified_ad', NULL, 3, true),
    ('Ropa y accesorios',      'ropa-accesorios',     'Shirt',        '#EC4899', 'classified_ad', NULL, 4, true),
    ('Empleos',                'clasificados-empleos','Briefcase',    '#F59E0B', 'classified_ad', NULL, 5, true),
    ('Servicios',              'clasificados-servicios','Wrench',     '#6366F1', 'classified_ad', NULL, 6, true),
    ('Muebles y hogar',        'muebles-hogar',       'Sofa',         '#14B8A6', 'classified_ad', NULL, 7, true),
    ('Deportes y recreación',  'deportes-recreacion', 'Dumbbell',     '#F97316', 'classified_ad', NULL, 8, true),
    ('Mascotas',               'mascotas',            'PawPrint',     '#84CC16', 'classified_ad', NULL, 9, true),
    ('Otros',                  'clasificados-otros',  'Package',      '#6B7280', 'classified_ad', NULL, 10, true)
ON CONFLICT (name_key) DO NOTHING;
```

Nota: usé `name_key` distintos de los del seed original de 2026-03 (`clasificados-empleos`, `clasificados-servicios`, `clasificados-otros`) porque el catálogo de negocios ya usa `servicios-negocio`/`otros`-like keys en otras subcategorías — evita choques de `UNIQUE (name_key)` con filas de tipo `business` que puedan tener nombres parecidos. Esto **no** cambia nada del formulario "Publicar aviso" todavía — ese cambio (que `AdForm`/`adService.getAdCategories()` filtren por `category_type = 'classified_ad'`) es una modificación de frontend que queda fuera de esta migración de datos, y no se toca en esta fase.

**Verificación:**

```sql
SELECT name_key, name FROM public.categories WHERE category_type = 'classified_ad' ORDER BY sort_order;
-- Esperado: 10 filas (Vehículos, Inmuebles, Electrónica, ...).
```

**Rollback:**

```sql
DELETE FROM public.categories WHERE category_type = 'classified_ad';
```

---

## Fase B

### B1 — `city_id` en tablas de contenido (batch)

**Archivo:** `supabase/migrations/20260621000006_add_city_id_to_content_tables.sql`

**Depende de A1** (necesita el id de Coronel para el backfill).

```sql
DO $$
DECLARE
  v_coronel_id UUID;
BEGIN
  SELECT id INTO v_coronel_id FROM public.community_cities WHERE slug = 'coronel';
  IF v_coronel_id IS NULL THEN
    RAISE EXCEPTION 'No existe la ciudad "coronel" en community_cities — aplicar A1 primero.';
  END IF;

  -- businesses
  ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.businesses SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- classified_ads
  ALTER TABLE public.classified_ads ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.classified_ads SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- events
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.events SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- jobs
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.jobs SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- community_posts
  ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.community_posts SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- banners
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.banners SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- popups
  ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.popups SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- featured_listings
  ALTER TABLE public.featured_listings ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.featured_listings SET city_id = v_coronel_id WHERE city_id IS NULL;

  -- suggested_businesses
  ALTER TABLE public.suggested_businesses ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);
  UPDATE public.suggested_businesses SET city_id = v_coronel_id WHERE city_id IS NULL;
END $$;

-- Índices (fuera del DO porque CREATE INDEX CONCURRENTLY no puede ir en una
-- transacción implícita de bloque DO; con tablas del tamaño actual el modo no
-- concurrente es instantáneo, así que se deja simple)
CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses(city_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_city_id ON public.classified_ads(city_id);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events(city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON public.jobs(city_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_city_id ON public.community_posts(city_id);
CREATE INDEX IF NOT EXISTS idx_banners_city_id ON public.banners(city_id);
CREATE INDEX IF NOT EXISTS idx_popups_city_id ON public.popups(city_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_city_id ON public.featured_listings(city_id);
CREATE INDEX IF NOT EXISTS idx_suggested_businesses_city_id ON public.suggested_businesses(city_id);

-- IMPORTANTE: ninguna columna queda NOT NULL en esta migración (a propósito).
-- Ningún INSERT existente que no mencione city_id se rompe.
```

**Verificación (una sola query, cubre las 9 tablas):**

```sql
SELECT 'businesses' AS tabla, count(*) AS total, count(*) FILTER (WHERE city_id IS NULL) AS sin_ciudad FROM public.businesses
UNION ALL SELECT 'classified_ads', count(*), count(*) FILTER (WHERE city_id IS NULL) FROM public.classified_ads
UNION ALL SELECT 'events', count(*), count(*) FILTER (WHERE city_id IS NULL) FROM public.events
UNION ALL SELECT 'jobs', count(*), count(*) FILTER (WHERE city_id IS NULL) FROM public.jobs
UNION ALL SELECT 'community_posts', count(*), count(*) FILTER (WHERE city_id IS NULL) FROM public.community_posts
UNION ALL SELECT 'banners', count(*), count(*) FILTER (WHERE city_id IS NULL) FROM public.banners
UNION ALL SELECT 'popups', count(*), count(*) FILTER (WHERE city_id IS NULL) FROM public.popups
UNION ALL SELECT 'featured_listings', count(*), count(*) FILTER (WHERE city_id IS NULL) FROM public.featured_listings
UNION ALL SELECT 'suggested_businesses', count(*), count(*) FILTER (WHERE city_id IS NULL) FROM public.suggested_businesses;
-- Esperado: columna sin_ciudad = 0 en las 9 filas.
```

**Rollback:**

```sql
ALTER TABLE public.businesses DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.classified_ads DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.events DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.community_posts DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.banners DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.popups DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.featured_listings DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.suggested_businesses DROP COLUMN IF EXISTS city_id;
-- DROP COLUMN también elimina el índice correspondiente automáticamente.
```

---

### B2 — `daily_post_tracking` (caso especial: cambia una constraint)

**Archivo:** `supabase/migrations/20260621000007_add_city_id_to_daily_post_tracking.sql`

**Depende de A1 y de B1** (por orden lógico, aunque no hay FK cruzada entre B1 y B2 — se mantiene después por consistencia). Esta es la única tabla de la Fase B donde el cambio no es "solo agregar una columna": el límite diario hoy se identifica por `(identifier, identifier_type, post_date)`, sin ciudad. Con más de una ciudad activa, ese índice único mezclaría contadores entre ciudades. Se corrige ahora porque hacerlo después (cuando ya haya una segunda ciudad activa) sería más disruptivo.

```sql
DO $$
DECLARE
  v_coronel_id UUID;
BEGIN
  SELECT id INTO v_coronel_id FROM public.community_cities WHERE slug = 'coronel';
  IF v_coronel_id IS NULL THEN
    RAISE EXCEPTION 'No existe la ciudad "coronel" en community_cities — aplicar A1 primero.';
  END IF;

  ALTER TABLE public.daily_post_tracking
    ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);

  UPDATE public.daily_post_tracking SET city_id = v_coronel_id WHERE city_id IS NULL;
END $$;

-- Reemplaza el índice único: agrega city_id a la clave.
-- Se deja el índice viejo intacto hasta confirmar que el nuevo está bien
-- (no se dropea en la misma migración — ver nota abajo).
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_post_tracking_unique_by_city
    ON public.daily_post_tracking (identifier, identifier_type, city_id, post_date);
```

Nota deliberada: esta migración **no borra** `idx_daily_post_tracking_unique` (el índice único viejo, sin `city_id`). Mientras exista una sola ciudad, ambos índices son redundantes pero no conflictivos (las mismas filas cumplen ambas restricciones). El índice viejo se elimina recién en una migración posterior — separada, trivial, después de confirmar en producción que el nuevo funciona y que el código que lo usa (`check_post_cooldown`, `check_daily_post_limit`, `increment_daily_post_count` — funciones RPC existentes) fue actualizado para incluir `city_id`. Actualizar esas 3 funciones RPC es cambio de **lógica**, no de esquema aditivo, así que queda fuera de esta fase a propósito.

**Consecuencia explícita de dejarlo así (para que quede sin ambigüedad):** las 3 funciones RPC (`check_post_cooldown`, `check_daily_post_limit`, `increment_daily_post_count`) siguen sin recibir ni usar `city_id` después de esta migración — siguen contando publicaciones por `(identifier, identifier_type, post_date)` únicamente, exactamente igual que hoy. Es decir: **el límite diario/cooldown anti-spam sigue siendo global entre ciudades después de B2**, no por ciudad, a pesar de que la columna `city_id` ya exista en la tabla. La columna queda poblada y lista, pero el límite real no se vuelve "por ciudad" hasta que una fase posterior (fuera de este plan) actualice esas 3 funciones para incluir `city_id` en su lógica de conteo y recién ahí se elimine el índice viejo. Con una sola ciudad activa esto no tiene ningún efecto observable; el riesgo aparece únicamente cuando exista una segunda ciudad activa y ese trabajo de RPC todavía no se haya hecho — por eso conviene resolverlo antes de activar la Fase E (segunda ciudad), no antes de Fase B.

**Verificación:**

```sql
SELECT count(*) FILTER (WHERE city_id IS NULL) AS sin_ciudad, count(*) AS total
FROM public.daily_post_tracking;
-- Esperado: sin_ciudad = 0.

SELECT indexname FROM pg_indexes
WHERE tablename = 'daily_post_tracking' AND indexname LIKE '%unique%';
-- Esperado: 2 filas (el índice viejo + idx_daily_post_tracking_unique_by_city).
```

**Rollback:**

```sql
DROP INDEX IF EXISTS idx_daily_post_tracking_unique_by_city;
ALTER TABLE public.daily_post_tracking DROP COLUMN IF EXISTS city_id;
```

---

## Orden de ejecución (resumen)

```
A1  create_community_cities                      (crea tabla raíz + seed Coronel)
A2  create_community_city_roles                   (depende de A1)
A3  create_city_role_functions                     (depende de A2)
A4  add_category_type_and_city_to_categories       (depende de A1)
A5  seed_classified_ad_categories                  (depende de A4)
B1  add_city_id_to_content_tables                  (depende de A1)
B2  add_city_id_to_daily_post_tracking              (depende de A1; después de B1 por orden, no por FK)
```

A4/A5 y B1/B2 no dependen entre sí — solo de A1 — así que si hiciera falta, A4-A5 y B1-B2 se podrían aplicar en cualquier orden relativo entre ellos. Mantengo el orden de arriba porque agrupa "categorías" y "contenido" como bloques separados, más fácil de seguir y de revertir por bloque.

**Regla de rollback general: siempre en orden inverso** (B2 → B1 → A5 → A4 → A3 → A2 → A1). Revertir A1 mientras A2+ siguen aplicadas requeriría `CASCADE` y arrastraría todo lo que depende de `community_cities` — evitarlo, revertir de atrás hacia adelante.

## Qué NO hace este plan (a propósito)

- No pone ninguna columna `city_id` en `NOT NULL`.
- No toca ninguna política RLS de tablas existentes (`businesses`, `classified_ads`, `events`, etc. — sus políticas siguen usando `is_admin()` exactamente como hoy).
- No modifica `is_admin()`.
- No cambia el frontend — ningún archivo de `src/` se toca en este plan. La app sigue funcionando idéntica porque no lee ninguna de estas columnas/tablas nuevas todavía.
- No actualiza `adService.getAdCategories()` para filtrar por `category_type` — el seed de A5 deja las categorías correctas disponibles en la base, pero conectarlas al formulario es un cambio de frontend que queda para cuando confirmes esa fase específica.

## Verificación final de toda la Fase A + B

Después de aplicar las 7 migraciones, antes de dar por cerrada la fase:

```sql
-- 1. La ciudad existe y está activa
SELECT count(*) FROM public.community_cities WHERE slug = 'coronel' AND status = 'active'; -- = 1

-- 2. Hay al menos un admin de Coronel
SELECT count(*) FROM public.community_city_roles WHERE role = 'admin'; -- >= 1

-- 3. Cero filas huérfanas de ciudad en toda tabla de contenido
SELECT 'businesses', count(*) FILTER (WHERE city_id IS NULL) FROM public.businesses
UNION ALL SELECT 'classified_ads', count(*) FILTER (WHERE city_id IS NULL) FROM public.classified_ads
UNION ALL SELECT 'events', count(*) FILTER (WHERE city_id IS NULL) FROM public.events
UNION ALL SELECT 'jobs', count(*) FILTER (WHERE city_id IS NULL) FROM public.jobs
UNION ALL SELECT 'community_posts', count(*) FILTER (WHERE city_id IS NULL) FROM public.community_posts
UNION ALL SELECT 'banners', count(*) FILTER (WHERE city_id IS NULL) FROM public.banners
UNION ALL SELECT 'popups', count(*) FILTER (WHERE city_id IS NULL) FROM public.popups
UNION ALL SELECT 'featured_listings', count(*) FILTER (WHERE city_id IS NULL) FROM public.featured_listings
UNION ALL SELECT 'suggested_businesses', count(*) FILTER (WHERE city_id IS NULL) FROM public.suggested_businesses
UNION ALL SELECT 'daily_post_tracking', count(*) FILTER (WHERE city_id IS NULL) FROM public.daily_post_tracking;
-- Todas en 0.

-- 4. La app sigue funcionando: correr npm run test:run y npm run build en el
--    repo (sin relación con la DB, pero confirma que nada de este plan requirió
--    tocar el frontend) y probar manualmente koronel.cl end-to-end.
```

Si todo esto da verde, Fase A y Fase B quedan cerradas y production sigue siendo, en los hechos, un sistema de una sola ciudad — solo que ahora esa ciudad está modelada como datos en vez de estar implícita en el código.
