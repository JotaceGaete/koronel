import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { siteConfig } from '../config/siteConfig';

// Ciudad activa mientras se resuelve la consulta, si ningún hostname hace
// match, o si la consulta falla — la app nunca debe quedar sin ciudad
// activa. Mismos valores que siteConfig (hoy la única ciudad real).
export const FALLBACK_CITY = {
  id: null,
  slug: 'coronel',
  brand_name: siteConfig?.brandName,
  city_name: siteConfig?.cityName,
  country_name: siteConfig?.countryName,
  domains: [],
  logo_path: siteConfig?.branding?.logoPath,
  logo_alt: siteConfig?.branding?.logoAlt,
  seo_description: siteConfig?.seo?.defaultDescription,
  default_lat: siteConfig?.map?.defaultCenter?.lat,
  default_lng: siteConfig?.map?.defaultCenter?.lng,
  interactive_map_lat: siteConfig?.map?.interactiveMapCenter?.lat,
  interactive_map_lng: siteConfig?.map?.interactiveMapCenter?.lng,
  geocoding_suffix: siteConfig?.map?.geocodingSuffix,
  status: 'active',
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

const CityContext = createContext({ city: FALLBACK_CITY, loading: true, resolutionStatus: 'fallback' });

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
 */
export const CityProvider = ({ children }) => {
  const [city, setCity] = useState(FALLBACK_CITY);
  const [loading, setLoading] = useState(true);
  const [resolutionStatus, setResolutionStatus] = useState('fallback');

  useEffect(() => {
    let mounted = true;
    const hostname = typeof window !== 'undefined' ? window.location?.hostname : '';

    async function loadCity() {
      try {
        const { data, error } = await supabase?.from('cities')?.select('*')?.eq('status', 'active');
        if (!mounted) return;
        if (error) {
          console.error('CityProvider query error:', error);
          setResolutionStatus('error');
          return;
        }
        if (data?.length) {
          const match = resolveCityForHostname(hostname, data);
          if (match) {
            setCity(match);
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

  return (
    <CityContext.Provider value={{ city, loading, resolutionStatus }}>
      {children}
    </CityContext.Provider>
  );
};
