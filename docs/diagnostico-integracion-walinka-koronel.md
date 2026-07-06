# Diagnostico integracion Walinka/Koronel

## Alcance revisado

Koronel y Walinka/Ventalink comparten la misma base Supabase, pero usan tablas distintas. Koronel modela los negocios locales en `public.businesses`, `business_images`, `business_claims`, etc. Walinka/Ventalink usa tablas propias como `wa_businesses`, `wa_products` y `billing_subscriptions`.

El frontend de Koronel usa un unico cliente Supabase en `src/lib/supabase.js`. En esta fase no se consultan ni modifican tablas `wa_*`; el cambio solo agrega puntos visibles para llevar al negocio desde Koronel hacia el alta o catalogo de Walinka.

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

El commit inicial uso `website` como puente temporal. Eso es reversible, pero no representa todavia el vinculo real entre entidades Koronel/Walinka.

Opciones no destructivas para la siguiente fase, a revisar antes de aplicar:

```sql
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS walinka_business_id UUID;
```

o bien una tabla puente:

```sql
CREATE TABLE public.business_walinka_links (
  koronel_business_id UUID NOT NULL REFERENCES public.businesses(id),
  walinka_business_id UUID NOT NULL REFERENCES public.wa_businesses(id),
  connected_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (koronel_business_id, walinka_business_id)
);
```

Tambien puede evaluarse `wa_businesses.koronel_business_id` si el dominio Walinka debe conocer directamente el origen Koronel. Ninguna migracion fue aplicada en esta fase.

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

Cards/listados/perfil revisados:

- `src/pages/business-directory-listing/components/BusinessCard.jsx`
- `src/pages/business-search-map-page/components/SearchMapBusinessCard.jsx`
- `src/pages/business-search-map-page/components/SearchMapRightPanel.jsx`
- `src/pages/business-profile-page/components/BusinessInfo.jsx`

## Diagnostico de visibilidad

El CTA del commit inicial quedo visible solo dentro de `BusinessBottomSheet`, es decir, despues de seleccionar un marcador del mapa interactivo. No aparecia en el directorio, la ficha de perfil, las cards del buscador con mapa ni el popup del mapa de `/buscar`. Por eso la integracion existia en helpers/tests, pero no era evidente para un visitante normal.

## Decision tomada

Para mantener el cambio incremental y reversible, esta fase conserva `website` como entrypoint temporal de catalogo solo cuando contiene una URL permitida de Walinka/Ventalink.

La UI agrega el campo opcional "URL del catalogo Walinka" en publicacion y admin. Si el campo se completa con una URL valida de Walinka/Ventalink, se persiste en `website`. Si se deja vacio, no bloquea el guardado y el sitio web normal sigue funcionando.

El helper `getBusinessCatalogUrl` ya soporta `catalog_url` ademas de `website`, para que una migracion futura pueda adoptarse sin reescribir la ficha.

La UI ahora muestra:

- `Ver catalogo` cuando existe URL Walinka/Ventalink valida.
- `Crear catalogo Walinka` o `Crear catalogo gratis` cuando el negocio no tiene catalogo conectado.

## Archivos tocados

- `src/utils/walinkaCatalog.js`
- `src/utils/walinkaCatalog.test.js`
- `src/services/mapService.js`
- `src/pages/interactive-map-page/components/BusinessBottomSheet.jsx`
- `src/pages/interactive-map-page/components/BusinessBottomSheet.test.jsx`
- `src/pages/business-directory-listing/components/BusinessCard.jsx`
- `src/pages/business-directory-listing/components/BusinessCard.test.jsx`
- `src/pages/business-search-map-page/components/SearchMapBusinessCard.jsx`
- `src/pages/business-search-map-page/components/SearchMapRightPanel.jsx`
- `src/pages/business-profile-page/components/BusinessInfo.jsx`
- `src/pages/business-profile-page/components/BusinessInfo.test.jsx`
- `src/pages/publish-business-form/index.jsx`
- `src/pages/admin-dashboard/components/AdminBusinessForm.jsx`
- `.env.example`
- `docs/diagnostico-integracion-walinka-koronel.md`

## Riesgos

- `website` es un campo generico. Si un negocio necesita sitio web propio y catalogo Walinka al mismo tiempo, la separacion dedicada requiere la migracion propuesta.
- La allowlist actual acepta dominios `ventalink.app`, `walinka.app` y `walinka.cl`, incluyendo subdominios.
- El link de creacion envia solo datos no sensibles: nombre, WhatsApp, direccion, ciudad, categoria, origen y `koronel_business_id`.

## Siguiente fase sugerida

1. Confirmar modelo de vinculo real: `businesses.walinka_business_id`, `wa_businesses.koronel_business_id` o tabla puente.
2. Confirmar el flujo de alta en Walinka usando la misma Supabase y tablas `wa_*`.
3. Agregar UI de conexion para propietarios reclamados, sin sincronizacion bidireccional.
4. Migrar URLs Walinka/Ventalink existentes desde `website` al vinculo real solo despues de aprobar la migracion.
5. Evaluar creacion automatica de `wa_businesses` via API o RPC en una fase posterior.
