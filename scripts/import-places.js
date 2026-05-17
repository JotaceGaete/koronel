#!/usr/bin/env node
/**
 * Importación masiva de negocios desde Google Places API.
 * Toda la lógica de Places/Supabase/R2 está en api/places/_core.js (compartida con el panel web).
 *
 * Uso:
 *   node scripts/import-places.js --tipo="restaurante" --ciudad="Coronel" --limite=50
 *   node scripts/import-places.js --tipo="farmacia"    --ciudad="Coronel" --limite=20 --publish
 *
 * Variables de entorno requeridas (en .env):
 *   GOOGLE_PLACES_API_KEY
 *   VITE_SUPABASE_URL  (o SUPABASE_URL)
 *   VITE_SUPABASE_ANON_KEY  (o SUPABASE_SERVICE_KEY para bypass de RLS)
 *
 * Opcionales para subir fotos a R2:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 */
'use strict';

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { S3Client }     = require('@aws-sdk/client-s3');
const readline         = require('readline');
const {
  searchAndFetchDetails,
  checkDuplicate,
  importPlace,
  sleep,
  RATE_MS,
} = require('../api/places/_core');

// ---------------------------------------------------------------------------
// Argumentos CLI
// ---------------------------------------------------------------------------
const args = {};
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--')) continue;
  const eq = arg.indexOf('=');
  if (eq === -1) args[arg.slice(2)] = true;
  else           args[arg.slice(2, eq)] = arg.slice(eq + 1);
}

const tipo    = (args.tipo   || args.type   || '').trim();
const ciudad  = (args.ciudad || args.city   || '').trim();
const limite  = Math.min(parseInt(args.limite || args.limit || '20', 10), 120);
const publish = args.publish === true || args.publish === 'true';

if (!tipo || !ciudad) {
  console.error('\nUso: node scripts/import-places.js --tipo="restaurante" --ciudad="Coronel" --limite=50\n');
  console.error('Opciones:');
  console.error('  --publish   Publicar inmediatamente (sin revisión admin)');
  console.error('  --limite=N  Máximo de resultados (default 20, máx 120)\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Credenciales
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
  console.error('\n❌  Falta GOOGLE_PLACES_API_KEY en .env\n');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n❌  Faltan credenciales de Supabase (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// ---------------------------------------------------------------------------
// Renderizado de tabla ASCII para la terminal
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
// Prompt interactivo de readline
// ---------------------------------------------------------------------------
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n🔍  Buscando "${tipo}" en "${ciudad}"  (máx: ${limite})\n`);

  // Búsqueda paginada + detalles (toda la lógica en _core.js)
  let currentStep = 0, totalSteps = 0;
  const detailed = await searchAndFetchDetails(
    tipo, ciudad, limite, GOOGLE_API_KEY,
    (current, total, name) => {
      currentStep = current;
      totalSteps  = total;
      const pct = String(Math.round((current / total) * 100)).padStart(3);
      process.stdout.write(`\r   [${String(current).padStart(2)}/${total}] ${pct}%  ${name.slice(0, 50).padEnd(50)}`);
    },
  );

  if (currentStep > 0) process.stdout.write('\n\n');

  if (detailed.length === 0) {
    console.log('⚠   No se encontraron resultados.\n');
    process.exit(0);
  }

  // Detección de duplicados (nombre + place_id via _core.js)
  console.log('🔎  Verificando duplicados en la base de datos...\n');
  for (const p of detailed) {
    p.isDuplicate = await checkDuplicate(p.name, p.place_id, supabase);
    await sleep(RATE_MS);
  }

  const newOnes = detailed.filter((p) => !p.isDuplicate);
  const dups    = detailed.filter((p) =>  p.isDuplicate);

  console.log(`✅  ${newOnes.length} nuevos  │  ⚠  ${dups.length} posibles duplicados\n`);
  printTable(detailed);

  if (newOnes.length === 0) {
    console.log('\n⚠   Todos ya existen en la base de datos. Nada que importar.\n');
    process.exit(0);
  }

  // Selección interactiva
  const answer = await ask(
    `\n¿Importar? [Enter = todos los ${newOnes.length} nuevos | n = cancelar | 1,3,5 = índices]: `,
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

  const r2 = buildR2();
  if (!r2) console.log('\n⚠   Sin credenciales R2 — las fotos no se subirán\n');

  const statusLabel = publish ? 'publicado' : 'pendiente de revisión';
  console.log(`\n📥  Importando ${toImport.length} negocios (estado: ${statusLabel})...\n`);

  let ok = 0, fail = 0;

  for (const place of toImport) {
    process.stdout.write(`   → ${place.name.slice(0, 52).padEnd(52)}`);
    try {
      // importPlace viene de _core.js — misma lógica que usa el panel web
      await importPlace(place, tipo, { publish, apiKey: GOOGLE_API_KEY, r2 }, supabase);
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
