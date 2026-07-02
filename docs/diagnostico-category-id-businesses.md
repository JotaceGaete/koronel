# Diagnóstico: `category_id` null en negocios con coordenadas

**Estado: diagnóstico. Ningún SQL de este documento escribe nada — todo
es `SELECT`. No se toca `MapSearchBar.jsx`, Leaflet, ni ninguna
migración todavía.**

## Antes de correr tu consulta de datos: dos columnas no existen en el esquema conocido

Reconstruí el historial completo de columnas de `businesses` en las
migraciones de este repo. **`rubro_id` y `business_category_id` nunca
se crearon en ninguna migración** — si no existen tampoco en el
esquema real, tu consulta original va a fallar con
`column does not exist`. Por eso el primer paso (schema real) va antes
de la consulta de datos, tal como pediste.

Además encontré una segunda cosa relevante para esta misma auditoría,
que no estaba buscando pero apareció al reconstruir el historial:

**Hay dos pares de columnas de coordenadas, no uno.** El esquema
original (`20260304161514_coronellocal_schema.sql`) solo tenía
`latitude`/`longitude` (`NUMERIC(10,7)`). Una migración posterior
(`20260304180000_map_events_update.sql`) agregó **columnas nuevas**
`lat`/`lng` (`FLOAT8`), y otra más (`20260315_standardize_business_coords.sql`)
hizo un backfill de `lat`/`lng` a partir de `latitude`/`longitude`
**solo donde `lat`/`lng` estaban `NULL`**. El mapa
(`mapService.getBusinessesForMap()`) filtra por `lat`/`lng` — **no**
por `latitude`/`longitude`. Tu consulta original pedía
`b.latitude`/`b.longitude`; la ajusto a `lat`/`lng` para que refleje
exactamente lo que el mapa usa, y agrego ambos pares para poder
comparar si hay negocios con `latitude`/`longitude` cargados pero
`lat`/`lng` en `NULL` (esos nunca aparecerían en el mapa,
independientemente de cualquier tema de categoría).

## Pista adicional encontrada en el historial (hipótesis, no confirmada)

`supabase/migrations/20260305220000_clear_seeded_categories.sql`
(`DELETE FROM public.categories;` sin condición — el mismo incidente
que ya documentamos en `docs/incidente-delete-categories-produccion.md`,
pero esta vez encontrado en el *historial de migraciones*, no en algo
ejecutado a mano) trae este comentario:

```sql
-- Clear all seeded/demo categories so admin can create their own
-- This removes all categories inserted by the hierarchy migration seed
-- Businesses with category_id will have it set to NULL (ON DELETE SET NULL)
DELETE FROM public.categories;
```

Cronológicamente esta migración es **anterior** a la que agrega la
columna `category_id` a `businesses`
(`20260310000000_business_category_hierarchy.sql`), así que ese
comentario no puede referirse al estado de la base en el momento en que
se escribió — probablemente describe un efecto real pero de una
versión de este archivo distinta a la que quedó en el historial, o
`category_id` existió en producción antes de que cualquier migración
lo capturara (coherente con el patrón de deriva manual que ya vimos
varias veces esta sesión). **Lo dejo como hipótesis, no como
conclusión** — es exactamente el tipo de cosa que el `SELECT` de datos
de abajo va a confirmar o descartar con evidencia real, no con
arqueología de archivos.

## 1. Schema real de `businesses` (correr primero)

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'businesses'
order by ordinal_position;
```

Con el resultado, confirmamos qué de esto es real hoy:
`category`, `category_key`, `category_id`, `category_type`,
`latitude`, `longitude`, `lat`, `lng`, `city_id` (de mi propia
migración multi-ciudad), y si aparece algo que no está en ninguna
migración de este repo (como `rubro`/`rubro_id`), sabremos que hay
deriva de esquema no capturada en git — igual que pasó con
`wa_products_show_price` y con el `DELETE` de categorías.

## 2. Auditoría de datos (ajustada a las columnas reales conocidas — correr después de confirmar el punto 1)

```sql
select
  b.id,
  b.name,
  b.category,
  b.category_key,
  b.category_id,
  b.category_type,
  b.latitude,
  b.longitude,
  b.lat,
  b.lng
from public.businesses b
where b.lat is not null
  and b.lng is not null;
```

Si `information_schema` del punto 1 muestra columnas distintas a las
listadas acá (por ejemplo, si `category_type` no existe todavía porque
esa migración no se aplicó, o si aparece algo inesperado), ajustar esta
consulta antes de correrla — no asumir que esta lista está completa.

## 3. Conteos que necesito para el diagnóstico

```sql
-- Total de negocios que el mapa puede ubicar (con lat/lng, que es lo que usa el mapa)
select count(*) as total_con_coords
from public.businesses
where lat is not null and lng is not null;

-- De esos, cuántos tienen category_id null
select count(*) as con_coords_category_id_null
from public.businesses
where lat is not null and lng is not null and category_id is null;

-- De esos, cuántos tienen category_key null o vacío (lo que el mapa realmente usa para filtrar)
select count(*) as con_coords_category_key_null
from public.businesses
where lat is not null and lng is not null and (category_key is null or category_key = '');

-- De esos, cuántos tienen category (texto libre) pero no category_key
select count(*) as con_coords_category_texto_sin_key
from public.businesses
where lat is not null and lng is not null
  and category is not null and category <> ''
  and (category_key is null or category_key = '');

-- Negocios con latitude/longitude cargados pero lat/lng NULL (nunca aparecerían en el mapa, aparte del tema categoría)
select count(*) as con_latlong_legacy_pero_sin_lat_lng
from public.businesses
where latitude is not null and longitude is not null
  and (lat is null or lng is null);

-- Cruce: ¿los category_key que sí existen matchean algo real en categories?
select
  b.category_key,
  c.id as category_id_real,
  c.name as category_name_real,
  count(*) as negocios
from public.businesses b
left join public.categories c on c.name_key = b.category_key
where b.lat is not null and b.lng is not null
group by b.category_key, c.id, c.name
order by negocios desc;
```

## 4. Resultados recibidos — actualización

Se corrieron el punto 1 (schema) y una versión del cruce del punto 3.
Dos hallazgos:

**Error mío a corregir:** mi consulta del punto 2 incluía
`b.category_type` — esa columna existe en `categories`, **no** en
`businesses` (confirmado por el schema real recibido, que no la lista).
Las consultas de la sección 3 más abajo ya no la usan.

**Hallazgo grave, no anticipado:** el cruce `business.category_key`
contra `categories.name_key` devuelve `category_id_real: null` /
`category_name_real: null` para **`category_key = 'restaurantes'`** —
y `restaurantes` **sí es** un `name_key` real, definido explícitamente
en `20260310000000_business_category_hierarchy.sql:48`
(`VALUES ('Restaurantes', 'restaurantes', ...)`). Si el join no
encuentra esa fila, la explicación más simple y consistente con todo lo
que ya sabemos de esta sesión es: **las ~40 categorías de negocio ya no
existen en `categories`** — se perdieron con el `DELETE FROM
public.categories` accidental, y yo solo reseedé las 10 categorías de
avisos clasificados
(`20260702000000_reseed_classified_ad_categories_after_incident.sql`),
dejando explícitamente pendiente el reseed de las categorías de negocio
en `docs/incidente-delete-categories-produccion.md`. Esto **no está
confirmado todavía con un conteo directo** — es la hipótesis más fuerte,
a confirmar con la consulta 1 de la sección 5.

Además, los `category_key` reales que sí aparecen en negocios
(`mecanicos`, `comida-peruana`, `envases`, `ropa-segunda-seleccion`,
`farmacia`, `comida-para-llevar`, `sushi`) **no coinciden con ningún
`name_key` de la jerarquía original** (que usa slugs como
`automotriz-mecanica`, `salud-farmacia`, etc.). Esto sugiere que esos
negocios se cargaron por una vía que genera `category_key` a partir de
texto libre (p. ej. slugificando el nombre de categoría de Google
Places al importar), sin pasar por el selector jerárquico del panel
admin — un problema de datos independiente y adicional al de la tabla
`categories` vacía.

## 5. Consultas pendientes (corregidas, sin `category_type` en `businesses`)

```sql
-- ¿Cuántas categorías hay hoy, y de qué tipo? (confirma o descarta la hipótesis de arriba)
select category_type, count(*) as filas
from public.categories
group by category_type;

-- ¿Existen hoy las categorías de negocio puntuales que ya sabemos que deberían existir?
select id, name, name_key, category_type
from public.categories
where name_key in ('restaurantes', 'salud-farmacia', 'ferreterias', 'supermercados', 'iglesias-templos');

select count(*) as total_con_coords
from public.businesses
where lat is not null and lng is not null;

select count(*) as con_coords_category_id_null
from public.businesses
where lat is not null and lng is not null and category_id is null;

select count(*) as con_coords_category_key_null_o_vacio
from public.businesses
where lat is not null and lng is not null and (category_key is null or category_key = '');

select count(*) as con_latlong_legacy_pero_sin_lat_lng
from public.businesses
where latitude is not null and longitude is not null
  and (lat is null or lng is null);

-- Todos los category_key distintos en negocios con coords (no solo los primeros 10)
select category_key, count(*) as negocios
from public.businesses
where lat is not null and lng is not null
group by category_key
order by negocios desc;
```

## 6. Conclusión confirmada

```sql
select category_type, count(*) as filas from public.categories group by category_type;
-- Success. No rows returned.
```

`GROUP BY` sin ninguna fila en el resultado solo es posible si la tabla
no tiene **ninguna** fila. **`categories` está completamente vacía —
0 filas, ni de negocio ni de avisos clasificados.**

Esto es más severo que la hipótesis anterior ("se perdieron las de
negocio, pero las de avisos siguen"). Lo más probable:
`20260702000000_reseed_classified_ad_categories_after_incident.sql`
(la migración que ya escribí para restaurar las 10 categorías de
avisos) **nunca se ejecutó en producción** — existe en el repo desde
hace días, pero yo no tengo forma de confirmar que se corrió, y este
resultado indica que no.

Esto también implica que el formulario "Nuevo aviso" debería estar
mostrando cero categorías ahora mismo, no solo el mapa — es el mismo
problema raíz (`categories` vacía) con dos síntomas distintos.

De los 29 negocios con `lat`/`lng` (sección 4), separado del tema
`categories` vacía:
- **20 (69%)** tienen `category_key` `null` o `''` — no hay ningún
  dato de rubro que backfillear para estos, ni siquiera texto libre
  útil; requieren asignación manual o quedan sin categoría.
- **9** tienen algún `category_key`, pero solo 2 (`restaurantes`) se
  parecen a la taxonomía formal — el resto (`mecanicos`,
  `comida-peruana`, `envases`, `ropa-segunda-seleccion`, `farmacia`,
  `comida-para-llevar`, `sushi`) son valores ad-hoc que no
  corresponden a ningún `name_key` de
  `20260310000000_business_category_hierarchy.sql`.

## 7. Plan (a confirmar antes de escribir ninguna migración)

Dos problemas distintos, dos soluciones distintas:

**A. `categories` vacía** — recuperable con un reseed, mismo patrón que
ya usamos para avisos clasificados:
1. Confirmar contigo si el reseed de avisos (`20260702000000`) se
   corrió o no — si no, correrlo primero, es independiente de esto.
2. Preparar una migración nueva (timestamp de hoy, aditiva, `ON
   CONFLICT ... DO UPDATE`, mismo criterio que el reseed de avisos) que
   restaure las ~40 categorías de negocio con el contenido exacto de
   `20260310000000_business_category_hierarchy.sql`.

**B. Los 29 negocios con `category_key` ad-hoc o vacío** — no se
arregla solo repoblando `categories`, porque:
- Los 20 sin `category_key` no tienen ningún dato de rubro que
  mapear — quedarían sin categoría hasta que alguien la asigne a mano
  (vía panel admin, ya con `categories` repoblada).
- Los 9 con valor ad-hoc necesitan una decisión: ¿mapear cada uno a la
  categoría formal más parecida (`mecanicos` → `automotriz-mecanica`,
  `farmacia` → `salud-farmacia`, etc.), o crear categorías nuevas para
  los rubros que no tienen equivalente formal (`sushi`, `comida-peruana`,
  `envases`, `ropa-segunda-seleccion`, `comida-para-llevar` no calzan
  claramente en ninguna categoría de las ~40 originales)?

No implemento ninguna de las dos todavía — a la espera de que confirmes
lo del reseed de avisos y de tu decisión sobre el punto B antes de
escribir la migración de categorías de negocio.
