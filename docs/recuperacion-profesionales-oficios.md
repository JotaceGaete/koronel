# Recuperación de Profesionales/Oficios desde `claude/vibrant-bohr-098sv5`

**Estado: diagnóstico + plan. Ningún código se modifica en este documento.**

## Resumen

La función sí existió y es recuperable limpiamente. Vive en la rama
`claude/vibrant-bohr-098sv5`, que diverge del mismo punto que mi rama
(`1a0488c`, la punta de `main`) pero nunca se fusionó. No es una
regresión de "algo se borró" — son dos ramas paralelas no fusionadas:
una (`vibrant-bohr`) construyó Profesionales (y muchas otras cosas), la
otra (esta) construyó el motor multi-ciudad. Ninguna de las dos tiene lo
de la otra.

**Importante:** `claude/vibrant-bohr-098sv5` también contiene una
cantidad grande de features completamente ajenas a Profesionales:
Wallet/billetera, Motor Económico, capa de Cuentas, `event_organizers`,
integración Walinka, acciones comerciales/boost. **Nada de eso es
necesario para Profesionales** y no lo voy a traer — el plan de abajo
extrae solo lo específico de Profesionales/Oficios, con dos lugares
donde hay que limpiar referencias cruzadas a Walinka (código muerto sin
esa migración, no bloqueante, mejor sacarlo).

## 1. Archivos involucrados en `vibrant-bohr`

### Nuevos (no existen en mi rama actual)

| Archivo | Líneas | Rol |
|---|---|---|
| `src/pages/profesionales-listing/index.jsx` | 181 | Listado `/profesionales` |
| `src/pages/profesionales-listing/components/ProfesionalCard.jsx` | 204 | Tarjeta de profesional |
| `src/pages/post-profesional-form/index.jsx` | 394 | Formulario "Presentarme como profesional" |
| `src/pages/post-profesional-form/components/ProfesionalForm.jsx` | 431 | Campos del formulario |
| `src/pages/post-profesional-form/components/ProfesionalPortfolio.jsx` | 93 | Carga de fotos de trabajos |
| `src/pages/post-profesional-form/components/ProfesionalProfilePhoto.jsx` | 90 | Carga de foto de perfil |
| `src/pages/post-profesional-form/components/ProfesionalPreviewCard.jsx` | 175 | Preview en vivo del formulario |
| `src/pages/post-profesional-form/components/ProfesionalSuccessModal.jsx` | 97 | Modal de éxito al publicar |
| `src/pages/admin-dashboard/components/AdminProfesionales.jsx` | 275 | Panel admin — tab "Profesionales" |
| `src/lib/logger.js` | 5 | Utilidad usada por `adService.js` (reemplaza `console.error`) |
| `src/lib/walinka.js` | — | **No se trae** (ver sección 4) |

### Modificados (existen en ambas ramas, con diffs acotados)

| Archivo | Qué cambia en `vibrant-bohr` | ¿Todo aplica a Profesionales? |
|---|---|---|
| `src/services/adService.js` | `getAll({listingType})`, `getRecent()` excluye `oficio`, `create()` acepta `profilePhotoPath` + 9 campos nuevos, `formatAd()` separa foto de perfil/portafolio | Sí, casi todo — un `logger` import a incluir |
| `src/services/adminService.js` | `adminAdService.getAll({listingType})` filtra `profesionales`/`clasificados`; además agrega 3 columnas de Walinka a `BUSINESS_COLUMNS` | Solo la parte de `listingType`; **no** la parte de Walinka |
| `src/pages/admin-dashboard/components/AdminClassifiedAds.jsx` | Pasa `listingType: 'clasificados'` para no mezclar oficios en el tab existente | Sí, completo |
| `src/pages/admin-dashboard/index.jsx` | Importa y registra `AdminProfesionales` como sección nueva | Sí, casi completo (un `href="/homepage"` → `"/"` que no aplica) |
| `src/Routes.jsx` | Agrega rutas `/profesionales`, `/profesionales/publicar`, `/oficios` (redirect), y **además** rehace todo el esquema de rutas (`/` → Homepage, `/negocios`, `/ofertas`, `/crecer`, `/billetera`, etc.) | Solo las rutas de Profesionales — el resto es de otras features |
| `src/components/ui/Header.jsx` | Agrega link "Profesionales" — pero **junto con** un rediseño completo del nav (dropdown "Más", saca "Empleos" del nav principal, cambia el CTA a "Publicar negocio", cambia rutas raíz) | Solo agregar el link — el resto es un rediseño no relacionado |
| `src/pages/classified-ad-detail/index.jsx` | Vista especial de perfil cuando `listing_type === 'oficio'` (avatar, galería separada de portafolio) — **además** de un bloque de CTA de catálogo Walinka | La vista de oficio sí; el bloque Walinka no |
| `src/pages/business-profile-page/index.jsx` | Diff completo es 100% ajeno a Profesionales (tags de negocio, props de Walinka) | **No aplica nada** — no se toca este archivo |

### Migraciones SQL involucradas

`vibrant-bohr` tiene 14 migraciones que no están en mi rama. Solo 5 son
necesarias para Profesionales, y son completamente autocontenidas
(no dependen de las otras 9, que son de Wallet/Cuentas/event_organizers/
Walinka/acciones comerciales):

| Migración | Qué agrega | Necesaria |
|---|---|---|
| `20260630200000_classified_ads_listing_type.sql` | `classified_ads.listing_type` (`venta`\|`oficio`\|`oferta`, default `venta`, backfill, índice) + `business_id` (para ofertas, no usado por oficios) | Sí |
| `20260630300000_classified_ads_oficio_fields.sql` | `price_type`, `schedule_note` | Sí |
| `20260630400000_classified_ads_provider_identity.sql` | `provider_name`, `provider_last_name`, `provider_display_name`, `ratings_enabled` | Sí |
| `20260630500000_classified_ads_trust_attributes.sql` | `available_urgency`, `weekend_service`, `issues_invoice`, `provider_verified`; amplía el `CHECK` de `price_type` para incluir `'visit'` | Sí |
| `20260630600000_ad_images_image_type.sql` | `ad_images.image_type` (`profile`\|`portfolio`, default `portfolio`) | Sí |
| `20260630000000_fix_admin_functions_user_profiles.sql` | Ajena (funciones admin) | No |
| `20260630100000_businesses_tags.sql` | Ajena (tags de negocio) | No |
| `20260701000000_walinka_integration.sql` | Ajena (integración Walinka) | No |
| `20260701100000_community_reply_count.sql` | Ajena (contador de respuestas Q&A) | No |
| `20260701200000_event_organizers.sql` | Ajena (organizadores de eventos) | No |
| `20260701_commercial_actions.sql` | Ajena (acciones comerciales) | No |
| `20260702000000_account_layer.sql` | Ajena (capa de Cuentas) | No |
| `20260702100000_economic_engine.sql` | Ajena (Motor Económico/Wallet) | No |
| `20260702200000_action_boost.sql` | Ajena (boost con créditos) | No |

Todas son `ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` —
mismo patrón aditivo usado en todo este trabajo. Ninguna toca `city_id`
ni nada de mi migración multi-ciudad; se pueden aplicar después de mis
migraciones sin conflicto (tocan columnas distintas de la misma tabla).

## 2. Rutas involucradas

En `vibrant-bohr`, específicas de Profesionales:

- `/profesionales` → `ProfesionalesListing`
- `/profesionales/publicar` → `PostProfesionalForm` (protegida)
- `/oficios` → redirect a `/profesionales` (compatibilidad con el nombre viejo — **esto confirma que la ruta se llamó `/oficios` antes de renombrarse a `/profesionales`, dentro de esa misma rama**)
- `/oficios/publicar` → redirect a `/profesionales/publicar`

El resto de las rutas nuevas de esa rama (`/negocios`, `/ofertas`,
`/crecer`, `/billetera`, `/acciones`) son de otras features — no las
traigo.

## 3. Queries/servicios usados

Todo pasa por `adService` (ya existe, se extiende) y `adminAdService`
(ya existe, se extiende) — **no hay una tabla ni un servicio nuevo**.
Un profesional es, en la base, una fila de `classified_ads` con
`listing_type = 'oficio'`. Esto reutiliza toda la infraestructura
existente (RLS, `ad_images`, límites diarios, moderación) — es
justamente lo que dice el comentario de la migración:
*"This reuses all existing classified_ads infrastructure ... without a
new table."*

- `adService.getAll({ listingType: 'oficio', ... })` — listado.
- `adService.getRecent()` — **excluye** `oficio` explícitamente (commit
  `ad0bb51`, un cambio de una línea) — esto es literalmente el fix para
  el problema original que reportaste ("aviso mezclado en Reciente").
- `adService.create()` — acepta `profilePhotoPath` (foto de perfil,
  separada del portafolio) y los 9 campos nuevos de identidad/confianza.
- `adService.formatAd()` — separa foto de perfil de imágenes de
  portafolio, calcula `providerLabel` e `isNew`.
- `adminAdService.getAll({ listingType: 'profesionales' | 'clasificados' })`
  — separa las dos vistas en el panel admin.

## 4. Limpieza necesaria: referencias a Walinka

Dos archivos que sí necesito para Profesionales tienen referencias a la
integración Walinka (feature no relacionada, en otra migración que no
traigo):

- `ProfesionalCard.jsx` importa `isValidWalinkaCatalogUrl` para un badge
  opcional "Catálogo online".
- `classified-ad-detail/index.jsx` tiene un bloque de CTA que hace
  `supabase.from('walinka_catalog_clicks').insert(...)`.

**Decisión propuesta:** no traer `src/lib/walinka.js`, y quitar estos
dos bloques al portar los archivos (en vez de importar el archivo y
dejar que la condición sea siempre falsa). Es más limpio que dejar
código muerto apuntando a una tabla/columnas que no van a existir.
`src/lib/logger.js` sí se trae tal cual (5 líneas, sin dependencias,
usado por `adService.js`).

## 5. Diferencias con mi rama actual que importan

- Mi `Routes.jsx` mantiene `/` → `BusinessDirectoryListing` y
  `/homepage` → `Homepage` (el esquema actual de producción). El de
  `vibrant-bohr` invierte esto (`/` → Homepage) como parte de un
  rediseño de navegación no relacionado con Profesionales. **No lo
  adopto** — agrego solo las rutas nuevas de Profesionales sin tocar el
  resto del esquema de rutas, para no cambiar nada visible fuera de lo
  pedido.
- Mi `Header.jsx` tiene la nav actual (Inicio/Negocios/Clasificados/
  Eventos/Empleos/Comunidad). El de `vibrant-bohr` la reemplaza por una
  nav distinta con dropdown "Más" y saca "Empleos" del nivel superior.
  **No lo adopto** — agrego un único link "Profesionales" al array
  `navItems` existente, sin restructurar nada más.
- `adService.js` en mi rama ya tiene el fix defensivo de
  `getAdCategories()` (commit `507907e`) y usa `getActiveCityConfig()`
  para `mediaBaseUrl` en vez de `import.meta.env` directo (mi propio
  trabajo de Fase C/singleton). El de `vibrant-bohr` no tiene ninguna de
  las dos cosas (rama vieja). Al portar, mantengo mis cambios y solo
  agrego lo de Profesionales encima — no piso mi propio trabajo.

## 6. Plan mínimo para restaurar sin romper Clasificados

Un solo commit coherente ("recuperar Profesionales/Oficios"), en este
orden:

1. **Migraciones** (nuevo archivo consolidado o los 5 tal cual, con
   timestamp posterior al último usado): las 5 migraciones de la tabla
   de la sección 1, sin cambios de contenido.
2. **`src/lib/logger.js`**: copiar tal cual (5 líneas).
3. **`src/services/adService.js`**: aplicar el diff de Profesionales
   (soporte `listingType` en `getAll`, exclusión de `oficio` en
   `getRecent`, `profilePhotoPath` + campos nuevos en `create`,
   separación perfil/portafolio en `formatAd`) sobre mi versión actual
   (que ya tiene el fix de categorías y el singleton de ciudad) — no
   reemplazar el archivo entero, mergear los cambios.
4. **`src/services/adminService.js`**: solo la parte de
   `adminAdService.getAll({ listingType })` — sin las 3 columnas de
   Walinka en `BUSINESS_COLUMNS`.
5. **Páginas nuevas**: copiar tal cual los 9 archivos de
   `profesionales-listing/` y `post-profesional-form/` y
   `AdminProfesionales.jsx`, quitando las 2 referencias a Walinka
   (sección 4).
6. **`src/Routes.jsx`**: agregar únicamente `/profesionales`,
   `/profesionales/publicar`, `/oficios` (redirect) y
   `/oficios/publicar` (redirect) — sin tocar ninguna ruta existente.
7. **`src/components/ui/Header.jsx`**: agregar un ítem "Profesionales"
   al array `navItems` existente — sin restructurar el resto del nav.
8. **`src/pages/admin-dashboard/index.jsx`**: importar y registrar
   `AdminProfesionales` (import + nav item + entrada en `SECTION_MAP`)
   — diff mínimo, ya casi idéntico al de `vibrant-bohr`.
9. **`src/pages/admin-dashboard/components/AdminClassifiedAds.jsx`**:
   agregar `listingType: 'clasificados'` a la llamada existente — una
   línea, evita que oficios se mezclen en el tab admin de Clasificados.
10. **`src/pages/classified-ad-detail/index.jsx`**: aplicar la vista
    especial de oficio (avatar, galería de portafolio separada),
    quitando el bloque de CTA de Walinka.
11. `test:run` + `build` verdes antes de commitear.

**Por qué no rompe Clasificados:** `listing_type` tiene
`DEFAULT 'venta'` y se hace backfill de todas las filas existentes a
`'venta'` en la propia migración — ningún aviso existente cambia de
categoría. `getRecent()` ya excluye `oficio` explícitamente (el fix que
buscábamos). El listado `/classified-ads-listing` actual no filtra por
`listing_type` hoy, así que seguiría mostrando todo — **si querés que
`/classified-ads-listing` también excluya `oficio`** (para que
Clasificados y Profesionales queden separados en el listado, no solo en
Reciente), es un `.eq`/`.or` adicional de una línea en
`ClassifiedAdsListing`, que no vi tocado en `vibrant-bohr` porque ahí
`/clasificados` seguía siendo el listado general. Lo dejo como pregunta
abierta, no lo asumo.

## 7. Preguntas antes de implementar

1. ¿Confirmas el plan de la sección 6 tal cual (recuperación mínima,
   sin el rediseño de nav/rutas de `vibrant-bohr`, sin Walinka)?
2. ¿El listado `/classified-ads-listing` actual debería excluir
   `listing_type = 'oficio'` también (no solo "Reciente" del home), o
   lo dejamos para después?
3. ¿Migraciones como 5 archivos separados (fieles al original) o
   consolidadas en uno solo con timestamp de hoy? Cualquiera de las dos
   es igual de segura; separados es más fiel a la rama original y más
   fácil de auditar línea por línea contra la fuente.
