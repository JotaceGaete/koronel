import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
// Renombrado en el import para no colisionar con el campo `siteConfig` que
// expone este mismo contexto (la fila resuelta de public.cities) — este es
// el módulo de configuración estática (PR-1), no el contexto de ciudad.
import { siteConfig as siteConfigDefaults } from '../config/siteConfig';

// Ciudad activa mientras se resuelve la consulta, si ningún hostname hace
// match, o si la consulta falla — la app nunca debe quedar sin ciudad
// activa. Mismos valores que siteConfig (hoy la única ciudad real).
export const FALLBACK_CITY = {
  id: null,
  slug: 'coronel',
  brand_name: siteConfigDefaults?.brandName,
  city_name: siteConfigDefaults?.cityName,
  country_name: siteConfigDefaults?.countryName,
  domains: [],
  logo_path: siteConfigDefaults?.branding?.logoPath,
  logo_alt: siteConfigDefaults?.branding?.logoAlt,
  seo_description: siteConfigDefaults?.seo?.defaultDescription,
  default_lat: siteConfigDefaults?.map?.defaultCenter?.lat,
  default_lng: siteConfigDefaults?.map?.defaultCenter?.lng,
  interactive_map_lat: siteConfigDefaults?.map?.interactiveMapCenter?.lat,
  interactive_map_lng: siteConfigDefaults?.map?.interactiveMapCenter?.lng,
  geocoding_suffix: siteConfigDefaults?.map?.geocodingSuffix,
  // Vínculo con la entidad operativa (public.community_cities), agregado
  // en la migración de Fase 2 — null hasta que el backfill lo resuelva.
  community_city_id: null,
  status: 'active',
  // Campos que solo existen en community_cities (Bloque 1 del MVP de
  // administración de ciudad) — theme trae color principal y textos de
  // portada; sin fila resuelta, valores seguros por defecto.
  theme: {},
  favicon_url: null,
  site_name: siteConfigDefaults?.brandName,
  site_description: siteConfigDefaults?.seo?.defaultDescription,
};

// trim + minúsculas + sin punto final (FQDN trailing dot: "koronel.cl." es
// el mismo host que "koronel.cl"). Entradas no-string devuelven '' en vez
// de lanzar, para que un dato inesperado en `domains` nunca rompa la
// resolución.
function normalizeHostname(hostname) {
  if (typeof hostname !== 'string') return '';
  let normalized = hostname?.trim()?.toLowerCase();
  if (normalized?.endsWith('.')) normalized = normalized?.slice(0, -1);
  return normalized;
}

// Función pura para poder probar la resolución de hostname sin red ni React.
export function resolveCityForHostname(hostname, cities) {
  const normalizedHostname = normalizeHostname(hostname);
  if (!normalizedHostname || !Array.isArray(cities)) return null;
  return cities?.find((c) =>
    Array.isArray(c?.domains) &&
    c?.domains?.some((d) => normalizeHostname(d) === normalizedHostname)
  ) || null;
}

const CityContext = createContext({
  siteConfig: FALLBACK_CITY,
  communityCityId: null,
  // `city` es un alias temporal de `siteConfig`, mantenido por
  // compatibilidad con los consumidores existentes (Fase 3). El nombre
  // correcto para código nuevo es `siteConfig`.
  city: FALLBACK_CITY,
  loading: true,
  resolutionStatus: 'fallback',
});

export const useCity = () => useContext(CityContext);

/**
 * Resuelve la ciudad activa por window.location.hostname contra la tabla
 * `cities`. Nada consume todavía esta ciudad para filtrar datos — eso es
 * PR-3 en adelante. Si no hay match, si la tabla está vacía o si la
 * consulta falla, se mantiene FALLBACK_CITY: nunca bloquea el render ni
 * lanza un error visible al usuario.
 *
 * `resolutionStatus` distingue por qué se está usando FALLBACK_CITY, para
 * que un fallo de resolución no quede completamente oculto (no hay UI para
 * esto todavía, es solo un dato expuesto en el contexto):
 *   - 'resolved': se encontró la ciudad correspondiente al hostname actual.
 *   - 'fallback': la consulta funcionó, pero no hubo match (tabla vacía o
 *     ningún dominio coincide) — comportamiento esperado hoy.
 *   - 'error': la consulta a Supabase falló (excepción o error de la API).
 *
 * `siteConfig` (Fase 3) es la misma fila de `cities` que antes se exponía
 * como `city` — configuración de presentación de sitio (marca, SEO, mapa,
 * dominios), resuelta por hostname. `communityCityId` es
 * `siteConfig.community_city_id` (columna agregada en la migración de
 * Fase 2): el vínculo hacia la entidad operativa real en
 * `community_cities`, o `null` mientras no exista ese vínculo. `city`
 * sigue expuesto como alias exacto de `siteConfig` — misma referencia —
 * únicamente por compatibilidad temporal con los consumidores actuales.
 *
 * Bloque 1 del MVP de administración de ciudad: la consulta ahora trae
 * también, embebida vía la FK community_city_id, la fila de
 * `community_cities` — solo los campos que no tienen equivalente en
 * `cities` (`theme`, `favicon_url`, `site_name`, `site_description`), ya
 * fusionados en el objeto plano que expone `siteConfig`/`city`. No se
 * agrega una segunda consulta: PostgREST resuelve el embed en la misma
 * llamada.
 */
export const CityProvider = ({ children }) => {
  const [siteConfig, setSiteConfig] = useState(FALLBACK_CITY);
  const [loading, setLoading] = useState(true);
  const [resolutionStatus, setResolutionStatus] = useState('fallback');

  useEffect(() => {
    let mounted = true;
    const hostname = typeof window !== 'undefined' ? window.location?.hostname : '';

    async function loadCity() {
      try {
        const { data, error } = await supabase
          ?.from('cities')
          ?.select('*, community_cities(theme, favicon_url, site_name, site_description)')
          ?.eq('status', 'active');
        if (!mounted) return;
        if (error) {
          console.error('CityProvider query error:', error);
          setResolutionStatus('error');
          return;
        }
        if (data?.length) {
          const match = resolveCityForHostname(hostname, data);
          if (match) {
            // PostgREST normalmente embebe una relación a-uno como objeto,
            // pero devuelve un arreglo si no puede desambiguar — normalizar
            // a un solo objeto (o null), igual que en businessService.getById.
            const { community_cities: communityRowRaw, ...cityFields } = match;
            const communityRow = Array.isArray(communityRowRaw) ? communityRowRaw?.[0] : communityRowRaw;
            setSiteConfig({
              ...cityFields,
              theme: communityRow?.theme ?? {},
              favicon_url: communityRow?.favicon_url ?? null,
              site_name: communityRow?.site_name ?? null,
              site_description: communityRow?.site_description ?? null,
            });
            setResolutionStatus('resolved');
            return;
          }
        }
        setResolutionStatus('fallback');
      } catch (err) {
        if (!mounted) return;
        console.error('CityProvider load error:', err);
        setResolutionStatus('error');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCity();
    return () => { mounted = false; };
  }, []);

  const communityCityId = siteConfig?.community_city_id ?? null;

  return (
    <CityContext.Provider
      value={{ siteConfig, communityCityId, city: siteConfig, loading, resolutionStatus }}
    >
      {children}
    </CityContext.Provider>
  );
};
