// Identidad, SEO y mapa de Coronel — único punto de configuración estática.
//
// Solo incluye lo que el código consume hoy; nada especulativo para
// necesidades multi-ciudad que todavía no existen (tabla `cities`, `city_id`,
// CityContext, resolución por dominio — eso es PR-2 en adelante). Este
// archivo es un punto de partida, no un destino: el día que el branding deba
// poder cambiar en runtime, ese cambio se hace reemplazando cómo se llena
// `siteConfig` (o consumiéndolo desde un CityContext), sin tener que
// renombrarlo ni reestructurar quién lo importa.
const cityName = 'Coronel';
const countryName = 'Chile';

export const siteConfig = {
  // Nombre de marca real usado hoy en producción (SEO, footer, mensajes de
  // WhatsApp, modales). Deliberadamente no es "identidad = ciudad": la marca
  // ('CoronelLocal') y la ciudad ('Coronel') son conceptos distintos incluso
  // hoy, con un solo tenant.
  brandName: 'CoronelLocal',
  cityName,
  countryName,

  branding: {
    logoPath: '/koronel-logo.png',
    logoAlt: 'Koronel.cl',
  },

  seo: {
    defaultDescription:
      'Directorio de negocios, clasificados, eventos, empleos y comunidad en Coronel y la región.',
  },

  map: {
    // Centro usado como fallback cuando un picker de ubicación (OSMMap) no
    // recibe lat/lng explícitos todavía — p. ej. al crear un negocio o
    // evento sin dirección geocodificada aún.
    defaultCenter: { lat: -37.0167, lng: -73.15 },
    // Centro del mapa interactivo de ciudad (vista general de negocios,
    // eventos y comunidad). Valor distinto al de arriba en el código
    // original — no se unificaron porque representan propósitos distintos
    // (fallback de un punto vs. encuadre de la ciudad completa) y no hay
    // evidencia de cuál sería "la" coordenada correcta única.
    interactiveMapCenter: { lat: -37.0298, lng: -73.1429 },
    // Antes un literal fijo ', Coronel, Chile'; ahora se construye desde
    // cityName/countryName para que ambos tengan un consumidor real.
    geocodingSuffix: `${cityName}, ${countryName}`,
  },
};

export default siteConfig;
