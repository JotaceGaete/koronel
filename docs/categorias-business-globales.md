# Categorias business globales

Las categorias base de negocios de Koronel se modelan como filas en
`public.categories` con:

- `category_type = 'business'`
- `city_id = NULL`

Esto significa que son un catalogo global compartido por todas las
ciudades actuales y futuras. Las categorias especificas de una ciudad
pueden agregarse mas adelante usando `city_id`, pero la base comun
debe mantenerse global para no duplicar rubros como restaurantes, salud,
automotriz, comercio local o imprenta y grafica.

La migracion `20260706010000_reseed_global_business_categories.sql` es
no destructiva:

- no usa `DELETE`
- no reasigna negocios
- no hace backfill masivo
- no toca categorias `classified_ad`
- usa `INSERT ... ON CONFLICT (name_key) DO UPDATE`
- mantiene `name_key` estable para que `businesses.category_key` siga
  siendo compatible con filtros existentes

La tabla `category_suggestions` queda preparada para una fase futura de
"Otra categoria / Sugerir categoria", sin implementar todavia UI publica
ni aprobacion admin.
