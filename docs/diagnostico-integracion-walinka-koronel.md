# Diagnostico integracion Walinka/Koronel

## Alcance revisado

Koronel modela los negocios en la tabla `public.businesses` de Supabase. No se encontro codigo de Walinka/Ventalink en este repo ni un segundo cliente/base de datos para ese producto. El frontend usa un unico cliente Supabase en `src/lib/supabase.js`.

## Campos actuales encontrados

Campos base de negocio encontrados en migraciones y servicios:

- `id`
- `owner_id`
- `name`
- `category`
- `category_key`
- `category_id`
- `description`
- `address`
- `address_text`
- `phone`
- `whatsapp`
- `email`
- `website`
- `lat`
- `lng`
- `latitude`
- `longitude`
- `logo_url`
- `social_links`
- `featured`
- `verified`
- `claimed`
- `status`
- `premium_until`
- metricas como `rating`, `review_count`, `profile_visits`, `contacts_count`

Las imagenes se modelan aparte en `business_images`, con `storage_path`, `alt_text`, `is_primary` y `sort_order`.

## Campos de catalogo externo

No se encontro un campo dedicado como `catalog_url`, `catalog_provider`, `catalog_connected_at`, `external_catalog_slug` o similar.

Si se decide separar explicitamente el catalogo del sitio web, la migracion no destructiva sugerida es:

```sql
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS catalog_url TEXT,
  ADD COLUMN IF NOT EXISTS catalog_provider TEXT DEFAULT 'walinka',
  ADD COLUMN IF NOT EXISTS catalog_connected_at TIMESTAMPTZ;
```

Esta migracion no fue aplicada en esta fase.

## Login, propietario y reclamo

Existe sistema de autenticacion y propiedad:

- `owner_id` en `businesses`.
- `claimed` en `businesses`.
- Tabla `business_claims`.
- Servicios `businessService.submitClaim`, `businessService.getMyClaimRequests` y `adminClaimService.updateStatus`.
- Dashboards de usuario/propietario y formulario protegido de publicacion de negocio.

No se implemento ningun flujo nuevo de reclamo, verificacion por WhatsApp, billing ni sincronizacion.

## Render del negocio

Ficha/popup/card de mapa:

- `src/pages/interactive-map-page/components/BusinessBottomSheet.jsx`
- `src/pages/interactive-map-page/components/MapMarkers.jsx`
- `src/pages/interactive-map-page/index.jsx`
- `src/services/mapService.js`

Formulario/admin de negocio:

- `src/pages/publish-business-form/index.jsx`
- `src/pages/admin-dashboard/components/AdminBusinessForm.jsx`
- `src/services/businessService.js`
- `src/services/adminService.js`

## Decision tomada

Para mantener el cambio incremental y reversible, Fase 1 usa el campo existente `website` como entrypoint de catalogo solo cuando contiene una URL permitida de Walinka/Ventalink.

La UI agrega el campo opcional "URL del catalogo Walinka" en publicacion y admin. Si el campo se completa con una URL valida de Walinka/Ventalink, se persiste en `website`. Si se deja vacio, no bloquea el guardado y el sitio web normal sigue funcionando.

El helper `getBusinessCatalogUrl` ya soporta `catalog_url` ademas de `website`, para que una migracion futura pueda adoptarse sin reescribir la ficha.

## Archivos tocados

- `src/utils/walinkaCatalog.js`
- `src/utils/walinkaCatalog.test.js`
- `src/services/mapService.js`
- `src/pages/interactive-map-page/components/BusinessBottomSheet.jsx`
- `src/pages/interactive-map-page/components/BusinessBottomSheet.test.jsx`
- `src/pages/publish-business-form/index.jsx`
- `src/pages/admin-dashboard/components/AdminBusinessForm.jsx`
- `.env.example`
- `docs/diagnostico-integracion-walinka-koronel.md`

## Riesgos

- `website` es un campo generico. Si un negocio necesita sitio web propio y catalogo Walinka al mismo tiempo, la separacion dedicada requiere la migracion propuesta.
- La allowlist actual acepta dominios `ventalink.app`, `walinka.app` y `walinka.cl`, incluyendo subdominios.
- El link de creacion envia solo datos no sensibles: nombre, WhatsApp, direccion, ciudad, categoria, origen y `koronel_business_id`.

## Siguiente fase sugerida

1. Confirmar dominio publico definitivo de Walinka/Ventalink y ajustar `VITE_WALINKA_APP_URL` si corresponde.
2. Aplicar migracion dedicada `catalog_url`, `catalog_provider`, `catalog_connected_at`.
3. Mover catalogos existentes desde `website` a `catalog_url` solo para URLs Walinka/Ventalink.
4. Agregar UI de conexion para propietarios reclamados, sin crear sincronizacion bidireccional.
5. Evaluar API de creacion automatica de catalogo en una fase posterior.
