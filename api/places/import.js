/**
 * Vercel serverless: importa negocios desde Google Places a Supabase + R2.
 * Descarga fotos del servidor (sin exponer la API key al navegador).
 * Requiere JWT de Supabase (admin) en Authorization: Bearer <token>
 *
 * POST body: { places: PlaceDetail[], tipo: string, publish?: boolean }
 * Response:  { results: ImportResult[], succeeded: number, failed: number }
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const SUPABASE_URL   = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL  || '';
const SUPABASE_ANON  = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const R2_ACCOUNT_ID  = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET      = process.env.R2_BUCKET_NAME || 'multimedia-koronel';
const R2_PUBLIC_URL  = (process.env.R2_PUBLIC_URL || 'https://multimedia.koronel.cl').replace(/\/$/, '');
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_BASE    = 'https://maps.googleapis.com/maps/api/place';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getR2() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
  });
}

async function downloadPhoto(photoRef) {
  const url = `${PLACES_BASE}/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoRef)}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Photo HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { buffer, contentType };
}

async function importOne(place, tipo, publish, supabase, r2) {
  const phone = place.formatted_phone_number || place.international_phone_number || null;
  const openingHours = place.opening_hours
    ? { periods: place.opening_hours.periods, weekday_text: place.opening_hours.weekday_text }
    : null;

  const { data: biz, error } = await supabase
    .from('businesses')
    .insert({
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
      admin_notes:   `Importado desde Google Places · place_id: ${place.place_id}`,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  const businessId = biz.id;
  const photoUrls  = [];

  if (r2 && GOOGLE_API_KEY && place.photos?.length) {
    const refs = place.photos.slice(0, 5);
    for (let i = 0; i < refs.length; i++) {
      try {
        const { buffer, contentType } = await downloadPhoto(refs[i].photo_reference);
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const key = `businesses/${businessId}/${Date.now()}-${i}.${ext}`;

        await r2.send(new PutObjectCommand({
          Bucket:      R2_BUCKET,
          Key:         key,
          Body:        buffer,
          ContentType: contentType,
        }));

        const url = `${R2_PUBLIC_URL}/${key}`;
        await supabase.from('business_images').insert({
          business_id: businessId,
          storage_path: url,
          alt_text:    place.name,
          is_primary:  i === 0,
          sort_order:  i,
        });

        if (i === 0) {
          await supabase.from('businesses').update({ logo_url: url }).eq('id', businessId);
        }

        photoUrls.push(url);
      } catch {
        // Non-fatal — business is still imported without this photo
      }
      await sleep(120);
    }
  }

  return { id: businessId, photos: photoUrls };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '')?.trim();
  if (!token) return res.status(401).json({ error: 'Authorization header requerido' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Token inválido' });

  const body    = req.body || {};
  const places  = body.places;
  const tipo    = (body.tipo    || '').trim();
  const publish = body.publish  === true || body.publish === 'true';

  if (!Array.isArray(places) || places.length === 0) {
    return res.status(400).json({ error: '"places" debe ser un array no vacío' });
  }

  const r2 = getR2();
  const results = [];

  for (const place of places) {
    try {
      const { id, photos } = await importOne(place, tipo, publish, supabase, r2);
      results.push({ success: true, id, name: place.name, photos });
    } catch (e) {
      results.push({ success: false, name: place.name, error: e.message });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed    = results.filter((r) => !r.success).length;

  return res.status(200).json({ results, succeeded, failed });
};
