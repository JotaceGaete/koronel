import { supabase } from '../lib/supabase';

function mapCityRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    region: row.region,
    country: row.country,
    countryCode: row.country_code,
    phoneCountryCode: row.phone_country_code,
    locale: row.locale,
    currency: row.currency,
    center: { lat: row.center_lat, lng: row.center_lng },
    siteName: row.site_name,
    siteDomain: row.domain,
    siteDescription: row.site_description,
    mediaBaseUrl: row.media_base_url,
    adminWhatsapp: row.admin_whatsapp,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    theme: row.theme || {},
  };
}

/**
 * Resuelve la ciudad activa desde community_cities por dominio (con
 * subdominio como respaldo). Devuelve null si la tabla todavía no existe,
 * la consulta falla, o ninguna ciudad activa matchea el host actual — en
 * cualquiera de esos casos el llamador debe usar CITY_CONFIG (src/config/city.js)
 * como si esta función no existiera.
 */
export async function resolveActiveCity() {
  if (typeof window === 'undefined') return null;
  const hostname = window.location?.hostname;
  if (!hostname) return null;

  try {
    const { data: byDomain, error: domainError } = await supabase
      ?.from('community_cities')
      ?.select('*')
      ?.eq('domain', hostname)
      ?.eq('status', 'active')
      ?.maybeSingle();

    if (domainError) throw domainError;
    if (byDomain) return mapCityRow(byDomain);

    const subdomain = hostname.split('.')?.[0];
    if (subdomain) {
      const { data: bySubdomain, error: subdomainError } = await supabase
        ?.from('community_cities')
        ?.select('*')
        ?.eq('subdomain', subdomain)
        ?.eq('status', 'active')
        ?.maybeSingle();

      if (subdomainError) throw subdomainError;
      if (bySubdomain) return mapCityRow(bySubdomain);
    }

    return null;
  } catch {
    // community_cities no existe todavía, sin conexión, o cualquier otro
    // fallo — el llamador cae a CITY_CONFIG estático.
    return null;
  }
}
