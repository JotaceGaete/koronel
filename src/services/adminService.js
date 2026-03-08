import { supabase } from '../lib/supabase';

// ── Businesses ──────────────────────────────────────────────
export const adminBusinessService = {
  async getAll({ search = '', category = '', status = '' } = {}) {
    let query = supabase?.from('businesses')?.select('*, owner:user_profiles(full_name, email)')?.order('created_at', { ascending: false });
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
    const safePayload = { ...payload, claimed: payload.claimed ?? false };
    const { data, error } = await supabase?.from('businesses')?.insert(safePayload)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase?.from('businesses')?.update({ ...payload, updated_at: new Date()?.toISOString() })?.eq('id', id)?.select()?.single();
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
      ?.eq('source', 'quick_admin')
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
    let query = supabase?.from('business_claims')?.select('*, business:businesses(name, category, address), claimant:user_profiles(full_name, email)')?.order('created_at', { ascending: false });
    if (status) query = query?.eq('claim_status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateStatus(id, status) {
    const { data: claim, error: fetchError } = await supabase?.from('business_claims')?.select('id, business_id, user_id')?.eq('id', id)?.single();
    if (fetchError || !claim) throw fetchError || new Error('Solicitud no encontrada');
    const { data, error } = await supabase?.from('business_claims')?.update({ claim_status: status })?.eq('id', id)?.select()?.single();
    if (error) throw error;
    if (status === 'approved' && claim?.business_id && claim?.user_id) {
      await supabase?.from('businesses')?.update({ owner_id: claim.user_id, claimed: true })?.eq('id', claim.business_id);
    }
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
