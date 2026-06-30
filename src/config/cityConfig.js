export const cityConfig = {
  slug: import.meta.env.VITE_CITY_SLUG || 'coronel',
  name: import.meta.env.VITE_CITY_NAME || 'Coronel',
  region: import.meta.env.VITE_CITY_REGION || 'Biobío',
  country: import.meta.env.VITE_CITY_COUNTRY || 'Chile',
  domain: import.meta.env.VITE_CITY_DOMAIN || 'koronel.cl',
  coordinates: {
    lat: parseFloat(import.meta.env.VITE_CITY_LAT || '-37.0308'),
    lng: parseFloat(import.meta.env.VITE_CITY_LNG || '-73.1432'),
  },
  searchPlaceholder: `Buscar negocios y emprendimientos en ${import.meta.env.VITE_CITY_NAME || 'Coronel'}...`,
  heroTitle: `Encuentra negocios y emprendimientos en ${import.meta.env.VITE_CITY_NAME || 'Coronel'}`,
  heroSubtitle: `La memoria útil de ${import.meta.env.VITE_CITY_NAME || 'Coronel'} — todo lo que existe en la ciudad, en un solo lugar.`,
  footerTagline: `La memoria viva de negocios y emprendimientos de ${import.meta.env.VITE_CITY_NAME || 'Coronel'}, Chile.`,
  publishFormTitle: `Publica tu negocio o emprendimiento`,
  publishFormSubtitle: `Solo necesitas nombre, categoría y teléfono para aparecer en el directorio.`,
};
