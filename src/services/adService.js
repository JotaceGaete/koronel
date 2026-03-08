import { supabase } from '../lib/supabase';
import { uploadFile } from './uploadService';

const R2_PUBLIC = import.meta.env?.VITE_R2_PUBLIC_URL || 'https://multimedia.koronel.cl';

// Helper: generate a simple verification token
function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))?.map(b => b?.toString(16)?.padStart(2, '0'))?.join('');
}

export const adService = {
  async getAdCategories() {
    try {
      const { data, error } = await supabase?.from('categories')?.select('id, name, name_key')?.order('name', { ascending: true });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('adService.getAdCategories error:', error);
      return { data: [], error };
    }
  },

  async getAll({ category, search, priceRange, dateFilter, condition, sort = 'newest', page = 1, pageSize = 12 } = {}) {
    try {
      let query = supabase?.from('classified_ads')?.select('*, ad_images(storage_path, alt_text, is_primary)', { count: 'exact' })?.eq('ad_status', 'active');

      if (category && category !== 'all') {
        query = query?.eq('category_key', category);
      }
      if (search?.trim()) {
        query = query?.ilike('title', `%${search}%`);
      }
      if (condition && condition !== 'all') {
        query = query?.eq('condition', condition);
      }
      if (priceRange && priceRange !== 'all') {
        if (priceRange === '500000+') {
          query = query?.gte('price', 500000);
        } else {
          const [min, max] = priceRange?.split('-')?.map(Number);
          if (!isNaN(min)) query = query?.gte('price', min);
          if (!isNaN(max)) query = query?.lte('price', max);
        }
      }
      if (dateFilter && dateFilter !== 'all') {
        const now = new Date();
        if (dateFilter === 'today') {
          const yesterday = new Date(now - 86400000)?.toISOString();
          query = query?.gte('created_at', yesterday);
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now - 604800000)?.toISOString();
          query = query?.gte('created_at', weekAgo);
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now - 2592000000)?.toISOString();
          query = query?.gte('created_at', monthAgo);
        }
      }

      if (sort === 'price_asc') {
        query = query?.order('price', { ascending: true, nullsFirst: false });
      } else if (sort === 'price_desc') {
        query = query?.order('price', { ascending: false, nullsFirst: false });
      } else {
        query = query?.order('featured', { ascending: false })?.order('created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query?.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      console.error('adService.getAll error:', error);
      return { data: [], count: 0, error };
    }
  },

  async getRecent(limit = 6) {
    try {
      const { data, error } = await supabase?.from('classified_ads')?.select('*, ad_images(storage_path, alt_text, is_primary)')?.eq('ad_status', 'active')?.order('created_at', { ascending: false })?.limit(limit);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getByCategory(categoryKey, excludeId, limit = 4) {
    try {
      let query = supabase
        ?.from('classified_ads')
        ?.select('*, ad_images(storage_path, alt_text, is_primary)')
        ?.eq('ad_status', 'active')
        ?.order('created_at', { ascending: false })
        ?.limit(limit);
      if (categoryKey) {
        query = query?.eq('category_key', categoryKey);
      }
      if (excludeId) {
        query = query?.neq('id', excludeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getById(id) {
    try {
      const { data, error } = await supabase
        ?.from('classified_ads')
        ?.select('*, ad_images(storage_path, alt_text, is_primary, sort_order)')
        ?.eq('id', id)
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('adService.getById error:', error);
      return { data: null, error };
    }
  },

  async incrementViews(id) {
    try {
      const { error } = await supabase?.rpc('increment_ad_views', { ad_id: id });
      if (error) {
        // Fallback: manual increment if RPC doesn't exist
        const { data: current } = await supabase
          ?.from('classified_ads')
          ?.select('views')
          ?.eq('id', id)
          ?.single();
        await supabase
          ?.from('classified_ads')
          ?.update({ views: (current?.views || 0) + 1 })
          ?.eq('id', id);
      }
    } catch (e) {
      // Silent fail — view count is non-critical
    }
  },

  async getByUser(userId) {
    try {
      const { data, error } = await supabase?.from('classified_ads')?.select('*, ad_images(storage_path, alt_text, is_primary)')?.eq('user_id', userId)?.order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Check if identifier has exceeded daily post limit
  // p_user_id is passed for authenticated users so the DB can check premium/claimed status
  async checkDailyLimit(identifier, identifierType, userId = null) {
    try {
      const { data, error } = await supabase?.rpc('check_daily_post_limit', {
        p_identifier: identifier,
        p_identifier_type: identifierType,
        p_user_id: userId || null,
      });
      if (error) return true; // allow on error
      return data === true;
    } catch {
      return true;
    }
  },

  // Check 60-second cooldown per IP to prevent bot flooding
  async checkCooldown(ipAddress) {
    try {
      const { data, error } = await supabase?.rpc('check_post_cooldown', {
        p_ip: ipAddress,
      });
      if (error) return true; // allow on error
      return data === true;
    } catch {
      return true;
    }
  },

  async incrementDailyCount(identifier, identifierType) {
    try {
      await supabase?.rpc('increment_daily_post_count', {
        p_identifier: identifier,
        p_identifier_type: identifierType,
      });
    } catch {
      // silent
    }
  },

  // Create ad — supports both authenticated and guest users
  async create({ userId, formData, photoPaths, guestInfo, ipAddress }) {
    try {
      const expiresAt = new Date();
      expiresAt?.setDate(expiresAt?.getDate() + parseInt(formData?.duration || 30));

      const rawPrice = formData?.price
        ? parseInt(String(formData?.price)?.replace(/\D/g, ''), 10)
        : null;

      const isGuest = !userId;
      const verificationToken = isGuest ? generateToken() : null;

      const payload = {
        user_id: userId || null,
        title: formData?.title,
        description: formData?.description,
        category: formData?.categoryName || formData?.category,
        category_key: formData?.categoryKey || formData?.category?.toLowerCase()?.replace(/\s+/g, '-'),
        price: rawPrice,
        price_negotiable: formData?.priceNegotiable || false,
        condition: formData?.condition || null,
        phone: formData?.phone,
        whatsapp: formData?.whatsapp || false,
        location: formData?.location || 'Coronel',
        duration_days: parseInt(formData?.duration || 30),
        expires_at: expiresAt?.toISOString(),
        ad_status: isGuest ? 'pending' : 'active',
        ip_address: ipAddress || null,
        guest_email: isGuest ? guestInfo?.email : null,
        verification_token: verificationToken,
      };

      const { data: ad, error: adError } = await supabase?.from('classified_ads')?.insert(payload)?.select()?.single();

      if (adError) throw adError;

      if (photoPaths?.length > 0) {
        const imageInserts = photoPaths?.map((path, index) => ({
          ad_id: ad?.id,
          storage_path: path,
          is_primary: index === 0,
          sort_order: index
        }));
        const { error: imagesError } = await supabase?.from('ad_images')?.insert(imageInserts)?.select();
        if (imagesError) throw imagesError;
      }

      return { data: ad, error: null, verificationToken, isGuest };
    } catch (error) {
      return { data: null, error, verificationToken: null, isGuest: false };
    }
  },

  // Verify ad by token (called from email link)
  async verifyAdByToken(token) {
    try {
      const { data, error } = await supabase?.rpc('verify_ad_by_token', { p_token: token });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Admin: approve a pending ad
  async approveAd(adId) {
    try {
      const { data, error } = await supabase
        ?.from('classified_ads')
        ?.update({ ad_status: 'active', verified_at: new Date()?.toISOString(), verification_token: null, updated_at: new Date()?.toISOString() })
        ?.eq('id', adId)
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteAd(adId, userId) {
    try {
      const { error } = await supabase?.from('classified_ads')?.update({ ad_status: 'deleted' })?.eq('id', adId)?.eq('user_id', userId);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async uploadPhoto(file, userId) {
    try {
      const { url, path: storageKey, error: uploadError } = await uploadFile(file, {
        entityType: 'ad_image',
        entityId: null,
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
    return `${R2_PUBLIC}/${storagePath}`;
  },

  formatAd(ad) {
    const primaryImage = ad?.ad_images?.find(img => img?.is_primary) || ad?.ad_images?.[0];
    const imageUrl = primaryImage?.storage_path
      ? (primaryImage?.storage_path?.startsWith('http') ? primaryImage?.storage_path : `${R2_PUBLIC}/${primaryImage?.storage_path}`)
      : null;
    const now = Date.now();
    const createdAt = new Date(ad?.created_at);
    const diffMs = now - createdAt?.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    const timeAgo = diffH < 1 ? 'Hace menos de 1 hora' : diffH < 24 ? `Hace ${diffH} hora${diffH > 1 ? 's' : ''}` : diffD < 7 ? `Hace ${diffD} día${diffD > 1 ? 's' : ''}` : `Hace ${Math.floor(diffD / 7)} semana${Math.floor(diffD / 7) > 1 ? 's' : ''}`;
    return {
      ...ad,
      image: imageUrl,
      imageAlt: primaryImage?.alt_text || ad?.title,
      timeAgo,
      datePosted: createdAt
    };
  }
};
