# Diagnostico: filtros del mapa y busqueda de negocios

Fecha: 2026-07-05

## Alcance

Auditoria no destructiva del flujo de filtros del mapa de Koronel. No se
modificaron datos ni migraciones para este diagnostico.

## Flujo real de carga del mapa

La ruta `/mapa` usa `src/pages/interactive-map-page/index.jsx`.

- Negocios: `mapService.getBusinessesForMap({ search, category })`.
- Eventos: `mapService.getEventsForMap({ search, category })`.
- Comunidad: `communityService.getCommunityPostsForMap()`.
- Leaflet recibe tres arrays ya filtrados: `businesses`, `events` y
  `communityPosts`.

Evidencia: al cargar `/mapa` con datos locales, Leaflet renderiza 29 markers
iniciales. Al filtrar `Restaurantes`, recibe 7 negocios y renderiza 7 markers.
Con `Restaurantes` + busqueda `Restobar`, recibe/renderiza 2 markers. Por lo
tanto, no hay evidencia de un bug de Leaflet; el problema esta antes, en datos,
queries y normalizacion.

## Chips visibles del mapa

`src/pages/interactive-map-page/components/MapSearchBar.jsx` define chips
hardcodeados.

Cuando Negocios y Eventos estan activos:

| Label | value |
| --- | --- |
| Todas | `all` |
| Supermercados | `supermercados` |
| Farmacias | `salud-farmacia` |
| Restaurantes | `restaurantes` |
| Iglesias | `iglesias-templos` |
| Iglesia | `church` |
| Cursos | `courses` |
| Encuentros | `meetups` |
| Otro | `other` |

Cuando solo Negocios esta activo, se usan chips de negocio hardcodeados:
`all`, `supermercados`, `salud-farmacia`, `restaurantes`,
`iglesias-templos`, `ferreterias`.

Cuando solo Eventos esta activo, se usan chips de evento hardcodeados:
`all`, `church`, `courses`, `meetups`, `other`.

## Estado real de datos

Consulta de solo lectura via Supabase anon local.

### `categories`

- Total filas: 10.
- `category_type = classified_ad`: 10.
- `category_type = business`: 0.
- Duplicados por `name` o `name_key`: 0.

Conclusión: el catalogo relacional de categorias de negocio no esta presente
en la base consultada. Cualquier UI que dependa de
`categories.category_type = 'business'` queda vacia si no tiene fallback.

### `businesses`

- Total negocios: 29.
- `status = published`: 29.
- Con coordenadas validas `lat/lng`: 29.
- Con `category_id = null`: 29.
- Con `category_key` vacio/null: 20.
- Con `category` texto no vacio: 29.

Distribucion efectiva por `category_key` o `category` en negocios con
coordenadas:

| key/texto | cantidad |
| --- | ---: |
| `establishment` | 14 |
| `clothing store` | 3 |
| `restaurantes` | 2 |
| `bar` | 2 |
| `Veterinarias` | 1 |
| `comida-para-llevar` | 1 |
| `ropa-segunda-seleccion` | 1 |
| `sushi` | 1 |
| `mecanicos` | 1 |
| `farmacia` | 1 |
| `envases` | 1 |
| `comida-peruana` | 1 |

Negocios con `category_key` que no existe en `categories`:

- La Barra Fuente de Soda: `restaurantes`.
- La Casona de Mirla: `restaurantes`.
- Cocineria Mi casa: `comida-para-llevar`.
- Aube Bonita Casualidad: `ropa-segunda-seleccion`.
- Theos Sushi Coronel: `sushi`.
- Servicio Automotriz JC Toledo: `mecanicos`.
- Farmacia Generica: `farmacia`.
- Vanni Chile: `envases`.
- Aji Panka: `comida-peruana`.

Negocios con coordenadas pero sin `category_key`:

- Veterinaria Zoona Animal.
- El Fogon de Don Pedro.
- Al Son de las Tradiciones.
- Restaurante "Las Rocas de Playa Blanca".
- Bocados del Peru.
- La Cabana Restobar.
- Dulce Cafe Gastronomia Lagunillas.
- Restaurante Peruano Magico.
- Rincon Minero Restobar Puchoco Schwager.
- Master Aleman.
- El Gran Salmon.
- ZIBA Boutique.
- The Panda Factory.
- El Viejo Roble Pub-Restaurant.
- Fusion Kallpa.
- Sandwicheria El Mechado Coronel.
- Arrebol Restobar.
- Bold Coronel.
- Lorenzo di Pontti Mall Arauco Coronel - Coronel.
- Mall Arauco Coronel.

Nota: estos negocios si tienen `category` textual, por ejemplo
`establishment`, `bar`, `clothing store`, etc.

### Eventos y comunidad

- `events`: 0 filas en la base consultada.
- `community_posts`: 1 fila `active`, pero 0 con coordenadas validas.

Esto explica que los marcadores visibles del mapa en esta base sean negocios.

## Causa raiz

El problema es mixto: datos incompletos/inconsistentes + logica de filtrado
demasiado estricta.

1. Datos:
   - No hay filas `categories.category_type = 'business'`.
   - Todos los negocios con coordenadas tienen `category_id = null`.
   - Muchos negocios tienen `category_key` null/vacio.
   - Algunos negocios usan rubros legacy/texto libre: `bar`, `sushi`,
     `establishment`, `comida-peruana`, `farmacia`, etc.

2. Queries/logica:
   - La logica previa dependia de comparaciones exactas contra
     `businesses.category_key`.
   - Esa comparacion no puede encontrar negocios cuyo `category_key` esta null
     aunque el nombre o `category` textual indica el rubro.
   - El arbol dinamico de categorias queda vacio si se filtra por
     `category_type = 'business'` sin fallback.

3. Normalizacion:
   - Se necesita normalizar acentos, mayusculas, espacios y aliases legacy.
   - El label visible no debe ser la fuente de verdad. El filtro debe usar un
     `category_key` canonico y una tabla explicita de aliases cuando los datos
     historicos no coinciden.

## Fuente principal recomendada

Para negocios, la fuente principal deberia ser:

1. `business.category_key`, cuando existe.
2. `business.category` textual, como fallback necesario por la data actual.
3. Objetos relacionados `category.name_key`, `rubro.name_key`,
   `business_categories[]` o `wa_rubros[]`, si existen en respuestas futuras.
4. `category_id` solo es confiable si viene acompanado por el objeto
   relacionado `category`; hoy no sirve por si solo porque esta null en todos
   los negocios auditados.

## Rubros vacios en la base actual

Segun los 29 negocios con coordenadas:

- `supermercados`: 0.
- `ferreterias`: 0.
- `iglesias-templos`: 0.
- `salud-farmacia` como key canonico: 0, pero existe 1 negocio legacy con
  `category_key = farmacia`, que debe mapearse a `salud-farmacia`.
- `restaurantes`: 7 si se consideran aliases legacy/texto:
  `restaurantes`, `sushi`, `bar`, `comida-peruana`,
  `comida-para-llevar`.

## Decision de fix

No tocar Leaflet ni datos. El fix debe ser pequeno y centralizado:

- Una funcion pura `normalizeSearchText`.
- Una funcion pura `getBusinessCategoryKey`.
- Una funcion pura `filterMapItems(items, filters)` que devuelva
  `{ items, debugStats }`.
- Mantener aliases documentados para datos legacy.
- Fallback no destructivo de categorias de negocio solo para UI cuando
  `categories` no trae filas `business`.

