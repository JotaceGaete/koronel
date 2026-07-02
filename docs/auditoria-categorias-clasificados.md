# Auditoría SQL: categorías de negocio vs. avisos clasificados

**Estado: SQL de solo lectura. No borra, no fusiona, no modifica nada.**
Correr en el editor SQL de Supabase y compartir el resultado antes de
decidir cualquier limpieza de datos.

## Contexto (lo que ya sé por el código, para no repetir el diagnóstico)

Reconstruí la secuencia completa de migraciones que tocan `categories`:

1. `20260304200000_seed_ad_categories.sql` — sembró 10 categorías de
   avisos (`vehiculos`, `inmuebles`, `electronica`, `ropa-accesorios`,
   `empleos`, `servicios`, `muebles-hogar`, `deportes-recreacion`,
   `mascotas`, `otros`), solo porque la tabla estaba vacía en ese
   momento.
2. `20260305220000_clear_seeded_categories.sql` — **un día después**,
   `DELETE FROM public.categories;` sin condición, borra absolutamente
   todo lo anterior (incluida la seed del punto 1).
3. `20260310000000_business_category_hierarchy.sql` — la tabla está
   vacía otra vez → siembra ~40 categorías jerárquicas de negocio
   (`restaurantes`, `salud`, `automotriz`, `servicios-negocio`,
   `tecnologia-negocio`, etc., con hijos). **Cero solapamiento de
   `name_key`** con la seed del punto 1 (lo verifiqué comparando ambas
   listas completas).
4. `20260621000004_add_category_type_and_city.sql` (mía) — agrega
   `category_type DEFAULT 'business'`. En este punto, dado 2 y 3, **lo
   único que existía en la tabla eran las ~40 categorías de negocio** —
   así que, a diferencia de lo que temía en el diagnóstico anterior,
   el default `'business'` aplicado a filas existentes **sí era
   correcto** para todas ellas.
5. `20260621000005_seed_classified_ad_categories.sql` (mía) — inserta 10
   categorías nuevas con `category_type='classified_ad'`. Como en el
   punto 4 no había ningún `name_key` de avisos preexistente (se había
   borrado en el punto 2), **ninguna de las 10 chocó por `ON CONFLICT`**
   — las 10 se insertaron limpias. Esto coincide exactamente con lo que
   confirmaste antes (`categorías classified_ad = 10`).

**Corrección a mi diagnóstico anterior:** no hay evidencia de categorías
duplicadas o mal etiquetadas por mis migraciones — la secuencia real
(seed → delete → re-seed de negocio → mi category_type → mi seed de
avisos) no genera colisión. Esta auditoría SQL es para **confirmar esto
con datos reales**, no para asumir que ya está resuelto solo porque el
historial de migraciones lo sugiere — podría haber datos manuales
insertados fuera de las migraciones que rompan esta reconstrucción.

## Schema real (importante para interpretar los resultados)

- `businesses.category_id` — **existe**, `UUID REFERENCES categories(id)`
  (agregado en `20260310000000`). También tiene `category_key` (texto).
- `classified_ads` — **no tiene `category_id`**, nunca se agregó en
  ninguna migración. Solo tiene `category` (texto libre, nombre) y
  `category_key` (texto, slug). El conteo de avisos por categoría tiene
  que hacerse por `category_key`, no por `category_id`.

## SQL de auditoría

### 1. Todas las categorías, con tipo y ciudad

```sql
SELECT id, name, name_key, category_type, city_id, parent_id, is_active, sort_order
FROM public.categories
ORDER BY category_type, name_key;
```

### 2. Solo las categorías de avisos (para ver exactamente cuáles 10 hay)

```sql
SELECT id, name, name_key, category_type, city_id
FROM public.categories
WHERE category_type = 'classified_ad'
ORDER BY sort_order;
```

### 3. Búsqueda de posibles duplicados conceptuales (mismo nombre, distinto name_key/tipo)

```sql
SELECT name, count(*) AS filas, array_agg(name_key) AS name_keys, array_agg(category_type) AS tipos
FROM public.categories
GROUP BY name
HAVING count(*) > 1
ORDER BY name;
```

### 4. Avisos por categoría (por `category_key`, que es lo único que existe en `classified_ads`)

```sql
SELECT
  ca.category_key,
  c.id AS category_id_resuelto,
  c.name AS category_name_resuelto,
  c.category_type,
  count(*) AS avisos
FROM public.classified_ads ca
LEFT JOIN public.categories c ON c.name_key = ca.category_key
GROUP BY ca.category_key, c.id, c.name, c.category_type
ORDER BY avisos DESC;
```

Si alguna fila sale con `category_type` distinto de `classified_ad` (o
`NULL`, es decir sin match en `categories`), es la señal concreta de un
aviso mal categorizado.

### 5. Negocios por categoría (sí existe `category_id`, cruce directo)

```sql
SELECT
  b.category_id,
  c.name AS category_name,
  c.category_type,
  count(*) AS negocios
FROM public.businesses b
LEFT JOIN public.categories c ON c.id = b.category_id
GROUP BY b.category_id, c.name, c.category_type
ORDER BY negocios DESC;
```

Igual que arriba: si aparece algún `category_type` que no sea `business`
(o `NULL`), es un negocio con categoría inconsistente.

### 6. El aviso "actor" específico (para confirmar qué categoría quedó guardada realmente)

```sql
SELECT id, title, category, category_key, ad_status, created_at
FROM public.classified_ads
WHERE title ILIKE '%actor%'
ORDER BY created_at DESC;
```

## Qué NO hace este SQL

No borra, no actualiza, no fusiona ninguna fila. Es 100% `SELECT`. La
decisión de qué hacer con los resultados (si hay algo que corregir) se
toma después de ver los números reales, no antes.
