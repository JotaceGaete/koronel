/**
 * Módulo compartido para importación desde Google Places API.
 * Usado por:
 *   - api/places/search.js   (Vercel serverless)
 *   - api/places/import.js   (Vercel serverless)
 *   - scripts/import-places.js (CLI)
 */
'use strict';

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

/** Milisegundos entre requests — ~8 req/seg, bajo el límite de 10/seg de Google */
const RATE_MS = 120;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Google Places API
// ---------------------------------------------------------------------------

async function gFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
  return res.json();
}

async function textSearch(query, pageToken, apiKey) {
  let url = `${PLACES_BASE}/textsearch/json?query=${encodeURIComponent(query)}&language=es&key=${apiKey}`;
  if (pageToken) url += `&pagetoken=${encodeURIComponent(pageToken)}`;
  return gFetch(url);
}

async function placeDetails(placeId, apiKey) {
  const fields = [
    'place_id', 'name', 'formatted_phone_number', 'international_phone_number',
    'formatted_address', 'geometry', 'website', 'photos',
    'opening_hours', 'rating', 'user_ratings_total', 'types',
  ].join(',');
  const url = `${PLACES_BASE}/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=es&key=${apiKey}`;
  return gFetch(url);
}

async function downloadPhoto(photoRef, apiKey) {
  const url = `${PLACES_BASE}/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoRef)}&key=${apiKey}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Photo HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { buffer, contentType };
}

// ---------------------------------------------------------------------------
// Mapeo canónico: Google Place → fila de la tabla businesses
// ---------------------------------------------------------------------------

function mapPlaceToPayload(place, tipo, publish) {
  const phone = place.formatted_phone_number || place.international_phone_number || null;
  const openingHours = place.opening_hours
    ? { periods: place.opening_hours.periods, weekday_text: place.opening_hours.weekday_text }
    : null;

  return {
    name:          place.name,
    address:       place.formatted_address || null,
    phone,
    whatsapp:      phone,
    website:       place.website || null,
    latitude:      place.geometry?.location?.lat ?? null,
    longitude:     place.geometry?.location?.lng ?? null,
    opening_hours: openingHours,
    source:        'google_places_import',
    status:        publish ? 'published' : 'pending',
    verified:      false,
    featured:      false,
    category:      tipo || null,
    // Guardamos el place_id para detectar re-importaciones
    admin_notes:   `Importado desde Google Places · place_id: ${place.place_id}`,
  };
}

// ---------------------------------------------------------------------------
// Detección de duplicados
// Comprueba por nombre (ilike) y por place_id en admin_notes.
// ---------------------------------------------------------------------------

async function checkDuplicate(name, placeId, supabase) {
  const byName = await supabase
    .from('businesses')
    .select('id')
    .ilike('name', name.trim())
    .limit(1);
  if (byName.data?.length > 0) return true;

  if (placeId) {
    const byPlaceId = await supabase
      .from('businesses')
      .select('id')
      .ilike('admin_notes', `%${placeId}%`)
      .limit(1);
    if (byPlaceId.data?.length > 0) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Importar un solo negocio: insert en businesses + fotos en R2 + business_images
//
// options: {
//   publish   : boolean           — publicar directo o dejar pending
//   apiKey    : string            — Google Places API key (para descargar fotos)
//   r2        : { client, bucket, publicUrl } | null   — credenciales R2
//   maxPhotos : number (default 5)
// }
// ---------------------------------------------------------------------------

async function importPlace(place, tipo, options, supabase) {
  const { publish = false, apiKey, r2 = null, maxPhotos = 5 } = options;
  const payload = mapPlaceToPayload(place, tipo, publish);

  const { data: biz, error } = await supabase
    .from('businesses')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  const photos = [];

  if (r2 && apiKey && place.photos?.length) {
    // Lazy-require para que el módulo funcione sin AWS SDK cuando R2 no está configurado
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const refs = place.photos.slice(0, maxPhotos);
    for (let i = 0; i < refs.length; i++) {
      try {
        const { buffer, contentType } = await downloadPhoto(refs[i].photo_reference, apiKey);
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const key = `businesses/${biz.id}/${Date.now()}-${i}.${ext}`;

        await r2.client.send(new PutObjectCommand({
          Bucket:      r2.bucket,
          Key:         key,
          Body:        buffer,
          ContentType: contentType,
        }));

        const url = `${r2.publicUrl}/${key}`;

        await supabase.from('business_images').insert({
          business_id: biz.id,
          storage_path: url,
          alt_text:    place.name,
          is_primary:  i === 0,
          sort_order:  i,
        });

        if (i === 0) {
          await supabase.from('businesses').update({ logo_url: url }).eq('id', biz.id);
        }

        photos.push(url);
      } catch {
        // Las fotos son opcionales — el negocio se importa igual
      }
      await sleep(RATE_MS);
    }
  }

  return { id: biz.id, photos };
}

// ---------------------------------------------------------------------------
// Búsqueda paginada completa: Text Search → Place Details para cada resultado
//
// onProgress(current, total, name) — callback opcional para progreso
// ---------------------------------------------------------------------------

async function searchAndFetchDetails(tipo, ciudad, limite, apiKey, onProgress) {
  const query = `${tipo} en ${ciudad}`;
  const places = [];
  let pageToken = null;

  // Text Search paginado
  do {
    if (pageToken) await sleep(2200); // Google exige pausa entre page tokens
    const result = await textSearch(query, pageToken, apiKey);

    if (result.status === 'REQUEST_DENIED') {
      throw new Error(`Google Places rechazó la API key: ${result.error_message}`);
    }
    if (result.status !== 'OK' && result.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places status: ${result.status}`);
    }

    for (const r of result.results || []) {
      if (places.length >= limite) break;
      places.push(r);
    }
    pageToken = result.next_page_token;
  } while (pageToken && places.length < limite);

  // Place Details para cada resultado
  const detailed = [];
  for (let i = 0; i < places.length; i++) {
    await sleep(RATE_MS);
    if (onProgress) onProgress(i + 1, places.length, places[i].name);

    try {
      const { result, status } = await placeDetails(places[i].place_id, apiKey);
      if (status === 'OK' && result) detailed.push(result);
    } catch {
      // Skip si falla el detalle de un lugar
    }
  }

  return detailed;
}

module.exports = {
  // Google Places API
  textSearch,
  placeDetails,
  downloadPhoto,
  // Lógica de negocio
  mapPlaceToPayload,
  checkDuplicate,
  importPlace,
  searchAndFetchDetails,
  // Utilidades
  sleep,
  RATE_MS,
};
