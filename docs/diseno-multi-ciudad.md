# Diseño técnico: motor multi-ciudad (`community_cities`, `city_id`, roles, categorías, RLS)

**Estado: propuesta de diseño. Ningún SQL de este documento se ha aplicado. No se ha tocado el esquema, RLS ni roles.**

Este documento es la preparación para la fase de esquema/RLS de la auditoría arquitectónica. Antes de escribir una sola migración, define: la entidad raíz de ciudad, dónde vive `city_id`, cómo se modelan los roles por ciudad, cómo se resuelve la duplicación de categorías detectada en la fase anterior, un diseño de RLS que sea seguro sin reescribir todo de una vez, y un plan de migración que en ningún momento deja producción (koronel.cl) en un estado roto.

Al final hay una lista de **decisiones que necesito que confirmes** antes de que la siguiente fase escriba migraciones reales.

---

## 1. Entidad raíz: `community_cities`

### Decisión de nombre

Evalué dos opciones:

| Opción | Tabla | Columna FK | Pro | Contra |
|---|---|---|---|---|
| A (recomendada) | `community_cities` | `city_id` | Coherente con todo el trabajo previo (`CITY_CONFIG`, `VITE_CITY_*`, toda la conversación); el 100% de los casos reales hoy y a mediano plazo son ciudades literales | Si algún día quieren dar de alta una "comarca" o agrupación de pueblos, el nombre de la tabla queda técnicamente impreciso (aunque nada se rompe: es solo una fila más) |
| B | `community_sites` | `site_id` | Genérico, a prueba de futuro, vocabulario estándar de SaaS multi-tenant | Rompe la continuidad de nombres ya usada en config/env vars; "site" es ambiguo (¿sitio web?) |

**Recomiendo la Opción A** (`community_cities` / `city_id`) porque es la que ya está sembrada en todo el código (`src/config/city.js`, `VITE_CITY_NAME`, `VITE_CITY_LAT`, etc.) y evita renombrar cosas que ya funcionan. Para no perder flexibilidad, la tabla incluye una columna `kind` (ver abajo) que permite registrar algo que no es estrictamente una ciudad sin mentir en el nombre de la tabla — es un patrón común (la tabla `users` de GitHub también guarda bots).

Esta decisión es la base de todo lo demás, así que la marco como el primer punto a confirmar.

> **Convención de nombres del motor de ciudad**: entidades nuevas usan
> prefijo `community_` o nombres neutrales. Nunca prefijo `wa_` (legado
> Walinka) — ver decisión y justificación completa en
> `docs/decision-prefijo-wa.md`.

### Esquema propuesto

```sql
CREATE TABLE public.community_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,              -- 'coronel', usado en subdominios/rutas
    kind TEXT NOT NULL DEFAULT 'city',       -- 'city' | 'comarca' | 'region' (a futuro)
    name TEXT NOT NULL,                      -- 'Coronel'
    region TEXT,                             -- 'Región del Biobío'
    country TEXT NOT NULL DEFAULT 'Chile',
    country_code TEXT NOT NULL DEFAULT 'CL',

    -- Config regional (hoy vive en src/config/city.js con defaults hardcodeados)
    locale TEXT NOT NULL DEFAULT 'es-CL',
    currency TEXT NOT NULL DEFAULT 'CLP',
    phone_country_code TEXT NOT NULL DEFAULT '56',

    -- Mapa
    center_lat NUMERIC(10,7),
    center_lng NUMERIC(10,7),

    -- Branding / SEO (hoy vive en CITY_CONFIG.siteName, PageMeta, index.html)
    site_name TEXT NOT NULL,                 -- 'CoronelLocal'
    site_description TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    theme JSONB DEFAULT '{}'::jsonb,         -- colores primary/secondary/accent

    -- Infraestructura
    domain TEXT UNIQUE,                      -- 'koronel.cl' (dominio propio)
    subdomain TEXT UNIQUE,                   -- 'coronel' (coronel.tuplataforma.cl, fallback)
    media_base_url TEXT,                     -- bucket R2 de esta ciudad
    admin_whatsapp TEXT,

    -- Ciclo de vida
    status TEXT NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding','active','inactive')),
    is_public BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

Este es, literalmente, el `CITY_CONFIG` de `src/config/city.js` movido a una fila de base de datos. La idea a mediano plazo (fuera de este documento) es que el frontend deje de leer `VITE_CITY_*` como fuente principal y en su lugar resuelva "¿qué ciudad soy?" por dominio/subdominio contra esta tabla, cayendo a los valores de `.env` solo como último recurso local. Eso cierra el círculo de las tres fases anteriores.

`status`/`is_public` existen para poder cargar una ciudad nueva (Talca, por ejemplo) en modo `onboarding` — visible solo para su propio admin — antes de publicarla.

### `community_countries` (opcional, no bloqueante)

En la auditoría original marqué que moneda/locale/prefijo telefónico son en realidad atributos de **país**, no de ciudad — importa el día que agreguen Chascomús (Argentina). Para v1 (una sola ciudad, un solo país) **no es necesario**: dejo esos campos denormalizados en `community_cities` como arriba. Si más adelante hay 3+ ciudades chilenas y 1 argentina, tiene sentido extraer:

```sql
CREATE TABLE public.community_countries (
    code TEXT PRIMARY KEY,              -- 'CL', 'AR'
    name TEXT NOT NULL,
    locale TEXT NOT NULL,
    currency TEXT NOT NULL,
    phone_country_code TEXT NOT NULL
);
-- community_cities.country_code REFERENCES community_countries(code)
```

No lo incluyo en el plan de migración de este documento — es una optimización de "no repetir 3 campos por cada ciudad del mismo país", no un bloqueante funcional. Lo dejo anotado para cuando corresponda.

---

## 2. Dónde vive `city_id`

### Tablas que lo necesitan (propagación completa)

| Tabla | ¿Por qué? |
|---|---|
| `businesses` | contenido raíz por ciudad |
| `classified_ads` | contenido raíz por ciudad |
| `events` | contenido raíz por ciudad |
| `jobs` | contenido raíz por ciudad |
| `community_posts` | contenido raíz por ciudad |
| `banners` | contenido promocional, 100% por ciudad |
| `popups` | contenido promocional, 100% por ciudad |
| `featured_listings` | curaduría por ciudad |
| `suggested_businesses` | sugerencias enviadas en el contexto de una ciudad |
| `daily_post_tracking` | ver nota abajo — el límite diario debe ser por ciudad |

### Tablas que heredan `city_id` (NO necesitan columna propia)

Estas cuelgan de una tabla raíz vía FK; su ciudad es siempre la de su padre, y agregar la columna sería una segunda fuente de verdad que puede desincronizarse (exactamente el tipo de duplicación que venimos eliminando en frontend):

- `business_images`, `ad_images` → vía `business_id` / `ad_id`
- `business_claims`, `business_reviews`, `church_details` → vía `business_id`
- `community_replies`, `community_votes` → vía `post_id`
- `job_applications` → vía `job_id`
- `ad_messages` → vía `ad_id`
- `media_files` → vía `entity_type`/`entity_id` (patrón polimórfico ya existente)

Si en el futuro algún reporte de admin necesita filtrar `business_reviews` por ciudad sin hacer join, se puede resolver con una vista (`business_reviews_with_city`), no denormalizando la columna.

### Tablas que NUNCA llevan `city_id`

- `user_profiles` / `auth.users` — la identidad es global (una persona puede publicar en más de una ciudad)
- `community_cities` — es la raíz
- `community_countries` — es la raíz (si se crea)

### Caso especial: `daily_post_tracking`

Hoy el límite diario de publicaciones se identifica por `(identifier, identifier_type, post_date)` con un índice único — es decir, es **global entre ciudades**. Con dos ciudades activas, dos personas con el mismo criterio de identificación en ciudades distintas compartirían el mismo contador, lo cual es incorrecto (y, en el caso de `identifier_type = 'ip'`, hoy ya es un límite compartido sin querer). El diseño correcto agrega `city_id` a la clave: `UNIQUE (identifier, identifier_type, city_id, post_date)`. Lo incluyo en el plan de migración porque, a diferencia de las demás tablas, este es un caso donde **no** migrar tendría un efecto funcional real (usuarios de otra ciudad bloqueados por límites de una ciudad ajena) — aunque con una sola ciudad activa hoy no se nota.

### Caso especial: `categories` — ver sección 3 completa

---

## 3. Categorías: por tipo y por ciudad

Retomando el diagnóstico de la fase anterior: la tabla `categories` es compartida sin discriminador entre negocios y avisos clasificados, lo que ya causa un bug real hoy (el dropdown de "publicar aviso" probablemente sirve categorías de negocio). El diseño de `city_id` es la oportunidad de resolver ambos problemas a la vez, sin tocar RLS ni romper nada.

### Cambios a `categories`

```sql
ALTER TABLE public.categories
  ADD COLUMN category_type TEXT NOT NULL DEFAULT 'business'
    CHECK (category_type IN ('business', 'classified_ad', 'event')),
  ADD COLUMN city_id UUID REFERENCES public.community_cities(id);
```

- `category_type`: separa las tres taxonomías que hoy están mezcladas en una tabla. Default `'business'` es **correcto para todas las filas existentes** (las ~40 categorías/subcategorías actuales son todas de negocio) → cero migración de datos, cero cambio visible.
- `city_id` **nullable de forma permanente** (no es un estado transitorio como en las tablas de contenido): `NULL` significa "categoría global, compartida por todas las ciudades"; un valor significa "categoría propia de esa ciudad, no aparece en las demás". Las ~40 categorías actuales de Coronel quedan con `city_id = NULL`, es decir, pasan a ser el catálogo global de base que cualquier ciudad nueva hereda automáticamente.

### Por qué híbrido (global + override) y no 100% aislado por ciudad

| | Híbrido (recomendado) | Aislado por ciudad |
|---|---|---|
| Consulta | `WHERE category_type = 'business' AND (city_id IS NULL OR city_id = :ciudad_actual)` | `WHERE category_type = 'business' AND city_id = :ciudad_actual` |
| Ciudad nueva | Hereda el catálogo global automáticamente, sin trabajo extra | Requiere clonar el catálogo template al crear la ciudad (paso de bootstrap adicional) |
| Autonomía por ciudad | Un admin de ciudad puede agregar categorías propias sin afectar a nadie más | Igual |
| Riesgo | Si Coronel edita una categoría global, afecta a todas las ciudades que la comparten (mitigable: solo un platform-admin debería poder editar `city_id IS NULL`) | Ninguna ciudad puede afectar a otra, por diseño |

Recomiendo el híbrido porque el catálogo actual (Restaurantes, Salud, Automotriz...) es genuinamente reutilizable entre ciudades chilenas — no tiene sentido que Talca tenga que recrear "Restaurantes" desde cero. La contención de riesgo (que un admin de Coronel no pueda tocar el catálogo global) se resuelve en RLS: solo un `is_platform_admin()` puede escribir filas con `city_id IS NULL`; un `is_city_admin(city_id)` normal solo puede escribir filas de su propia ciudad. Esto se especifica en la sección de RLS.

### Los avisos clasificados necesitan su propio seed

Al agregar `category_type`, hay que sembrar categorías reales de tipo `classified_ad` (Vehículos, Inmuebles, Electrónica...) — hoy no existen utilizables porque, según rastreé en la fase anterior, el seed original nunca llegó a persistir. Esto es una migración de **datos** (INSERT), no de esquema, y es la primera vez en esta fase que un cambio tiene un efecto visible: hoy el dropdown de "publicar aviso" muestra lo que sea que `getAdCategories()` devuelva (probablemente categorías de negocio, o nada usable); después del seed, mostraría categorías correctas de clasificados. Lo marco explícitamente como **el único cambio de esta fase con efecto visible**, y no lo voy a ejecutar sin que me lo confirmes aparte, aunque el diseño ya lo deja listo.

### Eventos: se quedan fuera de este modelo, a propósito

Las categorías de evento (`church/courses/meetups/other`) son un ENUM fijo de Postgres, no filas de `categories`, y no las hago city-scoped: es una taxonomía estructural pequeña y universal (toda ciudad tiene iglesias, cursos, encuentros), no un catálogo editorial como las de negocio. Si en el futuro una ciudad necesita una categoría de evento adicional, en ese momento se evalúa si conviene migrar eventos también a la tabla `categories` — no antes.

---

## 4. Roles por ciudad

### Problema que resuelve

Hoy `is_admin()` es un booleano global leído desde `auth.users.raw_user_meta_data`. Es el hallazgo de mayor severidad de la auditoría original: el día que exista una segunda ciudad, cualquier fila con `role = 'admin'` tiene permiso de `ALL` sobre negocios, avisos, reclamos y destacados de **todas** las ciudades, no solo la suya.

### Esquema propuesto

```sql
CREATE TABLE public.community_city_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES public.community_cities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (city_id, user_id, role)
);
```

Dos roles para partir (ampliable después sin romper nada, es solo un CHECK):
- **`admin`**: control total de su ciudad — categorías propias, banners, popups, destacados, gestión de negocios/avisos/eventos, y (si se implementa) invitar `moderator`s.
- **`moderator`**: solo moderación de contenido (aprobar/rechazar avisos y eventos pendientes, revisar reclamos) — no puede tocar categorías, banners ni destacados.

### Rol de plataforma (para ti, no para admins de ciudad)

Alguien necesita poder operar sobre todas las ciudades (soporte, gestión del catálogo global de categorías, alta de ciudades nuevas). En vez de una tabla, lo más simple y seguro es una claim en `app_metadata` (no editable por el usuario, a diferencia de `user_metadata`):

```sql
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

`is_city_admin` ya incluye `is_platform_admin` (un super-admin de plataforma puede administrar cualquier ciudad), y `is_city_moderator` ya incluye `is_city_admin` (un admin puede hacer todo lo que puede un moderador). Esto evita repetir el `OR` en cada policy.

**Importante: `is_admin()` (la función actual) no se toca ni se borra en esta fase.** Las funciones nuevas se agregan al lado, sin reemplazar nada todavía — el reemplazo de políticas ocurre recién en la fase de migración (sección 6), tabla por tabla.

---

## 5. RLS segura: qué cambia y qué no

Este es el punto que más conviene aclarar antes de escribir una sola política, porque **no todo el contenido necesita el mismo tipo de protección**.

### Lecturas (SELECT): no son el problema de seguridad

Los negocios, avisos y eventos son públicos por diseño — cualquiera puede verlos hoy sin login, sea de Coronel o no. Que un visitante vea contenido "de otra ciudad" mezclado no es una fuga de datos, es un bug de UX/producto (se soluciona con `.eq('city_id', ...)` en el cliente, igual que cualquier otro filtro de búsqueda). Por eso las políticas `SELECT ... USING (true)` que existen hoy **se pueden dejar como están** en la mayoría de las tablas — no hace falta tocarlas para tener aislamiento real entre ciudades a nivel de lo que le importa a la seguridad.

Excepción: contenido no público por estado (avisos `pending`, negocios sin aprobar) donde ya existe lógica de visibilidad — ahí sí conviene, cuando se llegue a esa política, agregar el filtro de ciudad como buena práctica adicional, pero no es lo urgente.

### Escrituras (INSERT/UPDATE/DELETE) y moderación: aquí sí importa

El riesgo real es: **¿puede un admin de Coronel aprobar/editar/borrar una fila que pertenece a Talca?** Hoy, con `is_admin()` global, la respuesta sería "sí" el día que exista Talca. El arreglo es reemplazar `public.is_admin()` por `public.is_city_admin(city_id)` **leyendo el `city_id` de la fila que se está escribiendo**, no de una variable de sesión ni de un header que el cliente podría falsear:

```sql
-- Antes (global, riesgo de cross-tenant):
CREATE POLICY "admin_manage_businesses" ON public.businesses
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Después (seguro, evaluado por fila):
CREATE POLICY "admin_manage_businesses" ON public.businesses
FOR ALL TO authenticated
USING (public.is_city_admin(city_id))
WITH CHECK (public.is_city_admin(city_id));
```

Como `city_id` es una columna de la propia fila, Postgres la evalúa por cada fila afectada — un admin de Coronel jamás puede pasar la condición para una fila con `city_id` de Talca, sin importar lo que el cliente envíe. Esto es la propiedad de seguridad real que se gana con este diseño.

Las políticas de **dueño** (`owner_id = auth.uid()`) no cambian — un dueño de negocio sigue pudiendo editar su propio negocio sin importar la ciudad, eso ya es correcto hoy. Como protección adicional (no bloqueante para esta fase), se puede agregar un trigger `BEFORE UPDATE` que impida cambiar `city_id` en una fila existente, para que nadie pueda "mudar" un negocio de ciudad manipulando el payload.

### ¿Cómo sabe la app qué `city_id` mandar?

Esto es resolución de la app, no de RLS: el frontend determina "en qué sitio estoy" por dominio/subdominio contra `community_cities` (fuera del alcance de este documento — es la evolución natural de `CITY_CONFIG` mencionada en la sección 1) y estampa ese `city_id` en cada INSERT. Las políticas `WITH CHECK` en INSERT deberían verificar, como mínimo, que el `city_id` enviado corresponde a una ciudad activa (`EXISTS (SELECT 1 FROM community_cities WHERE id = city_id AND status = 'active')`) — así un cliente no puede insertar contenido en una ciudad que no existe o que está en `onboarding`.

### Categorías: quién puede escribir en el catálogo global

Con el modelo híbrido de la sección 3, la política de escritura de `categories` queda:

```sql
CREATE POLICY "admin_manage_categories" ON public.categories
FOR ALL TO authenticated
USING (
  (city_id IS NULL AND public.is_platform_admin())
  OR (city_id IS NOT NULL AND public.is_city_admin(city_id))
)
WITH CHECK (
  (city_id IS NULL AND public.is_platform_admin())
  OR (city_id IS NOT NULL AND public.is_city_admin(city_id))
);
```

Un admin de ciudad puede crear/editar categorías propias de su ciudad, pero no puede tocar el catálogo global — solo tú (platform admin) puedes.

---

## 6. Plan de migración progresiva (sin romper producción)

Cada fase es aditiva, independiente, verificable y reversible. Ninguna fase depende de que el frontend cambie el mismo día — el objetivo explícito es que, después de cada fase, `koronel.cl` en producción siga funcionando exactamente igual que antes, sin que nadie lo note.

### Fase A — Fundacional (solo esquema nuevo, cero impacto)

1. Crear `community_cities`. Insertar **una fila**: Coronel, con los mismos valores que hoy son default en `src/config/city.js` (nombre, región, país, locale, moneda, prefijo telefónico, centro de mapa, `site_name`, `media_base_url`, `admin_whatsapp`). Guardar su `id` (`CORONEL_ID`).
2. Crear `community_city_roles`. Insertar manualmente una fila: `(city_id=CORONEL_ID, user_id=<uuid de carlos@coronellocal.cl>, role='admin')`.
3. Crear las funciones `is_platform_admin()`, `is_city_admin()`, `is_city_moderator()` — nuevas, no reemplazan nada.
4. Agregar `category_type` (default `'business'`) y `city_id` (nullable) a `categories`. Sin backfill de `city_id` necesario — `NULL` ya es el estado final correcto (global).

**Verificación de la fase**: `koronel.cl` no tiene ningún código que lea estas tablas nuevas todavía. Riesgo: ninguno.

### Fase B — `city_id` nullable en tablas de contenido (aditiva)

Para cada tabla de la lista de la sección 2 (`businesses`, `classified_ads`, `events`, `jobs`, `community_posts`, `banners`, `popups`, `featured_listings`, `suggested_businesses`, `daily_post_tracking`):

1. `ALTER TABLE x ADD COLUMN city_id UUID REFERENCES community_cities(id)` — nullable.
2. `UPDATE x SET city_id = CORONEL_ID WHERE city_id IS NULL` — backfill de todas las filas existentes.
3. Crear índice `idx_x_city_id`.
4. **No** poner `NOT NULL` todavía.

**Por qué es segura**: la columna existe y está poblada, pero nada la exige. Cualquier INSERT existente que no la mencione sigue funcionando (queda `NULL`, se puede volver a correr el backfill). Ningún query existente cambia de resultado, porque nadie filtra por ella todavía.

**Verificación de la fase**: correr `SELECT count(*) FROM x WHERE city_id IS NULL` en cada tabla — debe dar 0 después del backfill, y volver a dar 0 en cualquier chequeo posterior mientras dure la transición (si algo lo rompe, es una señal de que hay un INSERT sin actualizar, detectable antes de tocar RLS).

### Fase C — Frontend empieza a usar `city_id` (progresiva, tabla por tabla)

1. El frontend resuelve `activeCity` (por ahora, fijo a Coronel vía config — la resolución por dominio es un paso posterior, fuera de este documento).
2. Cada servicio (`businessService`, `adService`, `eventService`, etc.) empieza a mandar `city_id: activeCity.id` en sus INSERT, y opcionalmente `.eq('city_id', activeCity.id)` en sus SELECT.
3. Como el 100% de las filas ya tiene `city_id = CORONEL_ID` (Fase B), agregar el filtro **no cambia ni un resultado** en la única ciudad activa hoy — es matemáticamente un no-op, verificable comparando el conteo de filas devueltas antes/después.
4. Se puede desplegar servicio por servicio, cada uno con su propio commit y verificación — mismo patrón granular que las fases anteriores de este proyecto.

### Fase D — Endurecer (solo cuando todo lo anterior esté verificado)

1. `ALTER TABLE x ALTER COLUMN city_id SET NOT NULL` — recién acá, y solo tabla por tabla, después de confirmar 0 nulos y que el 100% de los INSERT de esa tabla ya mandan `city_id`.
2. Reemplazar políticas RLS de `is_admin()` a `is_city_admin(city_id)`, tabla por tabla. Cada swap es un archivo de migración independiente, revertible.
3. Verificar después de cada swap que el admin actual (con su fila en `community_city_roles` desde la Fase A) mantiene acceso completo.
4. `is_admin()` no se borra — queda en desuso pero presente, como red de seguridad, hasta que se confirme que ninguna política la referencia.

### Fase E — Segunda ciudad (la prueba real)

1. Insertar una fila nueva en `community_cities` (Talca, o una ciudad de prueba) en estado `onboarding`.
2. Dar de alta su admin en `community_city_roles`.
3. Recién acá se implementa la resolución de "ciudad activa" por dominio/subdominio en el frontend (hoy pendiente, fuera de este documento).
4. Publicar (`status='active'`, `is_public=true`) cuando esté lista.

Si las Fases A–D se hicieron bien, el aislamiento de Talca respecto a Coronel es automático — no requiere tocar cada tabla de nuevo, que es exactamente el resultado que buscamos.

### Resumen de riesgo por fase

| Fase | Toca producción hoy | Reversible | Requiere cambios de frontend |
|---|---|---|---|
| A | No | Sí (DROP TABLE) | No |
| B | No (columna nullable + backfill) | Sí | No |
| C | Sí, pero comportamiento idéntico (verificable) | Sí (dejar de mandar el filtro) | Sí, incremental |
| D | Sí — es el único punto de "no video fácil marcha atrás" en RLS | Parcial (revertir política es fácil; NOT NULL requiere migración inversa) | No (ya se hizo en C) |
| E | No a Coronel; alta de una ciudad nueva | Sí (desactivar la ciudad) | Sí (resolución por dominio) |

---

## 7. Decisiones que necesito que confirmes antes de escribir migraciones

1. **Nombre de la entidad raíz**: ¿`community_cities`/`city_id` (recomendado, sección 1) o `community_sites`/`site_id`?
2. **Modelo de categorías**: ¿híbrido global + override por ciudad (recomendado, sección 3) o completamente aisladas por ciudad desde el día uno?
3. **Seed de categorías de avisos clasificados**: la sección 3 identificó que hoy no hay categorías utilizables para avisos. ¿Confirmas que en la fase de implementación se pueda sembrar el catálogo correcto (Vehículos, Inmuebles, Electrónica...), sabiendo que es el único cambio con efecto visible de todo este diseño?
4. **Roles v1**: ¿alcanza con `admin`/`moderator` (sección 4) o necesitas un tercer nivel ya (por ejemplo, alguien que solo gestione banners/publicidad sin moderar contenido)?
5. **`community_countries`**: ¿lo dejamos denormalizado en `community_cities` hasta que haya una ciudad fuera de Chile (recomendado), o lo separamos desde ahora?
6. **Resolución de ciudad activa**: hoy koronel.cl usa dominio propio. Para la Fase E, ¿el mecanismo principal debería ser dominio propio por ciudad (`community_cities.domain`) con subdominio como plan B para ciudades que aún no tienen dominio propio, o subdominio como mecanismo principal desde el inicio?

No voy a generar ninguna migración hasta tener tu confirmación sobre estos puntos, especialmente el 1 y el 2 porque cambian nombres de columnas que se propagan a todas partes.
