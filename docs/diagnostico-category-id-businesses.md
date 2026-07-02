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

## 4. Qué necesito que me compartas

1. Resultado completo del punto 1 (`information_schema.columns`).
2. Resultado del punto 2 (aunque sean muchas filas, con que compartas un
   resumen o las primeras 20-30 alcanza para ver el patrón).
3. Los 6 conteos del punto 3.

Con eso identifico con certeza (no con hipótesis): cuál campo tiene el
rubro real hoy, si el problema es que `category_id` nunca se pobló, si
en cambio es `category_key` el que está vacío para la mayoría, o si el
dato real vive en el `category` de texto libre sin ninguna key asociada
— y recién ahí armamos el backfill seguro (aditivo, con `UPDATE`
acotado, nunca tocando negocios que ya tengan el campo bien poblado).

No se aplica ningún backfill ni migración todavía.
