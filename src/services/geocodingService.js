import { CITY_CONFIG, getActiveCityConfig, cityCountryLabel } from '../config/city';

const CACHE = new Map();
/** @deprecated use CITY_CONFIG.center — kept as an alias so existing imports keep working. */
export const CORONEL_DEFAULT = CITY_CONFIG.center;
const userAgent = () => {
  const c = getActiveCityConfig();
  return `${c.siteName}/1.0 (${c.siteDomain})`;
};

export async function geocode(addressText) {
  if (!addressText?.trim()) return null;
  const key = addressText?.trim()?.toLowerCase();
  if (CACHE?.has(key)) return CACHE?.get(key);

  const query = encodeURIComponent(`${addressText?.trim()}, ${cityCountryLabel()}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': userAgent(),
        'Accept-Language': 'es',
      },
    });
    if (!res?.ok) throw new Error(`Nominatim error: ${res.status}`);
    const data = await res?.json();
    if (!data?.length) return null;
    const result = {
      lat: parseFloat(data?.[0]?.lat),
      lng: parseFloat(data?.[0]?.lon),
      display_name: data?.[0]?.display_name,
    };
    CACHE?.set(key, result);
    return result;
  } catch (err) {
    console.error('geocode error:', err);
    return null;
  }
}

export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': userAgent(),
        'Accept-Language': 'es',
      },
    });
    if (!res?.ok) return null;
    const data = await res?.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}
