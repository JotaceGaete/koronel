import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPage } from '../lib/analytics';

/**
 * Envía page_view a analytics en cada cambio de ruta (solo en producción).
 * Debe ir dentro de BrowserRouter.
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPage(location.pathname + (location.search || ''), document.title);
  }, [location.pathname, location.search]);

  return null;
}
