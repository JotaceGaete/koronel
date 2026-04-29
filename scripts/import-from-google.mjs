/**
 * Importación de negocios desde Google Places API a Supabase.
 *
 * Uso:
 *   node scripts/import-from-google.mjs [opciones]
 *
 * Opciones:
 *   --category <key>     Importar solo una categoría del portal (ej: restaurantes)
 *   --query <texto>      Búsqueda personalizada (ej: "farmacias Coronel Chile")
 *   --limit <n>          Máximo de negocios por búsqueda (default: 20)
 *   --dry-run            Mostrar resultados sin insertar en la base de datos
 *   --status <estado>    Estado al importar: pending | published (default: pending)
 *
 * Variables de entorno requeridas (archivo .env o .env.local):
 *   GOOGLE_PLACES_API_KEY   Clave de Google Places API (New)
 *   SUPABASE_URL            URL del proyecto Supabase
 *   SUPABASE_SERVICE_KEY    Service role key de Supabase (tiene acceso completo)
 *
 * Ejemplo:
 *   node scripts/import-from-google.mjs --category restaurantes --limit 20 --dry-run
 *   node scripts/import-from-google.mjs --category salud --status published
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Cargar .env manualmente (sin dependencias externas) ──────────────────────
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const path = resolve(ROOT, file);
    if (existsSync(path)) {
      const lines = readFileSync(path, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
      break;
    }
  }
}
loadEnv();

// ─── Mapeo: tipos de Google Places → category_key del portal ─────────────────
const GOOGLE_TYPE_TO_CATEGORY = {
  // Restaurantes
  restaurant: 'restaurantes',
  food: 'restaurantes',
  cafe: 'restaurantes',
  bakery: 'restaurantes',
  bar: 'restaurantes',
  meal_takeaway: 'restaurantes',
  meal_delivery: 'restaurantes',
  fast_food_restaurant: 'restaurantes',
  // Salud
  hospital: 'salud',
  doctor: 'salud',
  pharmacy: 'salud',
  dentist: 'salud',
  health: 'salud',
  medical_lab: 'salud',
  physiotherapist: 'salud',
  veterinary_care: 'salud',
  // Educación
  school: 'educacion',
  university: 'educacion',
  library: 'educacion',
  primary_school: 'educacion',
  secondary_school: 'educacion',
  // Automotriz
  car_dealer: 'automotriz',
  car_repair: 'automotriz',
  car_wash: 'automotriz',
  gas_station: 'automotriz',
  parking: 'automotriz',
  // Ferreterías
  hardware_store: 'ferreterias',
  // Supermercados
  supermarket: 'supermercados',
  grocery_store: 'supermercados',
  convenience_store: 'supermercados',
  // Belleza
  beauty_salon: 'belleza',
  hair_care: 'belleza',
  spa: 'belleza',
  nail_salon: 'belleza',
  // Tecnología
  electronics_store: 'tecnologia-negocio',
  computer_store: 'tecnologia-negocio',
  // Iglesias
  church: 'iglesias-templos',
  place_of_worship: 'iglesias-templos',
  // Servicios
  plumber: 'servicios-negocio',
  electrician: 'servicios-negocio',
  general_contractor: 'servicios-negocio',
  locksmith: 'servicios-negocio',
  lawyer: 'servicios-negocio',
  accounting: 'servicios-negocio',
  insurance_agency: 'servicios-negocio',
  real_estate_agency: 'servicios-negocio',
};

// Búsquedas predefinidas por categoría del portal
const CATEGORY_SEARCHES = {
  restaurantes: ['restaurantes Coronel Chile', 'cafeterías Coronel Chile', 'comida rápida Coronel Chile'],
  salud: ['clínicas Coronel Chile', 'farmacias Coronel Chile', 'médicos Coronel Chile'],
  educacion: ['colegios Coronel Chile', 'institutos Coronel Chile'],
  automotriz: ['talleres mecánicos Coronel Chile', 'lubricentros Coronel Chile', 'bencineras Coronel Chile'],
  ferreterias: ['ferreterías Coronel Chile'],
  supermercados: ['supermercados Coronel Chile', 'minimarkets Coronel Chile'],
  belleza: ['peluquerías Coronel Chile', 'salones de belleza Coronel Chile'],
  'tecnologia-negocio': ['computadoras Coronel Chile', 'electrónica Coronel Chile'],
  'iglesias-templos': ['iglesias Coronel Chile', 'templos Coronel Chile'],
  'servicios-negocio': ['servicios profesionales Coronel Chile', 'abogados Coronel Chile'],
};

// ─── Google Places API (New) ──────────────────────────────────────────────────
const PLACES_BASE = 'https://places.googleapis.com/v1';

async function searchPlaces(query, apiKey, pageToken = null) {
  const body = {
    textQuery: query,
    maxResultCount: 20,
    languageCode: 'es',
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.rating',
        'places.userRatingCount',
        'places.location',
        'places.regularOpeningHours',
        'places.types',
        'places.primaryType',
        'nextPageToken',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Places API error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── Mapeo de datos Google → esquema Supabase ─────────────────────────────────
function mapPlaceToRow(place, defaultCategoryKey) {
  const types = place.types || [];
  const categoryKey =
    defaultCategoryKey ||
    types.map((t) => GOOGLE_TYPE_TO_CATEGORY[t]).find(Boolean) ||
    'servicios-negocio';

  // Mapear opening_hours a formato JSONB del portal
  let openingHours = null;
  if (place.regularOpeningHours?.weekdayDescriptions) {
    openingHours = {
      weekday_text: place.regularOpeningHours.weekdayDescriptions,
      open_now: place.regularOpeningHours.openNow ?? null,
    };
  }

  return {
    name: place.displayName?.text || '',
    category: categoryKey,
    category_key: categoryKey,
    address: place.formattedAddress || '',
    phone: place.nationalPhoneNumber || null,
    website: place.websiteUri || null,
    rating: place.rating ? parseFloat(place.rating.toFixed(1)) : 0,
    review_count: place.userRatingCount || 0,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    opening_hours: openingHours,
    is_open: true,
    featured: false,
    verified: false,
    status: 'pending',
    google_place_id: place.id,
  };
}

// ─── Deduplicación: verificar si el negocio ya existe ────────────────────────
async function fetchExistingPlaceIds(supabase) {
  const { data } = await supabase
    .from('businesses')
    .select('google_place_id')
    .not('google_place_id', 'is', null);
  return new Set((data || []).map((r) => r.google_place_id));
}

async function fetchExistingNames(supabase) {
  const { data } = await supabase.from('businesses').select('name, address');
  return new Set((data || []).map((r) => `${r.name?.toLowerCase()}||${r.address?.toLowerCase()}`));
}

// ─── CLI args ─────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { category: null, query: null, limit: 20, dryRun: false, status: 'pending' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category') opts.category = args[++i];
    else if (args[i] === '--query') opts.query = args[++i];
    else if (args[i] === '--limit') opts.limit = parseInt(args[++i], 10);
    else if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--status') opts.status = args[++i];
  }
  return opts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!apiKey) {
    console.error('❌  Falta GOOGLE_PLACES_API_KEY en tu archivo .env o .env.local');
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌  Faltan SUPABASE_URL y/o SUPABASE_SERVICE_KEY en tu archivo .env o .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Construir lista de búsquedas a ejecutar
  let searches = [];
  if (opts.query) {
    searches = [{ query: opts.query, categoryKey: opts.category }];
  } else if (opts.category) {
    const queries = CATEGORY_SEARCHES[opts.category];
    if (!queries) {
      const valid = Object.keys(CATEGORY_SEARCHES).join(', ');
      console.error(`❌  Categoría desconocida. Válidas: ${valid}`);
      process.exit(1);
    }
    searches = queries.map((q) => ({ query: q, categoryKey: opts.category }));
  } else {
    // Sin filtro → importar todas las categorías
    for (const [key, queries] of Object.entries(CATEGORY_SEARCHES)) {
      for (const q of queries) searches.push({ query: q, categoryKey: key });
    }
  }

  console.log(`\n🗺️  Importador de negocios desde Google Maps`);
  console.log(`   Modo: ${opts.dryRun ? '🔍 DRY RUN (sin escribir en BD)' : '✅ INSERCIÓN REAL'}`);
  console.log(`   Estado al importar: ${opts.status}`);
  console.log(`   Búsquedas a ejecutar: ${searches.length}\n`);

  // Cargar IDs y nombres existentes para deduplicar
  const existingPlaceIds = await fetchExistingPlaceIds(supabase);
  const existingNameAddr = await fetchExistingNames(supabase);
  console.log(`   Negocios ya existentes en BD: ${existingNameAddr.size}\n`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const { query, categoryKey } of searches) {
    console.log(`🔎  Buscando: "${query}"`);

    let data;
    try {
      data = await searchPlaces(query, apiKey);
    } catch (err) {
      console.error(`   ⚠️  Error al consultar API: ${err.message}`);
      continue;
    }

    const places = (data.places || []).slice(0, opts.limit);
    console.log(`   → ${places.length} resultados encontrados`);

    const toInsert = [];

    for (const place of places) {
      const row = mapPlaceToRow(place, categoryKey);
      row.status = opts.status;

      // Deduplicar por google_place_id
      if (place.id && existingPlaceIds.has(place.id)) {
        console.log(`   ⏭️  Ya existe (place_id): ${row.name}`);
        totalSkipped++;
        continue;
      }

      // Deduplicar por nombre + dirección
      const key = `${row.name?.toLowerCase()}||${row.address?.toLowerCase()}`;
      if (existingNameAddr.has(key)) {
        console.log(`   ⏭️  Ya existe (nombre+dir): ${row.name}`);
        totalSkipped++;
        continue;
      }

      toInsert.push(row);
      existingNameAddr.add(key);
      if (place.id) existingPlaceIds.add(place.id);
    }

    if (toInsert.length === 0) {
      console.log('   Sin negocios nuevos para esta búsqueda.\n');
      continue;
    }

    if (opts.dryRun) {
      console.log(`   📋  Se insertarían ${toInsert.length} negocios:`);
      for (const b of toInsert) {
        console.log(`      • ${b.name} | ${b.address} | ${b.category_key}`);
      }
      totalInserted += toInsert.length;
    } else {
      const { error } = await supabase.from('businesses').insert(toInsert);
      if (error) {
        console.error(`   ❌  Error al insertar: ${error.message}`);
      } else {
        console.log(`   ✅  ${toInsert.length} negocios insertados`);
        totalInserted += toInsert.length;
      }
    }
    console.log();
  }

  console.log('─'.repeat(50));
  console.log(`Resumen:`);
  console.log(`  ${opts.dryRun ? 'Para insertar' : 'Insertados'}: ${totalInserted}`);
  console.log(`  Omitidos (duplicados): ${totalSkipped}`);
  if (opts.dryRun) {
    console.log('\n💡 Ejecuta sin --dry-run para insertar los negocios.');
  }
}

main().catch((err) => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
