import { cityConfig } from 'config/cityConfig';

const CACHE = new Map();
const USER_AGENT = 'KoronelPortal/1.0 (koronel.cl)';

// City center from cityConfig (falls back to Coronel coords)
const CENTER = cityConfig.coordinates; // { lat, lng }
export const CORONEL_DEFAULT = CENTER;

// Bounding box: ~10 km around the city center
// Override via cityConfig if you add VITE_CITY_BBOX in the future
const LAT_SPAN = 0.065;  // ~7 km north-south
const LNG_SPAN = 0.080;  // ~7 km east-west
const BBOX = {
  west:  CENTER.lng - LNG_SPAN,
  east:  CENTER.lng + LNG_SPAN,
  south: CENTER.lat - LAT_SPAN,
  north: CENTER.lat + LAT_SPAN,
};
// Nominatim viewbox format: west,north,east,south
const VIEWBOX = `${BBOX.west},${BBOX.north},${BBOX.east},${BBOX.south}`;

function insideCity({ lat, lng }) {
  return (
    lat >= BBOX.south && lat <= BBOX.north &&
    lng >= BBOX.west  && lng <= BBOX.east
  );
}

function distToCenter(lat, lng) {
  const dlat = lat - CENTER.lat;
  const dlng = lng - CENTER.lng;
  return dlat * dlat + dlng * dlng;
}

function buildQuery(addressText) {
  const text = addressText.trim().toLowerCase();
  const cityName = cityConfig.name;   // e.g. "Coronel"
  const region   = cityConfig.region; // e.g. "Biobío"
  const country  = cityConfig.country;// e.g. "Chile"
  // Avoid duplicating the city name if the user already typed it
  const hasCity = new RegExp(`\\b${cityName.toLowerCase()}\\b`).test(text);
  const suffix = hasCity
    ? `, ${region}, ${country}`
    : `, ${cityName}, ${region}, ${country}`;
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

    const candidates = data.map(r => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      display_name: r.display_name,
    }));

    // Prefer results inside the city bbox; pick the one closest to center
    const inside = candidates.filter(insideCity);
    const pool = inside.length ? inside : candidates;
    const best = pool.reduce((a, b) =>
      distToCenter(a.lat, a.lng) <= distToCenter(b.lat, b.lng) ? a : b
    );

    // Reject if result is more than ~15 km from city center
    if (!insideCity(best) && distToCenter(best.lat, best.lng) > 0.03) return null;

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
