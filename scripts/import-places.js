#!/usr/bin/env node
/**
 * Importación masiva de negocios desde Google Places API.
 *
 * Uso:
 *   node scripts/import-places.js --tipo="restaurante" --ciudad="Coronel" --limite=50
 *   node scripts/import-places.js --tipo="farmacia" --ciudad="Coronel" --limite=20 --publish
 *
 * Variables de entorno requeridas (en .env):
 *   GOOGLE_PLACES_API_KEY
 *   VITE_SUPABASE_URL (o SUPABASE_URL)
 *   VITE_SUPABASE_ANON_KEY (o SUPABASE_SERVICE_KEY para bypass RLS)
 *
 * Variables opcionales para subir fotos a R2:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 */
'use strict';

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const readline = require('readline');

// ---------------------------------------------------------------------------
// Parse CLI args: --key=value or --flag
// ---------------------------------------------------------------------------
const args = {};
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--')) continue;
  const eq = arg.indexOf('=');
  if (eq === -1) args[arg.slice(2)] = true;
  else args[arg.slice(2, eq)] = arg.slice(eq + 1);
}

const tipo    = (args.tipo   || args.type   || '').trim();
const ciudad  = (args.ciudad || args.city   || '').trim();
const limite  = Math.min(parseInt(args.limite || args.limit || '20', 10), 120);
const publish = args.publish === true || args.publish === 'true';

if (!tipo || !ciudad) {
  console.error('\nUso: node scripts/import-places.js --tipo="restaurante" --ciudad="Coronel" --limite=50\n');
  console.error('Flags opcionales:');
  console.error('  --publish     Publicar inmediatamente (sin pasar por revisión admin)');
  console.error('  --limite=N    Máximo de resultados (default 20, máx 120)\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL   = process.env.VITE_SUPABASE_URL   || process.env.SUPABASE_URL   || '';
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const R2_ACCOUNT_ID  = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET      = process.env.R2_BUCKET_NAME || 'multimedia-koronel';
const R2_PUBLIC_URL  = (process.env.R2_PUBLIC_URL || 'https://multimedia.koronel.cl').replace(/\/$/, '');

if (!GOOGLE_API_KEY) {
  console.error('\n❌  Falta GOOGLE_PLACES_API_KEY en el archivo .env\n');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n❌  Faltan credenciales de Supabase (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// R2 client (optional — photos are skipped if credentials are missing)
// ---------------------------------------------------------------------------
function getR2() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
  });
}

// ---------------------------------------------------------------------------
// Rate limiting — 120 ms between requests ≈ 8 req/sec (under Google's 10/sec)
// ---------------------------------------------------------------------------
const RATE_MS = 120;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Google Places API helpers
// ---------------------------------------------------------------------------
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

async function gFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

async function downloadPhoto(photoRef) {
  const url = `${PLACES_BASE}/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoRef)}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Photo HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { buffer, contentType };
}

async function uploadToR2(r2Client, buffer, contentType, key) {
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

// ---------------------------------------------------------------------------
// Duplicate check (case-insensitive name match)
// ---------------------------------------------------------------------------
async function isDuplicate(name) {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .ilike('name', name.trim())
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

// ---------------------------------------------------------------------------
// Terminal table renderer
// ---------------------------------------------------------------------------
function col(val, width) {
  const s = String(val ?? '');
  return s.length > width ? s.slice(0, width - 1) + '…' : s.padEnd(width);
}

function printTable(places) {
  const COLS = [3, 33, 36, 16, 28, 5, 4];
  const HDR  = ['#', 'Nombre', 'Dirección', 'Teléfono', 'Sitio web', 'Fotos', 'Dup'];
  const sep  = (l, m, r) => l + COLS.map((w) => '─'.repeat(w + 2)).join(m) + r;

  console.log(sep('┌', '┬', '┐'));
  console.log('│' + HDR.map((h, i) => ` ${col(h, COLS[i])} `).join('│') + '│');
  console.log(sep('├', '┼', '┤'));

  places.forEach((p, idx) => {
    const web = (p.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const row = [
      idx + 1,
      p.name,
      p.formatted_address,
      p.formatted_phone_number || p.international_phone_number || '-',
      web || '-',
      p.photos?.length || 0,
      p.isDuplicate ? '⚠ SÍ' : 'no',
    ];
    console.log('│' + row.map((v, i) => ` ${col(v, COLS[i])} `).join('│') + '│');
  });

  console.log(sep('└', '┴', '┘'));
}

// ---------------------------------------------------------------------------
// Interactive prompt
// ---------------------------------------------------------------------------
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

// ---------------------------------------------------------------------------
// Insert one business + its photos into Supabase / R2
// ---------------------------------------------------------------------------
async function insertBusiness(place, r2) {
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
      category:      tipo,
      admin_notes:   `Importado desde Google Places · place_id: ${place.place_id}`,
    })
    .select('id')
    .single();

  if (error) throw error;

  const businessId = biz.id;

  // Upload up to 5 photos to R2
  if (r2 && place.photos?.length) {
    const refs = place.photos.slice(0, 5);
    for (let i = 0; i < refs.length; i++) {
      try {
        const { buffer, contentType } = await downloadPhoto(refs[i].photo_reference);
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const key = `businesses/${businessId}/${Date.now()}-${i}.${ext}`;
        const url = await uploadToR2(r2, buffer, contentType, key);

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
      } catch {
        // Photo errors are non-fatal — business still gets imported
      }
      await sleep(RATE_MS);
    }
  }

  return businessId;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n🔍  Buscando "${tipo}" en "${ciudad}"  (máx: ${limite})\n`);

  // --- Text Search (paginated) ---
  const places = [];
  let pageToken = null;

  do {
    if (pageToken) await sleep(2200); // Google enforces a delay between page_token requests
    const result = await textSearch(`${tipo} en ${ciudad}`, pageToken);

    if (result.status === 'REQUEST_DENIED') {
      console.error(`\n❌  API key rechazada: ${result.error_message}`);
      console.error('   Verifica que GOOGLE_PLACES_API_KEY tenga acceso a Places API.\n');
      process.exit(1);
    }
    if (result.status !== 'OK' && result.status !== 'ZERO_RESULTS') {
      console.error(`\n❌  Google Places status: ${result.status}\n`);
      process.exit(1);
    }

    for (const r of result.results || []) {
      if (places.length >= limite) break;
      places.push(r);
    }
    pageToken = result.next_page_token;
  } while (pageToken && places.length < limite);

  if (places.length === 0) {
    console.log('⚠   No se encontraron resultados.\n');
    process.exit(0);
  }

  // --- Place Details (one per result) ---
  console.log(`📋  Obteniendo detalles de ${places.length} lugares...\n`);

  const detailed = [];
  for (let i = 0; i < places.length; i++) {
    const pct = String(Math.round(((i + 1) / places.length) * 100)).padStart(3);
    process.stdout.write(`\r   [${String(i + 1).padStart(2)}/${places.length}] ${pct}%  ${places[i].name.slice(0, 50).padEnd(50)}`);
    await sleep(RATE_MS);

    try {
      const { result, status } = await placeDetails(places[i].place_id);
      if (status === 'OK' && result) {
        const dup = await isDuplicate(result.name);
        detailed.push({ ...result, isDuplicate: dup });
      }
    } catch {
      // Skip places that fail detail lookup
    }
  }
  process.stdout.write('\n\n');

  // --- Summary + table ---
  const newOnes = detailed.filter((p) => !p.isDuplicate);
  const dups    = detailed.filter((p) =>  p.isDuplicate);

  console.log(`✅  ${newOnes.length} nuevos  │  ⚠  ${dups.length} posibles duplicados\n`);
  printTable(detailed);

  if (newOnes.length === 0) {
    console.log('\n⚠   Todos ya existen en la base de datos. Nada que importar.\n');
    process.exit(0);
  }

  // --- Interactive selection ---
  const answer = await ask(
    `\n¿Importar? [Enter = todos los ${newOnes.length} nuevos | n = cancelar | 1,3,5 = índices de la tabla]: `,
  );

  let toImport = [];
  if (/^(n|no)$/i.test(answer)) {
    console.log('\nCancelado.\n');
    process.exit(0);
  } else if (answer === '' || /^(s|si|sí|y|yes)$/i.test(answer)) {
    toImport = newOnes;
  } else {
    const indices = answer.split(',').map((n) => parseInt(n.trim(), 10) - 1);
    toImport = indices.map((n) => detailed[n]).filter(Boolean);
  }

  if (toImport.length === 0) {
    console.log('\nSin selección. Saliendo.\n');
    process.exit(0);
  }

  // --- Import ---
  const r2 = getR2();
  if (!r2) console.log('\n⚠   Sin credenciales R2 — las fotos no se subirán\n');

  const statusLabel = publish ? 'publicado' : 'pendiente de revisión';
  console.log(`\n📥  Importando ${toImport.length} negocios (estado: ${statusLabel})...\n`);

  let ok = 0, fail = 0;

  for (const place of toImport) {
    process.stdout.write(`   → ${place.name.slice(0, 52).padEnd(52)}`);
    try {
      await insertBusiness(place, r2);
      console.log(' ✓');
      ok++;
    } catch (e) {
      console.log(` ✗  ${e.message}`);
      fail++;
    }
    await sleep(RATE_MS);
  }

  console.log(`\n🎉  Listo: ${ok} importados, ${fail} errores\n`);
  if (!publish) {
    console.log('   💡 Los negocios están en estado "pendiente".');
    console.log('      Revísalos en el panel de admin → Negocios → Pestaña "Pendiente".');
    console.log('      Para publicar directo: agrega --publish al comando.\n');
  }
}

main().catch((e) => {
  console.error('\nError fatal:', e.message);
  process.exit(1);
});
