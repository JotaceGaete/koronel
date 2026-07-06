# Reconciliación Fase A/B — migraciones aplicadas parcialmente a mano

## Contexto

Al aplicar `20260621000003_create_city_role_functions.sql` (entonces
nombrada `20260601000003_...`) en el editor SQL de Supabase, falló con:

```
ERROR: 42P01: relation "public.community_city_roles" does not exist
```

Diagnóstico inicial: ninguna de las 7 migraciones de la Fase A/B figuraba
como aplicada en `supabase_migrations.schema_migrations`, pero la tabla
`community_cities` ya existía porque parte del SQL se corrió a mano.

## Estado confirmado (diagnóstico de la Sección 2 ya ejecutado)

El usuario corrió el diagnóstico de solo lectura y confirmó:

- `community_cities` existe y la fila `coronel` tiene los valores
  correctos (sin drift).
- `community_city_roles` existe.
- `is_platform_admin`, `is_city_admin`, `is_city_moderator` existen.
- `categories` tiene `category_type` y `city_id`.
- Las 9 tablas de contenido tienen `city_id`.
- `daily_post_tracking` tiene `city_id`.
- Backfill de `city_id`: 0 nulos en todas las tablas.
- Categorías `classified_ad`: ya hay 10 filas.
- `schema_migrations` seguía sin registrar ninguna de las 7.
- **Choque de versión detectado:** `20260601000001` ya existía en el
  proyecto como `wa_products_show_price` (migración de Walinka, ajena a
  este repo). Los 7 archivos de Fase A/B tenían que renombrarse a
  timestamps posteriores al último aplicado.

Con esto, la reconciliación de **objetos** (Sección 3.1 de la versión
anterior de este documento) queda cerrada: todo lo que las 7 migraciones
crean ya existe y coincide con lo commiteado. Solo faltaba resolver el
choque de versión y reconciliar `schema_migrations` — lo que cubre el
resto de este documento.

## Renombrado de archivos (hecho)

Se renombraron los 8 archivos (las 7 migraciones multi-ciudad + el hotfix
de seguridad, que también quedaba antes del rango libre) a timestamps
`20260621*`, posteriores al último aplicado en el proyecto:

| Antes | Ahora |
|---|---|
| `20260518000000_secure_admin_role_check.sql` | `20260621000000_secure_admin_role_check.sql` |
| `20260601000001_create_community_cities.sql` | `20260621000001_create_community_cities.sql` |
| `20260601000002_create_community_city_roles.sql` | `20260621000002_create_community_city_roles.sql` |
| `20260601000003_create_city_role_functions.sql` | `20260621000003_create_city_role_functions.sql` |
| `20260601000004_add_category_type_and_city.sql` | `20260621000004_add_category_type_and_city.sql` |
| `20260601000005_seed_classified_ad_categories.sql` | `20260621000005_seed_classified_ad_categories.sql` |
| `20260601000006_add_city_id_to_content_tables.sql` | `20260621000006_add_city_id_to_content_tables.sql` |
| `20260601000007_add_city_id_to_daily_post_tracking.sql` | `20260621000007_add_city_id_to_daily_post_tracking.sql` |

Se actualizaron también los comentarios internos de "depende de..." /
"aplicar ... primero" dentro de cada archivo, y las referencias cruzadas
en `docs/plan-fase-a-b.md` y `docs/hotfix-admin-role.md`, para que sigan
apuntando a nombres de archivo reales.

**No se tocó ninguna otra lógica SQL de estos archivos**, con una sola
excepción explícita, detallada abajo.

## Cambio de contenido: `electronica` → `clasificados-electronica`

En `20260621000005_seed_classified_ad_categories.sql`, la categoría de
clasificados "Electrónica" cambió su `name_key` de `electronica` a
`clasificados-electronica`, para evitar colisión con el `name_key` de la
categoría de negocios existente del mismo nombre (la columna `name_key`
tiene una única `UNIQUE` global, no por `category_type`).

**⚠️ Esto crea una desincronización que hay que resolver antes de marcar
`20260621000005` como aplicada:** el diagnóstico confirmó que ya existen
10 categorías `classified_ad` en la base — es decir, esta migración ya
corrió (a mano) con el valor viejo, `electronica`. `supabase migration
repair` **no ejecuta SQL, solo actualiza el historial** — si se marca
`20260621000005` como aplicada sin más, el archivo del repo va a decir
`clasificados-electronica` mientras la fila real en la base sigue
diciendo `electronica`. Repo y base quedarían desincronizados desde el
día uno para ese valor.

Antes de correr el `repair` de esa migración específica, correr primero
esta verificación:

```sql
SELECT name, name_key FROM public.categories
WHERE category_type = 'classified_ad'
ORDER BY sort_order;
```

- Si aparece una fila con `name_key = 'electronica'`: correr este
  `UPDATE` puntual (seguro, no toca ninguna otra fila) para alinear la
  base con el archivo commiteado, y recién después el `repair`:

```sql
UPDATE public.categories
SET name_key = 'clasificados-electronica'
WHERE category_type = 'classified_ad' AND name_key = 'electronica';
```

- Si ya aparece `clasificados-electronica` (por ejemplo, porque el SQL
  manual que se corrió ya tenía ese ajuste): no hace falta el `UPDATE`,
  se puede marcar aplicada directamente.

## ⚠️ Pendiente de confirmar: el hotfix de seguridad (`20260621000000`)

El diagnóstico que se compartió cubre únicamente las 7 migraciones
multi-ciudad. **No confirma si `20260621000000_secure_admin_role_check.sql`
(el hotfix de `is_admin()`/`is_admin_user()`, ver
`docs/hotfix-admin-role.md`) está realmente aplicado en la base.**

Por eso, más abajo se da el comando `repair` para las 7 migraciones
multi-ciudad, pero **no** para el hotfix — marcarlo como aplicado sin
confirmar dejaría al tooling creyendo que el fix de seguridad está en
producción cuando podría no estarlo, que es peor que no tener el comando.

Antes de pedir ese comando, correr esto y compartir el resultado:

```sql
-- ¿La política/función is_admin() ya solo lee raw_app_metadata,
-- o todavía depende de raw_user_meta_data (inseguro)?
SELECT prosrc FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace::oid;

-- ¿El admin real (contacto@walinka.com) ya tiene el rol en app_metadata,
-- no solo en user_metadata?
SELECT email, raw_app_metadata->>'role' AS app_role, raw_user_meta_data->>'role' AS user_role
FROM auth.users WHERE email = 'contacto@walinka.com';
```

Si esto confirma que el hotfix ya está aplicado tal cual el archivo, se
agrega el `repair --status applied 20260621000000` correspondiente. Si
no, hay que aplicarlo primero (es un tema aparte, ya diseñado y
aprobado en `docs/hotfix-admin-role.md`, pendiente solo de ejecución).

## Comandos de reconciliación de `schema_migrations`

Para las **7 migraciones multi-ciudad**, con el estado de objetos ya
confirmado 100% completo y correcto (ver sección de arriba), y **una vez
resuelto el punto de `clasificados-electronica` de la sección anterior**:

```
supabase migration repair --status applied 20260621000001
supabase migration repair --status applied 20260621000002
supabase migration repair --status applied 20260621000003
supabase migration repair --status applied 20260621000004
supabase migration repair --status applied 20260621000005
supabase migration repair --status applied 20260621000006
supabase migration repair --status applied 20260621000007
```

Notas:

- Estos comandos **no ejecutan SQL**, solo actualizan
  `supabase_migrations.schema_migrations` para que el CLI sepa que estas
  versiones ya están aplicadas y no intente volver a correrlas (ni
  marque conflicto) en un futuro `supabase db push`.
- Correrlos en orden no es estrictamente necesario (cada uno es
  independiente a nivel de bookkeeping), pero mantenerlo así deja el
  historial más fácil de auditar.
- `20260621000000` (hotfix) queda deliberadamente fuera de esta lista
  hasta confirmar lo de la sección anterior.
- Si el proyecto no usa `supabase db push` para desplegar (todo se hace
  desde el editor SQL del dashboard), este paso sigue siendo recomendable
  para que el historial no mienta, pero no es bloqueante para que la app
  funcione — el contenido real de la base (ya confirmado correcto) es lo
  que importa funcionalmente.
