import { supabase } from '../lib/supabase';
import { uploadFile } from './uploadService';

export const businessService = {
  async getAll({ category, search, rating, openNow, sort = 'relevance', page = 1, pageSize = 12 } = {}) {
    try {
      // Check premium expiry before fetching
      await businessService?.checkPremiumExpiry();

      let query = supabase?.from('businesses')?.select('*, business_images(storage_path, alt_text, is_primary)', { count: 'exact' })?.in('status', ['published', 'premium']);

      if (category && category !== 'all') {
        query = query?.eq('category_key', category);
      }
      if (search?.trim()) {
        query = query?.ilike('name', `%${search}%`);
      }
      if (rating && rating !== 'all') {
        query = query?.gte('rating', parseFloat(rating));
      }
      if (openNow) {
        query = query?.eq('is_open', true);
      }

      if (sort === 'rating') {
        query = query?.order('rating', { ascending: false });
      } else if (sort === 'newest') {
        query = query?.order('created_at', { ascending: false });
      } else {
        // Premium first, then featured, then rating
        query = query?.order('featured', { ascending: false })?.order('rating', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query?.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0, error: null };
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
      const { data, error } = await supabase?.from('businesses')?.insert(payload)?.select()?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async update(id, payload) {
    try {
      const { data, error } = await supabase?.from('businesses')?.update({ ...payload, updated_at: new Date()?.toISOString() })?.eq('id', id)?.select()?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getCategories() {
    try {
      const { data, error } = await supabase?.from('categories')?.select('id, name, name_key')?.order('name', { ascending: true });
      if (error) throw error;
      return { data: data || [], error: null };
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
        ?.order('sort_order', { ascending: true });
      if (error) throw error;
      const all = data || [];
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
    return `${import.meta.env?.VITE_R2_PUBLIC_URL || 'https://multimedia.koronel.cl'}/${storagePath}`;
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
      const categories = categoryRes?.data || [];
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
