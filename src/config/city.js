/**
 * Single source of truth for anything that changes when this engine runs
 * for a different city. Every value falls back to Coronel's current
 * settings, so existing deployments keep behaving exactly as before until
 * the corresponding VITE_* env vars are set for a new city.
 */
const toFloat = (value, fallback) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

/**
 * Mismo contrato de datos que services/cityService.js#mapCityRow() —
 * cualquier propiedad que pueda venir de una fila real de community_cities
 * existe acá también, aunque hoy no tenga uso, para que nunca haya una
 * diferencia de forma entre "ciudad resuelta desde la DB" y "fallback
 * estático". id es null porque no hay UUID de DB en modo fallback.
 */
export const CITY_CONFIG = {
  id: null,
  slug: env.VITE_CITY_SLUG || 'coronel',
  name: env.VITE_CITY_NAME || 'Coronel',
  region: env.VITE_CITY_REGION || 'Región del Biobío',
  country: env.VITE_CITY_COUNTRY || 'Chile',
  countryCode: env.VITE_CITY_COUNTRY_CODE || 'CL',
  phoneCountryCode: env.VITE_PHONE_COUNTRY_CODE || '56',
  locale: env.VITE_LOCALE || 'es-CL',
  currency: env.VITE_CURRENCY || 'CLP',
  center: {
    lat: toFloat(env.VITE_CITY_LAT, -37.0298),
    lng: toFloat(env.VITE_CITY_LNG, -73.1429),
  },
  siteName: env.VITE_SITE_NAME || 'CoronelLocal',
  siteDomain: env.VITE_SITE_DOMAIN || 'coronellocal.cl',
  siteDescription:
    env.VITE_SITE_DESCRIPTION ||
    'Directorio de negocios, clasificados, eventos, empleos y comunidad en Coronel y la región.',
  mediaBaseUrl: env.VITE_R2_PUBLIC_URL || 'https://multimedia.koronel.cl',
  adminWhatsapp: env.VITE_ADMIN_WHATSAPP || '56993443682',
  logoUrl: env.VITE_CITY_LOGO_URL || null,
  faviconUrl: env.VITE_CITY_FAVICON_URL || null,
  theme: {},
};

/**
 * Ciudad activa para módulos que no son componentes React (services, utils)
 * y por lo tanto no pueden usar el hook useCity(). Arranca en CITY_CONFIG
 * (estático) y CityProvider la actualiza una vez que resuelve la ciudad
 * real desde community_cities, para que estos módulos queden en sincro
 * con lo que ve la UI sin que cada uno tenga que importar Supabase.
 */
let activeCityConfig = CITY_CONFIG;

export function getActiveCityConfig() {
  return activeCityConfig;
}

export function setActiveCityConfig(config) {
  activeCityConfig = config || CITY_CONFIG;
}

/** "Coronel, Chile" — usado para sesgar geocodificación y textos de ubicación. */
export const cityCountryLabel = () => `${activeCityConfig.name}, ${activeCityConfig.country}`;

/** "Coronel, Región del Biobío, Chile" — usado en footer/SEO. */
export const cityFullLabel = () => `${activeCityConfig.name}, ${activeCityConfig.region}, ${activeCityConfig.country}`;

export default CITY_CONFIG;
