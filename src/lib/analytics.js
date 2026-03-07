/**
 * Analytics helper. Solo activo en producción.
 * - GA4: definir VITE_GA_MEASUREMENT_ID en .env (ej. G-XXXXXXXXXX).
 * - Para Plausible: añadir script en index.html y opcionalmente VITE_PLAUSIBLE_DOMAIN.
 */

const isProd = import.meta.env.PROD;
const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * Inicializa analytics (solo en producción).
 * Llamar una vez al arranque, p. ej. en main.jsx o App.jsx.
 */
export function initAnalytics() {
  if (!isProd) return;
  if (gaId) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { send_page_view: false });
  }
}

/**
 * Registra una vista de página (SPA). Llamar al cambiar de ruta.
 * @param {string} path - Ruta (ej. /homepage)
 * @param {string} [title] - Título de la página
 */
export function trackPage(path, title) {
  if (!isProd) return;
  if (gaId && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
    });
  }
}

/**
 * Reporte de errores (opcional). En producción se puede conectar a Sentry:
 *   npm install @sentry/react
 *   En main: Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })
 *   Aquí: Sentry.captureException(error, { extra: context })
 */
export function reportError(error, context = {}) {
  if (typeof window.__COMPONENT_ERROR__ === 'function') {
    window.__COMPONENT_ERROR__(error, context);
  }
  if (!isProd) {
    console.error('[reportError]', error, context);
  }
}
