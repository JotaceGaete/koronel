# Diagnóstico: dependencias del frontend hacia Coronel / community_cities

**Estado: diagnóstico. Ningún código se modifica en este documento.**

Objetivo del diagnóstico: detectar todo lo que en el frontend todavía
depende de un valor fijo de Coronel (aunque esté encapsulado en
`CITY_CONFIG`), separar qué ya puede venir de `community_cities`, qué
sigue dependiendo del fallback estático, y qué no puede migrarse sin
romper algo — antes de tocar una sola línea.

## Resumen ejecutivo

El trabajo de Fase B/C (contexto `CityContext`/`useCity()`, singleton
`getActiveCityConfig()` para services/utils) ya dejó **prácticamente
todo** el frontend leyendo la ciudad a través de un solo punto de
entrada, con fallback automático a `CITY_CONFIG` cuando `community_cities`
no resuelve nada. Confirmé con grep exhaustivo que **no hay fugas**: cero
literales de `Coronel`, `koronel.cl`, `coronellocal.cl`, `CoronelLocal`,
`56993443682`, coordenadas o `es-CL` fuera de `src/config/city.js` (el
propio fallback).

Lo que queda no es "código que rompe el patrón", sino tres categorías
distintas:

1. **Dos casos donde el dato YA existe en `community_cities` y ya está
   mapeado en `cityService.js`, pero ningún componente lo usa todavía**
   (el logo y el favicon). Esto es trabajo pendiente de bajo riesgo.
2. **Dos artefactos que son inherentemente estáticos de build** (`index.html`,
   `public/manifest.json`) — no pueden depender de una consulta en
   tiempo de ejecución sin un cambio de infraestructura (SSR/edge). Esto
   requiere una decisión arquitectónica antes de tocarlos.
3. **Un caso de datos sin modelar** (listas de sectores/barrios) que no
   tiene equivalente en el esquema `community_cities` hoy, y un caso
   fuera del frontend (funciones serverless de upload) que comparten el
   mismo problema pero con un mecanismo de resolución distinto.

## 1. Ya migrado a `useCity()` / `getActiveCityConfig()` — funcionando hoy

Confirmado por grep exhaustivo sobre `src/**/*.{js,jsx}`: cero
referencias directas a `import.meta.env.VITE_CITY_*` / `VITE_SITE_*` /
`VITE_R2_*` / `VITE_ADMIN_*` fuera de `src/config/city.js`. Todo pasa por
el hook o el singleton:

| Campo `CITY_CONFIG` | Columna `community_cities` | Dónde se consume |
|---|---|---|
| `name`, `region`, `country`, `countryCode` | `name`, `region`, `country`, `country_code` | Textos, placeholders, `cityFullLabel()` |
| `phoneCountryCode` | `phone_country_code` | `utils/phone.js` (formateo/validación) |
| `locale`, `currency` | `locale`, `currency` | `utils/format.js` (fechas, moneda, números) |
| `center.lat/lng` | `center_lat`, `center_lng` | `OSMMap`, mapas, geocoding bias |
| `siteName` | `site_name` | `PageMeta` (title, og:site_name), footer |
| `siteDomain` | `domain` | `geocodingService.js` (User-Agent de Nominatim) |
| `siteDescription` | `site_description` | `PageMeta` (meta description, og:description) |
| `mediaBaseUrl` | `media_base_url` | `adService`, `businessService`, `mapService` (URLs de imágenes) |
| `adminWhatsapp` | `admin_whatsapp` | `SuccessModal` (WhatsApp al admin tras publicar aviso) |

`PageMeta.jsx` (título, meta description, Open Graph) ya es 100%
dinámico vía `useCity()`.

## 2. El dato existe en `community_cities` y en `cityService.mapCityRow()`, pero el frontend no lo usa todavía

### 2.1 `logoUrl` / `community_cities.logo_url` — **el hallazgo más importante**

**Archivo:** `src/components/Logo.jsx` (usado en header, login, footer —
prácticamente toda página).

```jsx
export default function Logo({ ... }) {
  // No llama a useCity() en absoluto
  return (
    <Link to={to} ...>
      <img src="/koronel-logo.png" alt="Koronel.cl" ... />
    </Link>
  );
}
```

`logoUrl` ya viaja desde la DB (`cityService.js:20`) pero nada lo lee.
El logo del sitio es 100% estático hoy, en el componente más reutilizado
de la app.

### 2.2 `faviconUrl` / `community_cities.favicon_url`

También mapeado (`cityService.js:21`) y usado en cero lugares. El favicon
real del navegador viene únicamente del `<link rel="icon"
href="/favicon.ico">` estático en `index.html` (ver sección 3). El único
lugar donde hoy aparece `/favicon.ico` en código es como *fallback de
imagen para Open Graph* en `PageMeta.jsx:17` — no como favicon real.

### 2.3 `theme` (JSONB) — mapeado, sin uso, y con un gap de forma

`cityService.mapCityRow()` devuelve `theme: row.theme || {}`, pero el
objeto estático `CITY_CONFIG` en `src/config/city.js` **no tiene una
clave `theme` en absoluto**. Hoy es inofensivo porque nada lee
`.theme`, pero es una inconsistencia de forma entre el fallback y el
valor real: el día que algo llame a `CITY_CONFIG.theme.algo` antes de
que exista la fila en `community_cities`, sería un `undefined.algo`.

## 3. Depende del mecanismo de build, no de una consulta en tiempo de ejecución

### 3.1 `index.html`

```html
<title>%VITE_SITE_NAME% | Negocios, Clasificados, Eventos y Empleos en %VITE_CITY_NAME%</title>
<meta name="description" content="... en %VITE_CITY_NAME% y la región. ... en %VITE_SITE_NAME%." />
```

Los placeholders `%VITE_SITE_NAME%` / `%VITE_CITY_NAME%` se resuelven en
**build time** por un plugin custom de Vite
(`vite.config.js` → `htmlCityDefaults`), con fallback a los valores de
Coronel si las env vars no están seteadas. Esto ya es "cero cambio
visible" — pero es fundamentalmente distinto al resto del sistema: no
hay ninguna petición HTTP en el momento en que esto se resuelve, así que
**no puede consultar `community_cities`**. Es, además, lo que ven los
crawlers/bots que no ejecutan JavaScript (varios unfurlers de redes
sociales no ejecutan React) — para esos casos, este valor de build es el
`title`/`description` real, no lo que `PageMeta` pone después.

### 3.2 `public/manifest.json`

```json
{ "short_name": "CoronelLocal", "name": "CoronelLocal", ... }
```

Ni siquiera tiene el mecanismo de placeholder que sí tiene `index.html`
— Vite copia este archivo byte a byte a `build/`, sin ninguna
sustitución. El nombre que ve un usuario al "Instalar app" (PWA) es
literalmente `"CoronelLocal"` sin importar las env vars ni la DB.

### 3.3 `public/favicon.ico`, `public/koronel-logo.png`

Archivos binarios estáticos, un solo archivo global por deployment. Hoy
el mecanismo real para que una ciudad tenga su propio logo/favicon es:
un deployment de Vercel distinto, con sus propios archivos en `public/`
y sus propias env vars — no hay (ni puede haber sin más trabajo) una
forma de que el mismo build sirva un favicon distinto según dominio, más
allá de lo que ya permite el patrón `logoUrl`/`faviconUrl` +
`<img>`/`<link>` dinámico vía Helmet (ver sección 5).

**Punto arquitectónico a confirmar antes de tocar 3.1–3.3 (no lo asumo,
lo dejo como pregunta):** el modelo de deployment actual — una ciudad
por proyecto Vercel, con sus propias env vars y sus propios archivos
estáticos — ya resuelve "una ciudad por build" sin necesitar
`community_cities` para nada de esto. La resolución por dominio/subdominio
en `community_cities` importa específicamente para el escenario "un solo
deployment sirviendo varios dominios" (multi-tenant real). Si ese sigue
siendo el objetivo final, `index.html`/`manifest.json` **no se pueden
resolver en tiempo de ejecución sin agregar server-side rendering o una
edge function** que sirva HTML dinámico según el `Host` de la request —
eso sí sería un cambio de infraestructura grande, fuera de "sin cambios
funcionales visibles". Si el modelo real seguirá siendo "un deployment
por ciudad" (como es hoy), estos dos archivos ya están resueltos con el
mecanismo actual y no hace falta tocarlos en esta fase.

## 4. No tiene dónde vivir en `community_cities` hoy (fuera de alcance, no romper nada intentando forzarlo)

### 4.1 `src/config/sectors.js`

```js
export const COMMUNITY_SECTORS = ['Centro', 'Lagunillas', 'Schwager', 'Puchoco', 'Las Higueras', 'Punta de Parra', 'Otro'];
export const CLASSIFIED_AD_SECTORS = ['Centro', 'Coronel Norte', 'Coronel Sur', 'Boca Sur', 'Lagunillas', 'Palomares', 'Schwager', 'Otro sector'];
// + dos paletas de colores por nombre de sector
```

Usado en 9 archivos (Q&A, clasificados, mapa interactivo). Son listas de
barrios/sectores específicos de Coronel — `community_cities` no modela
"lista de sub-áreas de una ciudad" (sería una tabla nueva o una columna
JSONB). Migrar esto sin agregar esquema nuevo no es posible; agregar
esquema nuevo no es "cero cambio funcional" trivial (cambia qué opciones
ve el usuario en un `<select>`, entre otras cosas) — **lo dejo
documentado como deuda técnica, fuera de esta fase.**

## 5. Fuera del alcance "frontend" que pediste, pero mismo problema — lo dejo anotado

### 5.1 `api/upload/signed-url.js`, `api/upload/confirm.js`

Funciones serverless de Vercel (Node, fuera del bundle de Vite — no
pueden importar `CITY_CONFIG` ni usar `useCity()`):

```js
const PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://multimedia.koronel.cl';
```

Ya son env-driven con fallback a Coronel — mismo patrón que el resto,
pero viven en un runtime distinto y hoy no tienen ningún concepto de
"para qué ciudad es este upload" (no reciben `city_id` en el request).
No es parte de "el frontend" que pediste auditar, pero comparte la
misma clase de riesgo si algún día hay más de un `media_base_url` activo
al mismo tiempo. Lo anoto para no perderlo de vista, sin proponer
cambios ahora.

## 6. Riesgos

- **Logo/favicon dinámicos (sección 2):** el cambio en sí es de bajo
  riesgo (mismo patrón `useCity()` + fallback ya usado en 30+ archivos),
  pero **antes de implementarlo hay que confirmar el valor real de
  `logo_url`/`favicon_url` en la fila `coronel` de producción** — la
  migración semilla los deja `NULL`, así que si nadie los cargó a mano,
  `CITY_CONFIG.logoUrl || '/koronel-logo.png'` es exactamente "cero
  cambio visible". Si alguien cargó algo distinto sin querer, hay que
  saberlo antes, no descubrirlo en producción.
- **`theme: {}` en el fallback estático:** cambio trivial y seguro,
  puramente defensivo (evita un futuro `undefined.algo`), cero
  comportamiento observable hoy.
- **`index.html`/`manifest.json`:** el riesgo real no es de
  implementación sino de **alcance** — si se intenta resolverlos en
  runtime sin antes decidir el modelo de deployment (sección 3.3), el
  camino más corto termina siendo SSR/edge, que sí es un cambio grande y
  no encaja en "sin cambios visibles ni funcionales". Por eso lo marco
  como decisión a confirmar, no como tarea de código.
- **`sectors.js`:** cualquier intento de "solucionarlo" ahora
  necesariamente cambia qué esquema existe (tabla nueva o JSONB) — eso
  ya no es un cambio de solo-frontend ni cero-riesgo. Se queda como
  deuda documentada.

## 7. Estrategia de implementación por etapas (propuesta — no implementada)

### Etapa 1 — bajo riesgo, mismo patrón ya usado (recomendada para ejecutar primero)

1. `Logo.jsx`: agregar `useCity()`, usar
   `CITY_CONFIG.logoUrl || '/koronel-logo.png'` como `src`, y el `alt`
   derivado de `CITY_CONFIG.siteName` en vez de `"Koronel.cl"` fijo.
2. `PageMeta.jsx`: agregar un `<link rel="icon" href={CITY_CONFIG.faviconUrl || '/favicon.ico'} />`
   dinámico vía Helmet (favicon real del navegador, hoy inexistente como
   concepto dinámico), y usar `CITY_CONFIG.logoUrl` antes que
   `/favicon.ico` como fallback de `og:image`.
3. `config/city.js`: agregar `theme: {}` al objeto estático para que
   coincida con la forma que devuelve `mapCityRow()`.
4. Verificación previa obligatoria (pedírtela a ti, no asumir):
   confirmar `logo_url`/`favicon_url` reales de la fila `coronel`.
5. Un commit por punto, `test:run` + `build` verdes después de cada uno,
   igual que el resto de esta fase.

### Etapa 2 — documentar como deuda, no tocar código

6. Nota en `docs/diseno-multi-ciudad.md` (o un doc nuevo) sobre
   `sectors.js`: requiere una entidad nueva (tabla o JSONB) antes de
   poder migrarse; queda fuera de esta fase.
7. Nota sobre `api/upload/*.js`: requiere decidir cómo una función
   serverless conoce la ciudad activa de un request (header, query
   param, claim del JWT) antes de tocarlo; fuera del alcance de
   "frontend" y de esta fase.

### Etapa 3 — decisión arquitectónica a confirmar antes de escribir nada

8. Confirmar el modelo de deployment objetivo (pregunta de la sección
   3.3): ¿"una ciudad por deployment" sigue siendo el modelo real (como
   hoy), o el objetivo final es multi-tenant real (un deployment
   sirviendo varios dominios)? La respuesta determina si
   `index.html`/`manifest.json` necesitan trabajo futuro (SSR/edge) o si
   ya están resueltos y no hace falta tocarlos.

No se toca ningún archivo de código hasta que confirmes cuáles de estas
etapas quieres ejecutar.
