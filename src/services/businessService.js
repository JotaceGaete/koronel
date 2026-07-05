import { supabase } from '../lib/supabase';
import { uploadFile } from './uploadService';
import { getActiveCityConfig } from '../config/city';
import {
  FALLBACK_BUSINESS_CATEGORY_TREE,
  filterMapItems,
  flattenBusinessCategoryTree,
  normalizeBusinessFilterText,
} from '../utils/businessCategoryFilter';

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

function sanitizeBusinessPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => (
      BUSINESS_COLUMNS.has(key) && value !== undefined
    ))
  );
}

export const businessService = {
  async getAll({ category, search, rating, openNow, sort = 'relevance', page = 1, pageSize = 12 } = {}) {
    try {
      // Check premium expiry before fetching
      await businessService?.checkPremiumExpiry();

      let query = supabase
        ?.from('businesses')
        ?.select('*, business_images(storage_path, alt_text, is_primary)')
        ?.in('status', ['published', 'premium']);

      if (rating && rating !== 'all') {
        query = query?.gte('rating', parseFloat(rating));
      }
      if (openNow) {
        query = query?.eq('is_open', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      const { items: filtered } = filterMapItems(data || [], {
        activeType: 'business',
        activeCategory: category,
        searchTerm: search,
      });

      const sorted = [...filtered]?.sort((a, b) => {
        if (sort === 'rating') return (b?.rating || 0) - (a?.rating || 0);
        if (sort === 'newest') return new Date(b?.created_at || 0) - new Date(a?.created_at || 0);
        if ((b?.featured ? 1 : 0) !== (a?.featured ? 1 : 0)) return (b?.featured ? 1 : 0) - (a?.featured ? 1 : 0);
        return (b?.rating || 0) - (a?.rating || 0);
      });

      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      return { data: sorted?.slice(from, to), count: sorted?.length || 0, error: null };
    } catch (error) {
      console.error('businessService.getAll error:', error);
      return { data: [], count: 0, error };
    }
  },

  async getById(id) {
    try {
      const { data, error } = await supabase
        ?.from('businesses')
        ?.select(`
          *,
          business_images(storage_path, alt_text, is_primary, sort_order),
          category:categories(id, name, name_key, parent_id)
        `)
        ?.eq('id', id)
        ?.single();
      if (error) throw error;
      if (data?.category?.parent_id) {
        const { data: parent } = await supabase
          ?.from('categories')
          ?.select('id, name')
          ?.eq('id', data.category.parent_id)
          ?.single();
        if (parent) data.category.parent = parent;
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getFeatured(limit = 6) {
    try {
      const { data, error } = await supabase?.from('businesses')?.select('*, business_images(storage_path, alt_text, is_primary)')?.eq('featured', true)?.in('status', ['published', 'premium'])?.order('rating', { ascending: false })?.limit(limit);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getByOwner(userId) {
    try {
      const { data, error } = await supabase?.from('businesses')?.select('*, business_images(storage_path, alt_text, is_primary, sort_order)')?.eq('owner_id', userId)?.order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async create(payload) {
    try {
      const safePayload = { ...sanitizeBusinessPayload(payload), claimed: payload.claimed ?? false };
      const { data, error } = await supabase?.from('businesses')?.insert(safePayload)?.select()?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async update(id, payload) {
    try {
      const { data, error } = await supabase?.from('businesses')?.update({ ...sanitizeBusinessPayload(payload), updated_at: new Date()?.toISOString() })?.eq('id', id)?.select()?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getCategories() {
    try {
      const { data, error } = await supabase
        ?.from('categories')
        ?.select('id, name, name_key')
        ?.eq('category_type', 'business')
        ?.order('name', { ascending: true });
      if (error) throw error;
      return { data: data?.length ? data : flattenBusinessCategoryTree(), error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getHierarchicalCategories() {
    try {
      const { data, error } = await supabase
        ?.from('categories')
        ?.select('id, name, name_key, icon, color, parent_id, sort_order, is_active')
        ?.eq('is_active', true)
        ?.eq('category_type', 'business')
        ?.order('sort_order', { ascending: true });
      if (error) throw error;
      const all = data || [];
      if (all?.length === 0) {
        return {
          data: FALLBACK_BUSINESS_CATEGORY_TREE,
          flat: flattenBusinessCategoryTree(),
          error: null,
        };
      }
      const parents = all?.filter(c => !c?.parent_id);
      const children = all?.filter(c => !!c?.parent_id);
      const tree = parents?.map(p => ({
        ...p,
        subcategories: children
          ?.filter(c => c?.parent_id === p?.id)
          ?.sort((a, b) => (a?.sort_order || 0) - (b?.sort_order || 0)),
      }));
      return { data: tree, flat: all, error: null };
    } catch (error) {
      return { data: [], flat: [], error };
    }
  },

  async checkPremiumExpiry() {
    try {
      await supabase?.rpc('check_premium_expiry');
    } catch (e) {
      // Non-critical, ignore errors
    }
  },

  async addImage({ businessId, storagePath, altText, isPrimary = false, sortOrder = 0 }) {
    try {
      const { data, error } = await supabase?.from('business_images')?.insert({
        business_id: businessId,
        storage_path: storagePath,
        alt_text: altText,
        is_primary: isPrimary,
        sort_order: sortOrder,
      })?.select()?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteImage(imageId) {
    try {
      const { error } = await supabase?.from('business_images')?.delete()?.eq('id', imageId);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async updateImage(imageId, { sort_order, is_primary }) {
    try {
      const { data, error } = await supabase
        ?.from('business_images')
        ?.update({ sort_order, is_primary })
        ?.eq('id', imageId)
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async uploadImage(file, businessId) {
    try {
      const { url, path: storageKey, error: uploadError } = await uploadFile(file, {
        entityType: 'business_image',
        entityId: businessId,
      });
      if (uploadError) throw uploadError;
      return { path: storageKey, publicUrl: url, error: null };
    } catch (error) {
      return { path: null, publicUrl: null, error };
    }
  },

  async uploadLogo(file, businessId) {
    try {
      const { url, path: storageKey, error: uploadError } = await uploadFile(file, {
        entityType: 'business_logo',
        entityId: businessId,
      });
      if (uploadError) throw uploadError;
      return { path: storageKey, publicUrl: url, error: null };
    } catch (error) {
      return { path: null, publicUrl: null, error };
    }
  },

  getImageUrl(storagePath) {
    if (!storagePath) return null;
    if (storagePath?.startsWith('http')) return storagePath;
    return `${getActiveCityConfig().mediaBaseUrl}/${storagePath}`;
  },

  /** Búsqueda para sugerencias: negocios por nombre/dirección y categorías por nombre/key. */
  async searchSuggestions(query, limit = 8) {
    const q = String(query || '').trim();
    if (!q || q.length < 2) return { businesses: [], categories: [], error: null };
    const safe = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const pattern = `%${safe}%`;
    try {
      await businessService?.checkPremiumExpiry();
      const [businessRes, categoryRes] = await Promise.all([
        supabase
          ?.from('businesses')
          ?.select('id, name, address, category_key, business_images(storage_path, alt_text, is_primary)')
          ?.in('status', ['published', 'premium'])
          ?.or(`name.ilike.${pattern},address.ilike.${pattern}`)
          ?.limit(limit),
        supabase
          ?.from('categories')
          ?.select('id, name, name_key, icon')
          ?.eq('is_active', true)
          ?.eq('category_type', 'business')
          ?.or(`name.ilike.${pattern},name_key.ilike.${pattern}`)
          ?.limit(5),
      ]);
      const businesses = (businessRes?.data || []).map((b) => {
        const img = b?.business_images?.find((i) => i?.is_primary) || b?.business_images?.[0];
        const image = img?.storage_path
          ? (img?.storage_path?.startsWith('http') ? img?.storage_path : businessService?.getImageUrl(img?.storage_path))
          : null;
        return { id: b?.id, name: b?.name, address: b?.address, category_key: b?.category_key, image };
      });
      const normalizedQuery = normalizeBusinessFilterText(q);
      const categories = categoryRes?.data?.length
        ? categoryRes?.data
        : flattenBusinessCategoryTree()
          ?.filter(c => normalizeBusinessFilterText(`${c?.name} ${c?.name_key}`)?.includes(normalizedQuery))
          ?.slice(0, 5);
      return { businesses, categories, error: businessRes?.error || categoryRes?.error };
    } catch (err) {
      console.error('businessService.searchSuggestions error:', err);
      return { businesses: [], categories: [], error: err };
    }
  },

  async getMyClaimRequests(userId) {
    try {
      const { data, error } = await supabase
        ?.from('business_claims')
        ?.select('id, business_id, claim_status, created_at, business:businesses(id, name, category, address)')
        ?.eq('user_id', userId)
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async submitClaim({ businessId, userId, name, email, phone, role }) {
    try {
      const { data, error } = await supabase?.from('business_claims')?.insert({ business_id: businessId, user_id: userId, claimant_name: name, claimant_email: email, claimant_phone: phone, claimant_role: role })?.select()?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getReviews(businessId) {
    try {
      const { data, error } = await supabase
        ?.from('business_reviews')
        ?.select('*, user_profiles(id, full_name, avatar_url)')
        ?.eq('business_id', businessId)
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async checkDailyReviewLimit(userId) {
    try {
      const { data, error } = await supabase?.rpc('check_daily_review_limit', { p_user_id: userId });
      if (error) throw error;
      return { allowed: data === true, error: null };
    } catch (error) {
      return { allowed: false, error };
    }
  },

  async submitReview({ businessId, userId, rating, comment }) {
    try {
      const { data, error } = await supabase
        ?.from('business_reviews')
        ?.insert({ business_id: businessId, user_id: userId, rating, comment })
        ?.select('*, user_profiles(id, full_name, avatar_url)')
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateReview(reviewId, { rating, comment }) {
    try {
      const { data, error } = await supabase
        ?.from('business_reviews')
        ?.update({ rating, comment })
        ?.eq('id', reviewId)
        ?.select('*, user_profiles(id, full_name, avatar_url)')
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteReview(reviewId) {
    try {
      const { error } = await supabase?.from('business_reviews')?.delete()?.eq('id', reviewId);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async submitOwnerReply(reviewId, ownerReply) {
    try {
      const { data, error } = await supabase
        ?.from('business_reviews')
        ?.update({ owner_reply: ownerReply, owner_replied_at: new Date()?.toISOString() })
        ?.eq('id', reviewId)
        ?.select('*, user_profiles(id, full_name, avatar_url)')
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
