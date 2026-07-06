# Diagnóstico: filtrado de categorías en el mapa (`/mapa`)

**Estado: diagnóstico. Solo se agregó un `console.log` temporal de
solo-lectura para confirmar empíricamente la causa — ninguna lógica de
filtrado ni de marcadores se modificó.**

## Hay dos mapas distintos — importante no confundirlos

| Ruta | Página | Selector de categoría | ¿Mismo bug? |
|---|---|---|---|
| `/mapa` | `interactive-map-page` | Lista **estática hardcodeada** en `MapSearchBar.jsx` | **Sí — confirmado abajo** |
| `/buscar` | `business-search-map-page` | Árbol **dinámico** desde `businessService.getHierarchicalCategories()` | No tiene este bug (usa `name_key` real de la DB) |

Este diagnóstico es sobre `/mapa` (`interactive-map-page`), que es donde
está el problema real.

## 1. Dónde se filtran los negocios antes de crear los marcadores

**Archivo:** `src/services/mapService.js`, método `getBusinessesForMap()`
(líneas 6-30).

```js
async getBusinessesForMap({ search = '', category = '' } = {}) {
  let query = supabase
    ?.from('businesses')
    ?.select('id, name, category, category_key, address, phone, lat, lng, featured, verified')
    ?.not('lat', 'is', null);
  ...
  if (category && category !== 'all') {
    query = query?.eq('category_key', category);   // <- el filtro real
  }
  ...
}
```

**Cadena de llamada:** `src/pages/interactive-map-page/index.jsx:102`,
dentro de `loadData()`, llama a
`mapService.getBusinessesForMap({ search: searchVal, category: catVal })`.
El resultado (`bizResult.data`) se guarda en el state `businesses`, que
es lo que efectivamente itera `businesses?.map(...)` para crear cada
`<BusinessMarker>` (línea 192). Es decir: el filtro corre **antes** de
que exista un solo marcador — si el filtro no matchea nada, no hay
marcadores que crear, no es un problema de renderizado de Leaflet.

## 2. Qué propiedad del negocio se usa

**`businesses.category_key`** (columna `TEXT`) — **no** `category_id`.
Esto es una buena noticia parcial: a diferencia del patrón de bug que
sospechabas (comparar un UUID contra un texto), acá ambos lados de la
comparación ya son texto. El problema no es un mismatch de *tipo*, es un
mismatch de *valor*.

## 3. Qué valor entrega el selector de categorías

**Archivo:** `src/pages/interactive-map-page/components/MapSearchBar.jsx`
(líneas 4-31).

```js
const BUSINESS_CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'supermercados', label: 'Supermercados' },
  { value: 'farmacias', label: 'Farmacias' },
  { value: 'restaurantes', label: 'Restaurantes' },
  { value: 'iglesias-templos', label: 'Iglesias' },
  { value: 'ferreterias', label: 'Ferreterías' },
];
```

Estos `value` son **literales escritos a mano en este componente** —
**no** vienen de la tabla `categories` ni de
`businessService.getHierarchicalCategories()` (que es lo que sí usan
`/buscar` y `business-directory-listing`). El clic en un chip llama
`onCategoryChange?.(cat.value)` → `handleCategoryChange` en
`interactive-map-page/index.jsx:130` → `loadData(search, cat)` → ese
mismo string literal llega tal cual a `getBusinessesForMap({ category })`.

## 4. Por qué nunca coinciden — comparación exacta

Los `name_key` reales de categorías de negocio vienen de
`supabase/migrations/20260310000000_business_category_hierarchy.sql`.
Comparando ambas listas:

| Chip del mapa (`MapSearchBar.jsx`) | ¿Existe ese `name_key` real? |
|---|---|
| `supermercados` | ✅ sí, existe tal cual (categoría padre) |
| `farmacias` | ❌ **no existe** — la categoría real es `salud-farmacia` (hija de `salud`) |
| `restaurantes` | ✅ existe como padre, pero ver punto 5 |
| `iglesias-templos` | ✅ sí, existe tal cual |
| `ferreterias` | ✅ sí, existe tal cual |

**El chip "Farmacias" nunca puede traer resultados**, porque
`.eq('category_key', 'farmacias')` busca un valor que no existe en
ningún negocio — el `name_key` real de esa categoría es
`salud-farmacia`. Esto no depende de qué negocios haya cargados; es un
typo/desalineación entre el texto escrito a mano en `MapSearchBar.jsx`
y el `name_key` real sembrado por la migración de categorías
jerárquicas.

## 5. Un segundo problema, más profundo — no es exclusivo del mapa

Incluso los chips que sí escriben un `name_key` real
(`restaurantes`, `ferreterias`, `supermercados`) son **categorías
padre** en el árbol jerárquico (`restaurantes` tiene hijas como
`restaurantes-pizzeria`, `restaurantes-cafe`, etc.). El filtro es
`.eq('category_key', 'restaurantes')` — coincidencia **exacta**, no
"padre o cualquiera de sus hijas". Un negocio cuyo `category_key` sea
`restaurantes-pizzeria` (lo más probable, ya que el formulario de alta
de negocio pide elegir la subcategoría específica) **no aparece** al
filtrar por "Restaurantes" en el mapa.

**Esto no es exclusivo del mapa** — confirmé el mismo patrón exacto en
`businessService.getAll()` (`src/services/businessService.js:56`,
usado tanto por `business-directory-listing` como por
`business-search-map-page`): también hace `.eq('category_key', ...)`
sin expandir a las subcategorías. Es una característica estructural
presente en varios lugares del proyecto, no algo introducido por el
trabajo reciente de categorías multi-ciudad ni exclusivo de
`interactive-map-page`. Lo señalo para que quede claro el alcance, pero
**no lo toco** — no fue lo que pediste auditar ahora.

## 6. Confirmación empírica (console.log temporal agregado)

Para no quedarme solo con el análisis de las migraciones, agregué un
`console.log` temporal en `mapService.getBusinessesForMap()` que se
activa únicamente cuando se selecciona una categoría específica (no en
"Todas"):

```js
if (category && category !== 'all') {
  console.log('[mapa][diagnóstico] valor recibido del selector de categoría:', category);
  console.log('[mapa][diagnóstico] negocios que matchearon ese category_key:', normalized?.length);
  const { data: allBiz } = await supabase?.from('businesses')?.select('name, category_key')?.not('lat', 'is', null);
  const realKeys = [...new Set((allBiz || [])?.map(b => b?.category_key)?.filter(Boolean))]?.sort();
  console.log('[mapa][diagnóstico] category_key reales presentes en businesses con coordenadas:', realKeys);
  console.log('[mapa][diagnóstico] ¿el valor del selector existe en esa lista?', realKeys?.includes(category));
}
```

Al probar en el navegador (abrir `/mapa`, clic en "Farmacias" o
"Restaurantes", abrir la consola), esto muestra en vivo:
1. El valor exacto que mandó el chip.
2. Cuántos negocios matchearon (debería dar 0 en "Farmacias").
3. La lista real y completa de `category_key` que existen hoy en
   negocios con coordenadas cargadas.
4. Un booleano directo: si el valor del chip ni siquiera está en esa
   lista real.

Esto no cambia ningún comportamiento — es puramente informativo, no
toca el `.eq()` ni el resultado que ven los marcadores.

## 7. Cambio mínimo propuesto (no implementado todavía)

No es un problema de `category_id` vs `category_key`/`name` — ambos
lados ya son `category_key` (texto). El cambio mínimo es sincronizar la
lista estática de `MapSearchBar.jsx` con los `name_key` reales:

- **Fix quirúrgico (1 línea):** cambiar `{ value: 'farmacias', ... }` →
  `{ value: 'salud-farmacia', ... }` en `BUSINESS_CATEGORIES`. Arregla
  el caso confirmado, no toca nada más.
- **Fix estructural (más código, no "mínimo"):** reemplazar la lista
  estática por `businessService.getHierarchicalCategories()` (dinámica,
  igual que `/buscar` y `business-directory-listing`), para que nunca
  más se desincronice cuando cambien las categorías reales. Esto sí
  sería un cambio de alcance mayor al de este diagnóstico.
- El problema de "categoría padre no incluye hijas" (punto 5) es un
  cambio aparte, más grande, y afecta a más de un archivo — no lo
  incluyo en el "cambio mínimo" de este diagnóstico.

**No implementé ninguno de los dos todavía** — quedo a la espera de que
confirmes el diagnóstico (por ejemplo, viendo el `console.log` en el
navegador) antes de tocar `MapSearchBar.jsx`.
