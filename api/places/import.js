/**
 * Vercel serverless: importa negocios de Google Places a Supabase + R2.
 * Descarga fotos desde Google en el servidor (sin exponer la API key al navegador).
 * Requiere JWT de Supabase (usuario admin) en Authorization: Bearer <token>
 *
 * POST body: { places: PlaceDetail[], tipo: string, publish?: boolean }
 * Response:  { results: ImportResult[], succeeded: number, failed: number }
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const { S3Client }     = require('@aws-sdk/client-s3');
const { importPlace }  = require('./_core');

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL  || '';
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const GOOGLE_KEY    = process.env.GOOGLE_PLACES_API_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET     = process.env.R2_BUCKET_NAME || 'multimedia-koronel';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || 'https://multimedia.koronel.cl').replace(/\/$/, '');

function buildR2() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) return null;
  return {
    client: new S3Client({
      region:      'auto',
      endpoint:    `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
    }),
    bucket:    R2_BUCKET,
    publicUrl: R2_PUBLIC_URL,
  };
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
  if (!user) return res.status(401).json({ error: 'Token inválido o expirado' });

  const body    = req.body || {};
  const places  = body.places;
  const tipo    = (body.tipo || '').trim();
  const publish = body.publish === true || body.publish === 'true';

  if (!Array.isArray(places) || places.length === 0) {
    return res.status(400).json({ error: '"places" debe ser un array no vacío' });
  }

  const r2      = buildR2();
  const options = { publish, apiKey: GOOGLE_KEY, r2 };
  const results = [];

  for (const place of places) {
    try {
      const { id, photos } = await importPlace(place, tipo, options, supabase);
      results.push({ success: true, id, name: place.name, photos });
    } catch (e) {
      results.push({ success: false, name: place.name, error: e.message });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed    = results.filter((r) => !r.success).length;

  return res.status(200).json({ results, succeeded, failed });
};
