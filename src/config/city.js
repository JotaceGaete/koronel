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

export const CITY_CONFIG = {
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
};

/** "Coronel, Chile" — usado para sesgar geocodificación y textos de ubicación. */
export const cityCountryLabel = () => `${CITY_CONFIG.name}, ${CITY_CONFIG.country}`;

/** "Coronel, Región del Biobío, Chile" — usado en footer/SEO. */
export const cityFullLabel = () => `${CITY_CONFIG.name}, ${CITY_CONFIG.region}, ${CITY_CONFIG.country}`;

export default CITY_CONFIG;
