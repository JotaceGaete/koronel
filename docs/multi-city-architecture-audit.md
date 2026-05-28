# Auditoría Técnica Multi-Ciudad — Koronel / CoronelLocal
**Fecha:** 2026-05-28  
**Rama:** `feat/multi-city-architecture-review`  
**Estado:** Solo análisis — sin modificaciones de código

---

## 1. Resumen Ejecutivo

**Koronel.cl / CoronelLocal** es un portal hiperlocal para la ciudad de **Coronel, Chile** (Región del Biobío). Combina directorio de negocios, clasificados, eventos, empleos y comunidad Q&A, apoyado en Supabase (PostgreSQL + Auth + Storage) y desplegado en Vercel con CDN de medios en Cloudflare R2 (`multimedia.koronel.cl`).

El proyecto está **profundamente acoplado** a Coronel en 6 capas simultáneas: branding, SEO, código de UI, servicios de geolocalización, esquema de base de datos y configuración de infraestructura. No existe ninguna abstracción de "ciudad" ni ningún mecanismo de multi-tenancy.

**Transformarlo en plataforma multi-ciudad es técnicamente viable**, pero requiere trabajo no trivial en todas esas capas. La complejidad estimada es **media-alta** (~3-6 semanas de desarrollo según el enfoque elegido).

---

## 2. Mapa de Dependencias — Qué Es el Proyecto

| Dimensión | Valor actual |
|---|---|
| Nombre del paquete | `coronelportal` |
| Nombre de marca en UI | `CoronelLocal` |
| Dominio principal | `koronel.cl` |
| CDN multimedia | `multimedia.koronel.cl` |
| Logo | `/public/koronel-logo.png` |
| Ciudad servida | Coronel, Región del Biobío, Chile |
| Base de datos | Supabase (PostgreSQL) — única instancia |
| Hosting | Vercel + Cloudflare R2 |
| Stack frontend | React 18 + Vite + Tailwind CSS |
| Autenticación | Supabase Auth (email + Google OAuth) |

**Tipo de portal:** Directorio local + clasificados + eventos + empleos + comunidad Q&A. Es un **portal comunitario hiperlocal** con perfil de ciudad única, sin arquitectura multi-tenant.

---

## 3. Inventario Completo de Referencias Hardcodeadas

### 3.1 Branding / Identidad

| Archivo | Línea | Texto hardcodeado | Tipo |
|---|---|---|---|
| `package.json` | 2 | `"name": "coronelportal"` | Config |
| `src/components/PageMeta.jsx` | 4 | `const SITE_NAME = 'CoronelLocal'` | Constante global |
| `src/components/PageMeta.jsx` | 5 | `DEFAULT_DESCRIPTION` incluye "Coronel y la región" | Constante global |
| `src/components/Logo.jsx` | 28-29 | `src="/koronel-logo.png"`, `alt="Koronel.cl"` | Asset + texto |
| `src/components/ui/Header.jsx` | 93 | Comentario `/* Logo Koronel.cl */` | Menor |
| `index.html` | 6 | `<title>CoronelLocal \| ... en Coronel</title>` | HTML base |
| `index.html` | 9 | `meta description` incluye "en Coronel y la región" | HTML base |
| `public/manifest.json` | 2-3 | `"short_name": "coronelportal"`, `"name": "coronelportal"` | PWA manifest |
| `src/pages/homepage/components/FooterSection.jsx` | 78-82 | `"© CoronelLocal"` + `"Coronel, Región del Biobío, Chile"` | UI |
| `src/pages/auth/LoginPage.jsx` | 65 | `"Accede a tu cuenta de Koronel"` | UI |
| `src/pages/auth/SignupPage.jsx` | 43 | `"Únete a la comunidad de CoronelLocal"` | UI |
| `src/pages/user-account-dashboard/index.jsx` | 149, 153 | `CoronelLocal` en footer inline | UI |
| `src/pages/business-profile-page/index.jsx` | 374, 394, 423, 427 | `CoronelLocal` múltiples veces | UI |
| `src/pages/user-business-dashboard/index.jsx` | 75, 113 | `CoronelLocal` en subtítulos | UI |
| `src/pages/user-business-dashboard/components/BusinessCard.jsx` | 56 | `"equipo de CoronelLocal"` | UI |
| `src/pages/classified-ad-detail/index.jsx` | 91 | WhatsApp link incluye `"en CoronelLocal"` | UI |
| `src/pages/classified-ads-listing/components/AdCard.jsx` | 16 | WhatsApp link incluye `"en CoronelLocal"` | UI |
| `src/pages/post-classified-ad/components/SuccessModal.jsx` | 79 | `"publicado en CoronelLocal"` | UI |
| `src/pages/event-detail-page/index.jsx` | 73 | WhatsApp `"vi el evento ... en CoronelLocal"` | UI |
| `src/pages/event-detail-page/components/EventActions.jsx` | 11 | Mismo WhatsApp | UI |

### 3.2 SEO / Metadata por Página

| Archivo | Descripción hardcodeada |
|---|---|
| `src/components/PageMeta.jsx` | SITE_NAME='CoronelLocal', DEFAULT_DESCRIPTION incluye "Coronel" |
| `src/pages/homepage/index.jsx` | "...en Coronel y la región" |
| `src/pages/business-directory-listing/index.jsx` | "Busca y descubre negocios en Coronel" |
| `src/pages/classified-ads-listing/index.jsx` | "Avisos clasificados en Coronel" |
| `src/pages/events-listing/index.jsx` | "Eventos en Coronel: ferias, talleres..." |
| `src/pages/jobs-listing/index.jsx` | "Ofertas de empleo en Coronel" |
| `src/pages/community-q-a-listing/index.jsx` | "...comunidad en Coronel" |

### 3.3 Geografía — Ciudad y Sectores

| Archivo | Línea | Referencia geográfica |
|---|---|---|
| `src/services/geocodingService.js` | 2 | `CORONEL_DEFAULT = { lat: -37.0167, lng: -73.1500 }` |
| `src/services/geocodingService.js` | 3 | `USER_AGENT = 'CoronelPortal/1.0 (coronellocal.cl)'` |
| `src/services/geocodingService.js` | 10 | Append `', Coronel, Chile'` a cada búsqueda |
| `src/pages/interactive-map-page/index.jsx` | 16 | `CORONEL_CENTER = [-37.0298, -73.1429]` |
| `src/pages/interactive-map-page/index.jsx` | 39-47 | `SECTOR_COLORS`: Centro, Lagunillas, Schwager, Puchoco, Las Higueras, Punta de Parra |
| `src/pages/post-classified-ad/components/AdForm.jsx` | 6-15 | `LOCATIONS`: Coronel Norte, Coronel Sur, Boca Sur, Lagunillas, Palomares, Schwager |
| `src/pages/homepage/components/HeroSection.jsx` | 23, 28 | `"Buscar en Coronel..."`, `"Negocios y servicios en Coronel"` |
| `src/pages/homepage/components/FooterSection.jsx` | 82 | `"Coronel, Región del Biobío, Chile"` |
| `src/pages/homepage/components/LatestJobs.jsx` | 81 | `"Oportunidades laborales en Coronel"` |
| `src/pages/homepage/components/PostAdCTA.jsx` | 22 | `"...miles de personas en Coronel"` |
| `src/pages/homepage/components/UpcomingEvents.jsx` | 11, 23, 32 | Datos mock con venues de Coronel |
| `src/pages/homepage/components/RecentClassifiedAds.jsx` | 8-11 | Datos mock con "Coronel" en imageAlt |
| `src/pages/homepage/components/RecentContentSection.jsx` | 44 | `sector: 'Coronel'` en mock data |
| `src/pages/business-directory-listing/index.jsx` | 172, 183, 191 | "negocio en Coronel", "Directorio de Negocios en Coronel" |
| `src/pages/business-directory-listing/components/BusinessCard.jsx` | 31 | `"Coronel"` hardcodeado en card |
| `src/components/ui/FeaturedContentCarousel.jsx` | 175 | `"Coronel"` hardcodeado |
| `src/components/ui/SmartSearchInput.jsx` | 239 | `"Negocio · Coronel"` en sugerencias |
| `src/pages/events-listing/index.jsx` | 26-28 | Eventos mock en "Coronel", "Coronel Norte" |
| `src/pages/business-profile-page/index.jsx` | 26, 31, 75, 126 | Fallback mock data con "Coronel" |
| `src/pages/admin-import-businesses/index.jsx` | 47, 211 | `location = 'Coronel, Chile'` por defecto |
| `src/pages/admin-dashboard/AdminQuickBusinessEntry.jsx` | 337 | `placeholder="Calle y número, Coronel"` |
| `src/pages/admin-dashboard/components/AdminBusinessForm.jsx` | 833, 853 | Placeholders con "Coronel" |
| `src/pages/publish-business-form/index.jsx` | 470, 585, 604 | Textos y placeholders con "Coronel" |
| `src/pages/publish-job-form/index.jsx` | 127 | `"...oferta de trabajo en Coronel"` |
| `src/pages/publish-job-form/components/JobFormFields.jsx` | 120 | `placeholder="Ej: Coronel, Biobío"` |
| `src/pages/post-event-form/index.jsx` | 207, 226, 296, 310 | Textos y placeholders con "Coronel" |
| `src/pages/post-event-form/components/EventFormFields.jsx` | 34, 110, 121 | Placeholders con "Coronel" |
| `src/pages/post-community-question-form/index.jsx` | 183 | `"Consulta a la comunidad de Coronel"` |
| `src/pages/community-detail/components/ReplyForm.jsx` | 131 | `placeholder="Dirección en Coronel"` |
| `src/pages/community-q-a-listing/index.jsx` | 179 | `"Consultas y recomendaciones en Coronel"` |
| `src/pages/business-owner-dashboard/index.jsx` | 175 | `"directorio de Coronel"` |
| `src/pages/event-detail-page/index.jsx` | 20-31 | Mock data: "Feria Gastronómica de Coronel", "Plaza de Armas de Coronel", "Municipalidad de Coronel" |
| `src/pages/event-detail-page/components/EventHero.jsx` | 19 | Alt text: `"evento en ... Coronel"` |
| `src/pages/jobs-listing/index.jsx` | 74 | `"Empleos en Coronel"` |
| `src/pages/classified-ads-listing/index.jsx` | 110 | `"Clasificados en Coronel"` |
| `src/pages/post-classified-ad/index.jsx` | 252 | `"...miles de vecinos de Coronel"` |
| `src/pages/user-account-dashboard/components/MyBusinessesTab.jsx` | 70 | Alt text: `"negocio en Coronel"` |
| `src/pages/business-search-map-page/index.jsx` | 108 | Alt text: `"negocio en Coronel"` |

### 3.4 Base de Datos — Acoplamiento a Ciudad

| Archivo | Problema |
|---|---|
| `supabase/migrations/20260304161514_coronellocal_schema.sql` | Seed con emails `@coronellocal.cl`, password `coronel2026`, negocios en "Coronel" |
| `supabase/migrations/20260304161514_coronellocal_schema.sql` | `location TEXT DEFAULT 'Coronel'` en `classified_ads` |
| `supabase/migrations/20260304163200_admin_tables.sql` | Admin seeder con `carlos@coronellocal.cl` |
| `businesses` tabla | Sin columna `city_id`, `city`, ni `commune` — asume ciudad única |
| `classified_ads` tabla | Sin `city_id` — `location` es texto libre con default "Coronel" |
| `events` tabla (si existe) | Sin columna de ciudad explícita |
| `categories` tabla | Categorías sin scope de ciudad |

### 3.5 Servicios / APIs — Dependencias de Infraestructura

| Archivo | Referencia |
|---|---|
| `src/services/geocodingService.js` | Dominio `coronellocal.cl` en User-Agent; append "Coronel, Chile" a geocoding |
| `src/services/businessService.js` | Fallback a `https://multimedia.koronel.cl` |
| `src/services/adService.js` | Fallback a `https://multimedia.koronel.cl` |
| `src/services/mapService.js` | Fallback a `https://multimedia.koronel.cl` |
| `api/upload/confirm.js` | Fallback a `https://multimedia.koronel.cl` |
| `api/upload/signed-url.js` | Fallback a `https://multimedia.koronel.cl` |
| `.env.example` | `VITE_R2_PUBLIC_URL=https://multimedia.koronel.cl`, bucket `multimedia-koronel` |

### 3.6 Rutas — Estado Actual

Todas las rutas son planas, sin prefijo de ciudad:

```
/                          → BusinessDirectoryListing
/homepage                  → Homepage
/directorio-negocios       → BusinessDirectoryListing
/clasificados/:id          → ClassifiedAdDetail
/eventos, /eventos/:id     → Events
/empleos, /empleo/:slug    → Jobs
/mapa                      → InteractiveMapPage
/buscar                    → BusinessSearchMapPage
/comunidad, /comunidad/:id → CommunityQA
/admin-dashboard           → AdminDashboard
/publicar-negocio          → PublishBusinessForm
/mis-negocios              → UserBusinessDashboard
/dashboard                 → UserAccountDashboard
```

---

## 4. Análisis de Dificultad — Multi-Ciudad

### 4.1 Capas de Acoplamiento (de más fácil a más difícil)

| Capa | Dificultad | Descripción |
|---|---|---|
| Branding / textos UI | 🟡 Media | ~60 archivos con menciones; reemplazable con un archivo de config central |
| SEO metadata | 🟡 Media | Centralizada en `PageMeta.jsx` pero las descripciones de cada página son hardcodeadas |
| Servicios geolocalización | 🟡 Media | `CORONEL_DEFAULT`, `CORONEL_CENTER`, geocoding suffix — 3 archivos, cambio localizado |
| Sectores y sub-zonas | 🟡 Media | `SECTOR_COLORS`, `LOCATIONS` — listas hardcodeadas, necesitan venir de BD |
| Mock/seed data | 🟢 Fácil | Solo relevante para desarrollo, reemplazable |
| Variables de entorno | 🟢 Fácil | `VITE_R2_PUBLIC_URL` ya es configurable, solo el fallback hardcodeado |
| Base de datos (schema) | 🔴 Alta | Sin columna `city_id` en ninguna tabla; agregar multi-city requiere migraciones y cambios en todas las queries |
| Panel admin por ciudad | 🔴 Alta | Admin actual es global, sin scope de ciudad |
| Infraestructura R2/CDN | 🟡 Media | Bucket único; multi-ciudad requiere estructura `{city}/{type}/...` o buckets separados |
| Rutas con prefijo ciudad | 🟡 Media | Cambio en Routes.jsx + ajuste de todos los `<Link>` y navegaciones programáticas |

### 4.2 Tabla de Archivos Problemáticos (por impacto)

#### Impacto CRÍTICO (bloquean multi-ciudad)
- `supabase/migrations/20260304161514_coronellocal_schema.sql` — schema sin city_id
- `src/services/geocodingService.js` — geocoding forzado a Coronel
- `src/pages/interactive-map-page/index.jsx` — coordenadas hardcodeadas
- `src/components/PageMeta.jsx` — SITE_NAME y DEFAULT_DESCRIPTION fijos

#### Impacto ALTO (degradan experiencia multi-ciudad)
- `src/pages/post-classified-ad/components/AdForm.jsx` — sectores de Coronel hardcodeados
- `src/pages/homepage/components/HeroSection.jsx` — ciudad hardcodeada
- `src/pages/homepage/components/FooterSection.jsx` — ciudad + región hardcodeadas
- `src/components/Logo.jsx` — logo específico de Koronel.cl
- `src/Routes.jsx` — sin prefijo de ciudad

#### Impacto MEDIO (textos correctivos necesarios)
- ~40 archivos de páginas con menciones de "Coronel" en textos, placeholders y descripciones
- `src/components/ui/SmartSearchInput.jsx` — badge "Coronel" hardcodeado
- `src/components/ui/FeaturedContentCarousel.jsx` — "Coronel" hardcodeado
- `src/pages/business-directory-listing/components/BusinessCard.jsx` — "Coronel" hardcodeado

#### Impacto BAJO (datos de prueba/seed)
- Todos los archivos con mock data de eventos, clasificados y negocios

---

## 5. Evaluación de Estrategias Multi-Ciudad

### Opción A: Subdominios (`santiago.koronel.cl`, `concepcion.koronel.cl`)

**Cómo funcionaría:**
- Una sola instancia del frontend, desplegada en Vercel
- El subdominio se lee al inicio (`window.location.hostname`) para determinar la ciudad activa
- `CITY_CONFIG` se carga según el subdominio
- La base de datos filtra por `city_id` en todas las queries

**Ventajas:**
- SEO excelente (cada subdominio es una entidad separada para Google)
- URLs limpias sin prefijo en rutas internas
- Branding independiente posible por ciudad
- Fácil de escalar: agregar ciudad = nuevo registro DNS + fila en tabla `cities`

**Desventajas:**
- Requiere wildcard DNS en Vercel/Cloudflare
- Cookies de auth con `domain=.koronel.cl` para SSO entre subdominios
- Más complejo para testing local
- El nombre "Koronel" en subdominios es confuso fuera de Coronel (ej. `santiago.koronel.cl` es raro)

**Complejidad de implementación:** Alta (por el wildcard DNS y cambios de schema)

---

### Opción B: Rutas con prefijo (`/coronel`, `/santiago`, `/concepcion`)

**Cómo funcionaría:**
- Prefijo de ciudad en todas las rutas: `/coronel/directorio-negocios`, `/santiago/eventos`
- React Router v6 con parámetro `/:citySlug/*`
- Ciudad activa en Context API

**Ventajas:**
- Sin cambios de DNS ni infra
- Más simple de implementar técnicamente
- Un solo dominio, login único

**Desventajas:**
- SEO inferior a subdominios para keyword targeting local
- Todas las rutas internas deben incluir el slug de ciudad (afecta ~20 componentes de navegación)
- El dominio `koronel.cl` sigue atado a Coronel semánticamente
- Cambio de `Routes.jsx` es disruptivo: rompe todos los `<Link to="...">` existentes

**Complejidad de implementación:** Media-Alta

---

### Opción C: Rebranding completo desacoplado

**Propuesta:** Separar la marca "Koronel" del nombre de la ciudad. Ej: `"LocalHub"`, `"MiCiudad"`, o similar. Cada ciudad tiene su propia identidad visual.

**Ventajas:**
- Escala sin confusión de marca
- No hay conflicto de branding entre "Koronel" (ciudad) y otros mercados
- Permite posicionamiento como SaaS B2B (vender el portal a municipios u operadores locales)

**Desventajas:**
- Mayor inversión en rebranding (nuevo logo, dominio, etc.)
- Koronel.cl ya tiene tracción local, se pierde valor de marca existente

**Complejidad de implementación:** Alta + inversión en marca

---

### Opción D: Multi-instancia (el más pragmático a corto plazo)

**Cómo funcionaría:**
- Cada ciudad = fork del proyecto con su propia configuración
- Un archivo `src/config/site.js` centraliza TODA la config por ciudad
- Deploy separado en Vercel por ciudad (proyecto diferente, misma base de código)
- Base de datos Supabase separada por ciudad (o mismo proyecto, schema separado)

**Ventajas:**
- No requiere cambio de arquitectura de routing
- Quick win: desacoplar config en 1-2 semanas
- Cada ciudad puede tener su branding, dominio y base de datos independiente
- Aislamiento total entre ciudades (fallas no se propagan)

**Desventajas:**
- Actualizaciones de código deben aplicarse N veces (o via monorepo)
- No comparte usuarios entre ciudades
- No hay panel centralizado de gestión multi-ciudad

**Complejidad de implementación:** Baja-Media

---

## 6. Riesgos Técnicos y SEO

### Riesgos SEO

1. **Canibalización de keywords:** Si varios portales/rutas compiten por "negocios en [ciudad]" bajo el mismo dominio, Google puede no rankear ninguno bien.
2. **Thin content en ciudades nuevas:** Si una ciudad tiene pocos datos al lanzar, Google penaliza el contenido pobre.
3. **Migración de URLs existentes:** Si `koronel.cl/directorio-negocios` pasa a `koronel.cl/coronel/directorio-negocios` o `coronel.koronel.cl/directorio-negocios`, se pierden rankings actuales si no hay redirecciones 301 correctas.
4. **Inconsistencia de metadatos:** Los og:title y descriptions actuales hardcodean "Coronel" — si se sirve otro contenido bajo los mismos paths, los previews sociales serán incorrectos hasta actualizar.
5. **robots.txt:** Actualmente es `Disallow:` vacío (todo permitido). Multi-ciudad requiere considerar páginas de ciudades vacías (crawl budget).

### Riesgos Técnicos

1. **Schema de BD sin `city_id`:** La migración para agregar `city_id` a `businesses`, `classified_ads`, `events`, `jobs`, `community_posts` es una operación que requiere backfill + ajuste de TODAS las queries y RLS policies.
2. **Geocoding hardcodeado:** `geocode()` añade `', Coronel, Chile'` a todas las búsquedas. En otra ciudad dará resultados incorrectos o nulos.
3. **Mapa centrado en Coronel:** `CORONEL_CENTER` y `DEFAULT_ZOOM` hardcodeados. El mapa interactivo mostraría Coronel aunque el portal sea de Santiago.
4. **Sectores/barrios hardcodeados:** `SECTOR_COLORS` y `LOCATIONS` en AdForm son específicos de Coronel. Otra ciudad muestra los barrios de Coronel.
5. **CDN multimedia:** El bucket R2 `multimedia-koronel` almacena todos los archivos. Multi-ciudad necesitaría estructura de paths o buckets separados.
6. **Autenticación compartida vs. aislada:** Supabase Auth es global. Decidir si usuarios de Coronel pueden acceder al portal de Santiago (positivo para UX) o no (aislamiento).
7. **Admin sin scope:** El admin actual ve y modera todos los datos. En multi-ciudad, un admin de Coronel no debe ver datos de Santiago.

### Dependencias Ocultas

- El `USER_AGENT` de Nominatim incluye `coronellocal.cl` — si Nominatim aplica rate limiting por dominio, otra ciudad usaría el mismo "cupo".
- Los fallbacks de CDN (`multimedia.koronel.cl`) están en 6 lugares distintos: si se cambia el dominio solo en `.env`, los fallbacks en código duro siguen activos.
- El `package.json` tiene `"name": "coronelportal"` — irrelevante en producción pero genera confusión en desarrollo.
- `public/koronel-logo.png` es el único asset de marca — cualquier ciudad nueva necesita su propio logo en `/public`.

---

## 7. Quick Wins (sin tocar arquitectura)

Estos cambios pueden hacerse en **1-3 días** y preparan el terreno:

### QW-1: Crear `src/config/site.js` (1-2h)
```js
// src/config/site.js
export const SITE_CONFIG = {
  name: 'CoronelLocal',
  city: 'Coronel',
  region: 'Región del Biobío',
  country: 'Chile',
  lat: -37.0167,
  lng: -73.1500,
  mapCenter: [-37.0298, -73.1429],
  mapZoom: 14,
  cdnUrl: import.meta.env.VITE_R2_PUBLIC_URL || 'https://multimedia.koronel.cl',
  sectors: ['Centro', 'Coronel Norte', 'Coronel Sur', 'Boca Sur', 'Lagunillas', 'Palomares', 'Schwager'],
  geocodingSuffix: ', Coronel, Chile',
  whatsappMention: 'CoronelLocal',
};
```
**Impacto:** Todos los valores de ciudad quedan en un lugar. Cambiar de ciudad = cambiar este archivo (o cargarlo desde BD).

### QW-2: Refactorizar `PageMeta.jsx` para usar `SITE_CONFIG` (30min)
Reemplazar las constantes hardcodeadas con los valores del config.

### QW-3: Refactorizar `geocodingService.js` (30min)
Reemplazar `CORONEL_DEFAULT` y el suffix `', Coronel, Chile'` con valores del `SITE_CONFIG`.

### QW-4: Refactorizar `interactive-map-page/index.jsx` (30min)
Reemplazar `CORONEL_CENTER`, `DEFAULT_ZOOM` y `SECTOR_COLORS` con valores del config.

### QW-5: Centralizar CDN fallback (1h)
Crear `src/lib/cdn.js` con la función `cdnUrl(path)` y reemplazar los 6 fallbacks hardcodeados.

### QW-6: Limpiar mock/seed data (1h)
Mover todos los datos mock a archivos `src/mocks/*.js` y reemplazar las constantes inline en páginas de detalle (`business-profile-page/index.jsx`, `event-detail-page/index.jsx`, etc.).

---

## 8. Plan de Migración Gradual (Multi-Ciudad Completa)

### Fase 1 — Desacople de config (1-2 semanas) ✅ Prerequisito
- [ ] Crear `src/config/site.js` (QW-1 a QW-6)
- [ ] Reemplazar TODOS los strings "Coronel" en UI con `SITE_CONFIG.city`
- [ ] Centralizar logo como config (no asset hardcodeado)
- [ ] Actualizar `index.html` para usar variables (o script de build que las inyecta)
- [ ] Centralizar `LOCATIONS` (sectores) como dato configurable

**Resultado:** El portal es 100% re-brandeable cambiando UN archivo sin tocar código.

### Fase 2 — Esquema de BD multi-ciudad (2-3 semanas)
- [ ] Crear tabla `cities` en Supabase:
  ```sql
  CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,  -- 'coronel', 'santiago', 'concepcion'
    name TEXT NOT NULL,
    region TEXT,
    country TEXT DEFAULT 'Chile',
    lat NUMERIC(10,7),
    lng NUMERIC(10,7),
    default_zoom INTEGER DEFAULT 14,
    cdn_url TEXT,
    sectors JSONB,
    is_active BOOLEAN DEFAULT true
  );
  ```
- [ ] Agregar `city_id UUID REFERENCES cities(id)` a: `businesses`, `classified_ads`, `events`, `jobs`, `community_posts`
- [ ] Backfill: `UPDATE businesses SET city_id = (SELECT id FROM cities WHERE slug='coronel')`
- [ ] Actualizar todas las queries en servicios para filtrar por `city_id`
- [ ] Actualizar RLS policies para incluir scope de ciudad si se desea aislamiento

### Fase 3 — Routing multi-ciudad (1-2 semanas)
**Opción recomendada: Subdominios** (ver sección 5, Opción A)
- [ ] Configurar wildcard DNS `*.koronel.cl` en Cloudflare
- [ ] Configurar wildcard domain en Vercel
- [ ] Crear `CityContext` que lee `window.location.hostname` al cargar
- [ ] Cargar `SITE_CONFIG` desde BD según ciudad detectada
- [ ] Adaptar `geocodingService.js` para usar coordenadas dinámicas

### Fase 4 — Admin multi-ciudad (1-2 semanas)
- [ ] Agregar `city_id` a tabla `admin_users` (o crear tabla de permisos)
- [ ] Filtrar todas las vistas de admin por ciudad del admin logueado
- [ ] Super-admin ve todas las ciudades; city-admin ve solo la suya

### Fase 5 — SEO y lanzamiento gradual (1 semana por ciudad)
- [ ] Verificar redirecciones 301 si se cambian URLs
- [ ] Crear sitemap dinámico por ciudad
- [ ] Configurar Google Search Console por subdominio/ciudad
- [ ] Seed data mínimo para ciudad nueva antes del lanzamiento

---

## 9. Estrategia Recomendada

**Recomendación: Opción A (Subdominios) + Fase 1 como prerequisito inmediato**

### Razonamiento

1. **SEO local**: Los subdominios permiten rankear `concepcion.koronel.cl` para "negocios en Concepción" sin canibalizar `koronel.cl` (=Coronel). Es el enfoque que usan Yelp, Booking, TripAdvisor para mercados locales.

2. **Branding existente**: "Koronel" puede mantenerse como nombre de plataforma mientras el subdominio indica la ciudad. `coronel.koronel.cl` puede redirigir a `koronel.cl` para mantener la URL actual de Coronel.

3. **Escalabilidad**: Agregar una ciudad nueva = 1 fila en tabla `cities` + registro DNS. Sin deploys adicionales.

4. **Aislamiento controlado**: Datos separados por ciudad en la misma BD (via `city_id`), con opción de separar instancias Supabase si crece mucho.

5. **Quick win inmediato**: La Fase 1 (desacople de config) toma 1-2 semanas y ya hace el proyecto multi-ciudad-ready sin cambios estructurales. El resto puede hacerse iterativamente.

### Estructura de URLs propuesta

```
koronel.cl              → Coronel (ciudad original, sin subdominio o coronel.koronel.cl redirige)
concepcion.koronel.cl   → Concepción
santiago.koronel.cl     → Santiago
talcahuano.koronel.cl   → Talcahuano
```

O considerando un rebranding suave:
```
koronel.cl/coronel      → preserva SEO actual con redirección limpia
koronel.cl/concepcion   → nueva ciudad bajo mismo dominio
```

---

## 10. Estimación de Complejidad Total

| Fase | Duración estimada | Riesgo | Impacto SEO |
|---|---|---|---|
| Fase 1: Desacople config | 1-2 semanas | Bajo | Neutro |
| Fase 2: Schema BD | 2-3 semanas | Medio-Alto | Neutro |
| Fase 3: Routing subdominios | 1-2 semanas | Medio | Alto positivo |
| Fase 4: Admin multi-ciudad | 1-2 semanas | Bajo | Neutro |
| Fase 5: SEO + lanzamiento | 1 sem/ciudad | Bajo | Alto positivo |

**Total para multi-ciudad funcional con 2 ciudades:** ~6-9 semanas de desarrollo.  
**Con solo Fase 1 (desacople):** 1-2 semanas. Ya es suficiente para escalar a ciudades adicionales vía multi-instancia.

---

## 11. Conclusión

Koronel.cl es un portal local bien construido técnicamente (React moderno, Supabase, Vercel, Tailwind), pero con acoplamiento profundo a la ciudad de Coronel en todas sus capas. **No existe ninguna abstracción de "ciudad" en el código actual**.

La transformación a multi-ciudad es viable y el camino más corto es:
1. **Inmediato (1-2 sem):** Centralizar config en `site.js` — bajo riesgo, alto valor.
2. **Corto plazo (1-2 meses):** Agregar `city_id` al schema y subdominios — habilita verdadera multi-ciudad.
3. **Medio plazo:** Admin multi-ciudad, SEO por ciudad, onboarding de nuevas ciudades.

El riesgo SEO más importante es **no hacer redirecciones correctas** si se cambian URLs existentes de Coronel.cl.
