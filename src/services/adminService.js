import { supabase } from '../lib/supabase';

const BUSINESS_COLUMNS = new Set([
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

function withoutBusinessOnlyFields(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => (
      BUSINESS_COLUMNS.has(key) && value !== undefined
    ))
  );
}

// ── Businesses ──────────────────────────────────────────────
export const adminBusinessService = {
  async getAll({ search = '', category = '', status = '' } = {}) {
    let query = supabase?.from('businesses')?.select('*, owner:user_profiles!businesses_owner_id_fkey(full_name, email)')?.order('created_at', { ascending: false });
    if (search) query = query?.ilike('name', `%${search}%`);
    if (category) query = query?.eq('category_key', category);
    if (status === 'featured') query = query?.eq('featured', true);
    else if (status === 'verified') query = query?.eq('verified', true);
    else if (status && ['pending', 'published', 'premium', 'rejected']?.includes(status)) query = query?.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create(payload) {
    const safePayload = { ...withoutBusinessOnlyFields(payload), claimed: payload.claimed ?? false };
    const { data, error } = await supabase?.from('businesses')?.insert(safePayload)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase?.from('businesses')?.update({ ...withoutBusinessOnlyFields(payload), updated_at: new Date()?.toISOString() })?.eq('id', id)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase?.from('businesses')?.delete()?.eq('id', id);
    if (error) throw error;
  },

  async getIncompleteBusinesses() {
    const { data, error } = await supabase
      ?.from('businesses')
      ?.select('*')
      ?.eq('status', 'pending')
      ?.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

// ── Categories ──────────────────────────────────────────────
export const adminCategoryService = {
  async getAll() {
    const { data, error } = await supabase
      ?.from('categories')
      ?.select('*')
      ?.order('sort_order', { ascending: true })
      ?.order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(payload) {
    const { data, error } = await supabase?.from('categories')?.insert(payload)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase?.from('categories')?.update(payload)?.eq('id', id)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase?.from('categories')?.delete()?.eq('id', id);
    if (error) throw error;
  },
};

// ── Claim Requests ──────────────────────────────────────────
export const adminClaimService = {
  async getAll(status = '') {
    // business_claims has two FKs into user_profiles (user_id, reviewed_by), so both
    // embeds must name their constraint explicitly or PostgREST can't disambiguate.
    let query = supabase?.from('business_claims')?.select('*, business:businesses(name, category, address), requester:user_profiles!business_claims_user_id_fkey(full_name, email), reviewer:user_profiles!business_claims_reviewed_by_fkey(full_name, email)')?.order('created_at', { ascending: false });
    if (status) query = query?.eq('claim_status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Ownership transfer never happens via a raw UPDATE from the client: both
  // paths call a SECURITY DEFINER RPC that re-checks is_admin() server-side
  // and applies the claim + business changes atomically.
  async updateStatus(id, status, adminNotes = null) {
    const fn = status === 'approved' ? 'approve_business_claim' : 'reject_business_claim';
    const { data, error } = await supabase?.rpc(fn, { p_claim_id: id, p_admin_notes: adminNotes || null });
    if (error) throw error;
    return data;
  },
};

// ── Classified Ads ──────────────────────────────────────────
export const adminAdService = {
  async getAll({ search = '', status = '' } = {}) {
    let query = supabase?.from('classified_ads')?.select('*, owner:user_profiles(full_name, email), ad_images(storage_path, alt_text, is_primary)')?.order('created_at', { ascending: false });
    if (search) query = query?.ilike('title', `%${search}%`);
    if (status) query = query?.eq('ad_status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async update(id, payload) {
    const { data, error } = await supabase?.from('classified_ads')?.update({ ...payload, updated_at: new Date()?.toISOString() })?.eq('id', id)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase?.from('classified_ads')?.delete()?.eq('id', id);
    if (error) throw error;
  },
};

// ── Featured Listings ───────────────────────────────────────
export const adminFeaturedService = {
  async getAll() {
    const { data, error } = await supabase?.from('featured_listings')?.select('*')?.order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(payload) {
    const { data, error } = await supabase?.from('featured_listings')?.insert(payload)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase?.from('featured_listings')?.update(payload)?.eq('id', id)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase?.from('featured_listings')?.delete()?.eq('id', id);
    if (error) throw error;
  },
};

// ── Banners ─────────────────────────────────────────────────
export const adminBannerService = {
  async getAll() {
    const { data, error } = await supabase?.from('banners')?.select('*')?.order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(payload) {
    const { data, error } = await supabase?.from('banners')?.insert(payload)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase?.from('banners')?.update({ ...payload, updated_at: new Date()?.toISOString() })?.eq('id', id)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase?.from('banners')?.delete()?.eq('id', id);
    if (error) throw error;
  },

  /** Sube una imagen a R2 (banners) y devuelve la URL pública. */
  async uploadImage(file) {
    const { uploadFile } = await import('./uploadService');
    const { url } = await uploadFile(file, { entityType: 'banner', entityId: null });
    return url;
  },
};

// ── Popups ──────────────────────────────────────────────────
export const adminPopupService = {
  async getAll() {
    const { data, error } = await supabase?.from('popups')?.select('*')?.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(payload) {
    const { data, error } = await supabase?.from('popups')?.insert(payload)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase?.from('popups')?.update({ ...payload, updated_at: new Date()?.toISOString() })?.eq('id', id)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase?.from('popups')?.delete()?.eq('id', id);
    if (error) throw error;
  },
};
