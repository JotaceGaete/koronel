const CACHE = new Map();
export const CORONEL_DEFAULT = { lat: -37.0167, lng: -73.1500 };
const USER_AGENT = 'CoronelPortal/1.0 (coronellocal.cl)';

// Bounding box de la comuna de Coronel: west, south, east, north
const CORONEL_BBOX = { west: -73.22, south: -37.09, east: -73.09, north: -36.96 };
const VIEWBOX = `${CORONEL_BBOX.west},${CORONEL_BBOX.north},${CORONEL_BBOX.east},${CORONEL_BBOX.south}`;

function insideCoronel({ lat, lng }) {
  return (
    lat >= CORONEL_BBOX.south &&
    lat <= CORONEL_BBOX.north &&
    lng >= CORONEL_BBOX.west &&
    lng <= CORONEL_BBOX.east
  );
}

function distToCenter(lat, lng) {
  const dlat = lat - CORONEL_DEFAULT.lat;
  const dlng = lng - CORONEL_DEFAULT.lng;
  return dlat * dlat + dlng * dlng;
}

function buildQuery(addressText) {
  const text = addressText.trim().toLowerCase();
  // Avoid duplicating "coronel" if the user already typed it
  const hasCoronel = /\bcoronel\b/.test(text);
  const suffix = hasCoronel ? ', Biobío, Chile' : ', Coronel, Biobío, Chile';
  return addressText.trim() + suffix;
}

export async function geocode(addressText) {
  if (!addressText?.trim()) return null;
  const key = addressText.trim().toLowerCase();
  if (CACHE.has(key)) return CACHE.get(key);

  const query = encodeURIComponent(buildQuery(addressText));
  const url = [
    'https://nominatim.openstreetmap.org/search',
    `?q=${query}`,
    '&format=json',
    '&limit=5',
    '&countrycodes=cl',
    `&viewbox=${VIEWBOX}`,
    '&bounded=1',
  ].join('');

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es' },
    });
    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
    const data = await res.json();
    if (!data?.length) return null;

    // Prefer results inside the commune; among those pick the closest to center
    const candidates = data.map(r => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      display_name: r.display_name,
    }));

    const inside = candidates.filter(insideCoronel);
    const pool = inside.length ? inside : candidates;
    const best = pool.reduce((a, b) =>
      distToCenter(a.lat, a.lng) <= distToCenter(b.lat, b.lng) ? a : b
    );

    // Reject if still way outside Coronel (> ~15 km)
    if (!insideCoronel(best) && distToCenter(best.lat, best.lng) > 0.03) return null;

    CACHE.set(key, best);
    return best;
  } catch (err) {
    console.error('geocode error:', err);
    return null;
  }
}

export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}
