# Incidente: `DELETE FROM public.categories` ejecutado en producción

**Contexto:** tras desplegar el commit `36d194b`, se ejecutó manualmente
en producción `DELETE FROM public.categories;` (copiado, probablemente,
del contenido histórico de `20260305220000_clear_seeded_categories.sql`
citado en `docs/auditoria-categorias-clasificados.md` como referencia,
no como algo para ejecutar de nuevo).

## 1. Confirmación (correr primero, es de solo lectura)

```sql
select count(*) from public.categories;

select id, name, name_key, category_type, city_id
from public.categories
order by category_type, name;
```

Si el conteo da `0`, todo lo que sigue aplica. Si da algo distinto de
`0` (por ejemplo, si alguna categoría se recreó a mano después del
`DELETE`), el `UPSERT` de la sección 3 sigue siendo seguro igual —
no depende de que la tabla esté vacía.

### 1.1 Verificación adicional recomendada (opcional, también de solo lectura)

El `DELETE` no solo vació `categories` — al ejecutarse, disparó
`ON DELETE SET NULL` en la FK `businesses.category_id`. Esto es
relevante aunque no sea lo que pediste reparar ahora; para dimensionarlo:

```sql
select count(*) as businesses_sin_category_id
from public.businesses
where category_id is null;

select count(*) as businesses_con_key_recuperable
from public.businesses
where category_id is null and category_key is not null;
```

## 2. Impacto real, confirmado por esquema (no por suposición)

- **`classified_ads` NO tiene `category_id`** — nunca se agregó esa
  columna (confirmado leyendo el `CREATE TABLE` original). Solo tiene
  `category` (texto, nombre) y `category_key` (texto, slug), sin FK a
  `categories`. **El `DELETE` no tocó ni un solo aviso existente** — sus
  columnas `category`/`category_key` siguen intactas. En cuanto
  `categories` tenga de nuevo filas con esos mismos `name_key`, los
  avisos existentes vuelven a resolver su categoría correctamente sin
  tocarlos (el join es por `name_key`, no por id).
- **`businesses.category_id` SÍ es una FK real**
  (`REFERENCES public.categories(id) ON DELETE SET NULL`, agregada en
  `20260310000000_business_category_hierarchy.sql`). El `DELETE` puso en
  `NULL` el `category_id` de **todo negocio que tuviera uno asignado**.
  **Pero** `businesses` también guarda `category` (texto) y
  `category_key` (texto) de forma independiente al `category_id` —
  esas dos columnas **no se tocaron**, así que el nombre de categoría
  que se muestra en las tarjetas de negocio (que lee `business.category`
  directamente, no vía join) no debería haberse perdido visualmente.
  Lo que sí se rompió es cualquier flujo que dependa del `category_id`
  específicamente: el desplegable de categoría en el formulario de
  editar negocio ya no puede "preseleccionar" la categoría correcta
  (porque el id que tenía guardado ya no existe en ningún lado), y el
  árbol de categorías de negocio (`businessService.getHierarchicalCategories()`)
  está vacío hasta que se reseeden también las ~40 categorías de negocio.
- **Esto último queda fuera de esta migración a propósito** — pediste
  explícitamente reinsertar solo las categorías de avisos y no borrar ni
  tocar nada más. Lo dejo señalado acá para que sea una decisión
  explícita tuya, no algo que se me haya pasado: reseedar categorías de
  negocio y reconectar `businesses.category_id` (recuperable vía
  `category_key`, ya que ese sí sigue intacto) son dos tareas
  adicionales, separadas, pendientes de que las pidas.

## 3. Migración de reseed (no destructiva)

Archivo: `supabase/migrations/20260702000000_reseed_classified_ad_categories_after_incident.sql`.

Mismo contenido que `20260621000005_seed_classified_ad_categories.sql`
(las 10 categorías de avisos, con el `name_key` de Electrónica ya
corregido a `clasificados-electronica`), pero con
`ON CONFLICT (name_key) DO UPDATE` en vez de `DO NOTHING`, para que sea
seguro de correr sin importar si la tabla está vacía, tiene datos
parciales, o alguien ya recreó algo a mano:

```sql
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
```

**Por qué es segura:**
- Si la fila no existe (caso esperado, tabla vacía): la inserta.
- Si la fila ya existe con estos `name_key` (por ejemplo, si alguien la
  recreó a mano después del incidente): solo corrige `category_type` y
  `name`, no toca `id` — así que cualquier cosa que ya la esté
  referenciando por id sigue funcionando.
- No borra ni modifica ninguna fila que no tenga uno de estos 10
  `name_key`. No toca `businesses`, no toca `classified_ads`, no toca
  las categorías de negocio (aunque estén vacías, esta migración no las
  reinserta — alcance deliberadamente acotado a avisos).

**Rollback:** dado que es un upsert, revertir significa borrar
específicamente estas 10 filas por `name_key` si hiciera falta —
no incluyo ese `DELETE` en el archivo (sería, otra vez, un statement
destructivo) — si alguna vez hace falta deshacerlo, se hace a mano y con
cuidado, no como parte de esta migración.

## 4. Cambio visible esperado

Con esta migración aplicada, el formulario "Nuevo aviso" vuelve a
mostrar las 10 categorías de avisos (el fix de `adService.getAdCategories()`
del commit anterior ya filtra correctamente por `category_type`). Los
avisos ya existentes (como el de "actor") vuelven a resolver su
categoría real por `category_key`, sin necesidad de tocarlos.

**No cambia nada más:** no se toca `RecentContentSection.jsx`, no se
reseedan categorías de negocio, no se reconecta `businesses.category_id`.
