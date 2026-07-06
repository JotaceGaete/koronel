# Diagnostico de filtros de mapa, busqueda y categorias

Fecha: 2026-07-05

## Resultado

El fallo no esta en Leaflet. Leaflet recibia marcadores cuando el array de
negocios ya venia filtrado correctamente. El problema estaba antes, en una
combinacion de datos incompletos, fuentes de categorias distintas y
comparaciones demasiado estrictas.

## Evidencia de datos

- `categories`: 10 filas, todas `category_type = classified_ad`.
- `categories.category_type = business`: 0 filas.
- `businesses`: 29 negocios publicados con coordenadas validas.
- `businesses.category_id`: null en los 29 negocios auditados.
- `businesses.category_key`: null/vacio en 20 negocios.
- Los negocios restantes mezclan claves legacy o texto libre:
  `restaurantes`, `bar`, `sushi`, `comida-para-llevar`,
  `comida-peruana`, `farmacia`, `mecanicos`, `envases`,
  `ropa-segunda-seleccion`, `Veterinarias`, `clothing store` y
  `establishment`.

## Causa raiz

1. El mapa mostraba chips hardcodeados como `Farmacias`, `Restaurantes` y
   `Supermercados`, aunque la base no tiene catalogo relacional de rubros de
   negocio.
2. El admin tomaba categorias desde `adminCategoryService.getAll()`, que leia
   todas las filas de `categories`; en esta base esas filas son de clasificados
   como vehiculos e inmuebles, no rubros de negocios.
3. El filtrado de admin usaba `.eq('category_key', category)` y la busqueda
   usaba solo `.ilike('name')`, por lo que no coincidia con el mapa ni con
   aliases como `farmacia` -> `salud-farmacia` o `clothing store` -> ropa.
4. El formulario de negocios podia mostrar categorias fallback de UI. Esas
   categorias no son UUID reales y no deben guardarse en `category_id`.

## Campos revisados

- `category_id`: no es util hoy para filtrar porque esta null en los negocios
  auditados.
- `rubro_id`: no aparece como fuente usada en los componentes revisados.
- `category.name`: soportado por la normalizacion comun si llega anidado.
- `category.slug`: soportado por la normalizacion comun si llega anidado.
- `name_key`: soportado para categorias anidadas y listas de categorias.
- `wa_rubros`: soportado como array si aparece en respuestas futuras.
- `business_categories`: soportado como array y como objeto con `category`.
- `category_key`: fuente principal cuando existe.
- `category`: fallback necesario por los datos actuales.

## Decision tecnica

Se centralizo la normalizacion en `src/utils/businessCategoryFilter.js`.

- `Todas` no filtra.
- Los rubros usan claves canonicas, no labels visibles.
- Se consideran rubros multiples en arrays como `business_categories`,
  `wa_rubros`, `categories` y `rubros`.
- La busqueda de negocios usa nombre, direccion, descripcion, `category`,
  `category_key`, claves canonicas y labels normalizados.
- Los chips de negocio del mapa ahora salen de los negocios cargados, con
  conteos reales, no de una lista hardcodeada.
- El admin usa el mismo filtro comun que el mapa.
- Los formularios no guardan ids virtuales en `category_id`; solo persisten
  UUID reales.

## Casos concretos

- `Farmacia` y `Farmacias` colapsan a `salud-farmacia`.
- `Restaurante`, `Restaurantes`, `restaurant`, `bar`, `sushi`, `restobar`,
  `comida-peruana` y `comida-para-llevar` colapsan a `restaurantes`.
- `clothing store` y `ropa-segunda-seleccion` colapsan a
  `ropa-segunda-seleccion`, por eso buscar `ropa` encuentra negocios como
  `Aube Bonita Casualidad`.
- `Iglesia`, `Iglesias` y `church` colapsan a `iglesias-templos`.
- `Supermercados` solo aparece como chip si existen negocios cargados para ese
  rubro.

## Leaflet

No se modifico Leaflet. La evidencia indica que el renderer funciona cuando
recibe arrays correctos; el fix corrige la formacion de esos arrays antes de
llegar al mapa.
