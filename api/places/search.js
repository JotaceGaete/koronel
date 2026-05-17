/**
 * Vercel serverless: busca negocios en Google Places API y retorna detalles.
 * Mantiene la API key en el servidor (nunca expuesta al frontend).
 *
 * POST body: { tipo: string, ciudad: string, limite?: number }
 * Response:  { places: PlaceDetail[], total: number }
 */
'use strict';

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_BASE    = 'https://maps.googleapis.com/maps/api/place';

// Rate limiting: 120ms ≈ 8 req/sec (under Google's 10/sec limit)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RATE_MS = 120;

async function gFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
  return res.json();
}

async function textSearch(query, pageToken) {
  let url = `${PLACES_BASE}/textsearch/json?query=${encodeURIComponent(query)}&language=es&key=${GOOGLE_API_KEY}`;
  if (pageToken) url += `&pagetoken=${encodeURIComponent(pageToken)}`;
  return gFetch(url);
}

async function placeDetails(placeId) {
  const fields = [
    'place_id', 'name', 'formatted_phone_number', 'international_phone_number',
    'formatted_address', 'geometry', 'website', 'photos',
    'opening_hours', 'rating', 'user_ratings_total', 'types',
  ].join(',');
  const url = `${PLACES_BASE}/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=es&key=${GOOGLE_API_KEY}`;
  return gFetch(url);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GOOGLE_API_KEY) {
    return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY no está configurada en el servidor.' });
  }

  const body  = req.body || {};
  const tipo  = (body.tipo  || '').trim();
  const ciudad = (body.ciudad || '').trim();
  const max   = Math.min(parseInt(body.limite || 20, 10), 60);

  if (!tipo || !ciudad) {
    return res.status(400).json({ error: 'Los campos "tipo" y "ciudad" son requeridos.' });
  }

  try {
    // --- Text Search (paginated up to max) ---
    const places = [];
    let pageToken = null;

    do {
      if (pageToken) await sleep(2200);
      const result = await textSearch(`${tipo} en ${ciudad}`, pageToken);

      if (result.status === 'REQUEST_DENIED') {
        return res.status(400).json({ error: `Google Places rechazó la API key: ${result.error_message}` });
      }
      if (result.status !== 'OK' && result.status !== 'ZERO_RESULTS') {
        return res.status(502).json({ error: `Google Places status: ${result.status}` });
      }

      for (const r of result.results || []) {
        if (places.length >= max) break;
        places.push(r);
      }
      pageToken = result.next_page_token;
    } while (pageToken && places.length < max);

    // --- Place Details for each result ---
    const detailed = [];
    for (const p of places) {
      await sleep(RATE_MS);
      try {
        const { result, status } = await placeDetails(p.place_id);
        if (status === 'OK' && result) detailed.push(result);
      } catch {
        // Skip if details fail — place_id might be invalid
      }
    }

    return res.status(200).json({ places: detailed, total: detailed.length });
  } catch (e) {
    console.error('places/search error:', e);
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
};
