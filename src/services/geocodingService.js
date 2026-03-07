const CACHE = new Map();
export const CORONEL_DEFAULT = { lat: -37.0167, lng: -73.1500 };
const USER_AGENT = 'CoronelPortal/1.0 (coronellocal.cl)';

export async function geocode(addressText) {
  if (!addressText?.trim()) return null;
  const key = addressText?.trim()?.toLowerCase();
  if (CACHE?.has(key)) return CACHE?.get(key);

  const query = encodeURIComponent(addressText?.trim() + ', Coronel, Chile');
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
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
        'User-Agent': USER_AGENT,
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
