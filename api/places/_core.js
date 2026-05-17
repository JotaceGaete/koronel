const { createClient } = require('@supabase/supabase-js');

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY
  || process.env.GOOGLE_MAPS_API_KEY
  || process.env.VITE_GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUSINESS_INSERT_COLUMNS = new Set([
  'owner_id',
  'name',
  'category',
  'category_key',
  'description',
  'address',
  'phone',
  'email',
  'website',
  'rating',
  'review_count',
  'is_open',
  'featured',
  'verified',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'opening_hours',
  'profile_visits',
  'contacts_count',
  'status',
  'premium_until',
  'rejection_reason',
  'whatsapp',
  'redes_sociales',
  'logo_url',
  'social_links',
  'category_id',
  'claimed',
  'google_place_id',
]);

function sanitizeBusinessPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload || {}).filter(([key, value]) => (
      BUSINESS_INSERT_COLUMNS.has(key) && value !== undefined
    ))
  );
}

function requireEnv() {
  if (!GOOGLE_KEY) throw new Error('Missing GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY');
  if (!SUPABASE_URL || !SUPABASE_ANON) throw new Error('Missing Supabase environment variables');
}

function getSupabase(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON, token ? {
    global: { headers: { Authorization: `Bearer ${token}` } },
  } : undefined);
}

function getServiceSupabase() {
  if (!SUPABASE_SERVICE_ROLE) {
    const error = new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    error.statusCode = 503;
    throw error;
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

async function requireAdmin(req) {
  requireEnv();
  const token = getToken(req);
  if (!token) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }
  const supabase = getSupabase(token);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    const authError = new Error('Unauthorized');
    authError.statusCode = 401;
    throw authError;
  }

  const meta = user.user_metadata || {};
  const appMeta = user.app_metadata || {};
  if (meta.role === 'admin' || appMeta.role === 'admin') return { supabase, user, token };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    const forbidden = new Error('Forbidden');
    forbidden.statusCode = 403;
    throw forbidden;
  }
  return { supabase, user, token };
}

async function googleFetch(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(data.status)) {
    throw new Error(data.error_message || data.status || 'Google Places request failed');
  }
  return data;
}

function mapPlaceForClient(place, duplicate) {
  const placeId = place.place_id || place.id || null;
  return {
    id: placeId,
    place_id: placeId,
    name: place.name || '',
    formatted_address: place.formatted_address || '',
    address: place.formatted_address || '',
    rating: place.rating || null,
    phone: place.formatted_phone_number || place.international_phone_number || null,
    formatted_phone_number: place.formatted_phone_number || null,
    website: place.website || null,
    duplicate: !!duplicate,
    isDuplicate: !!duplicate,
  };
}

function mapPlaceToPayload(place) {
  const location = place.geometry?.location || {};
  const phone = place.formatted_phone_number || place.international_phone_number || null;
  return sanitizeBusinessPayload({
    name: place.name,
    category: place.types?.[0]?.replace(/_/g, ' ') || 'Sin categoria',
    phone,
    whatsapp: phone,
    website: place.website || null,
    address: place.formatted_address || null,
    lat: location.lat ?? null,
    lng: location.lng ?? null,
    latitude: location.lat ?? null,
    longitude: location.lng ?? null,
    rating: place.rating ?? null,
    review_count: place.user_ratings_total ?? 0,
    status: 'published',
    verified: false,
    featured: false,
    claimed: false,
    is_open: true,
    google_place_id: place.place_id || place.id || null,
  });
}

async function fetchPlaceDetails(placeId) {
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'geometry',
    'rating',
    'user_ratings_total',
    'types',
  ].join(',');
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', fields);
  url.searchParams.set('language', 'es');
  url.searchParams.set('key', GOOGLE_KEY);
  const data = await googleFetch(url);
  return data.result;
}

async function checkDuplicate(supabase, place) {
  const placeId = place.place_id || place.id;
  if (placeId) {
    const { data: byPlaceId, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('google_place_id', placeId)
      .limit(1);
    if (error) throw error;
    return !!byPlaceId?.length;
  }

  if (!place.name) return false;
  const safeName = place.name.replace(/%/g, '\\%').replace(/_/g, '\\_');
  let query = supabase
    .from('businesses')
    .select('id')
    .ilike('name', safeName)
    .limit(1);
  if (place.formatted_address) {
    query = query.eq('address', place.formatted_address);
  }
  const { data: byName } = await query;
  return !!byName?.length;
}

async function searchPlaces({ supabase, query, location }) {
  const textQuery = [query, location].filter(Boolean).join(' ');
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', textQuery);
  url.searchParams.set('language', 'es');
  url.searchParams.set('key', GOOGLE_KEY);
  const data = await googleFetch(url);
  const results = data.results || [];

  const detailed = await Promise.all(results.slice(0, 20).map(async (place) => {
    const details = place.place_id ? await fetchPlaceDetails(place.place_id) : place;
    const duplicate = await checkDuplicate(supabase, details || place);
    return mapPlaceForClient(details || place, duplicate);
  }));

  return detailed;
}

async function importPlace({ supabase, placeId, place }) {
  const details = placeId ? await fetchPlaceDetails(placeId) : place;
  if (!details?.name) throw new Error('Place details not found');
  if (await checkDuplicate(supabase, details)) {
    return {
      business: null,
      imported: 0,
      skippedDuplicates: 1,
      duplicate: true,
      googlePlaceId: details.place_id || details.id || placeId || null,
    };
  }

  const { data, error } = await supabase
    .from('businesses')
    .insert(mapPlaceToPayload(details))
    .select()
    .single();
  if (error?.code === '23505') {
    return {
      business: null,
      imported: 0,
      skippedDuplicates: 1,
      duplicate: true,
      googlePlaceId: details.place_id || details.id || placeId || null,
    };
  }
  if (error) throw error;
  return {
    business: data,
    imported: 1,
    skippedDuplicates: 0,
    duplicate: false,
    googlePlaceId: details.place_id || details.id || placeId || null,
  };
}

module.exports = {
  getServiceSupabase,
  requireAdmin,
  searchPlaces,
  importPlace,
};
