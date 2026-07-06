import { supabase } from '../lib/supabase';
import { uploadFile } from './uploadService';
import { getActiveCityConfig } from '../config/city';

const r2Public = () => getActiveCityConfig().mediaBaseUrl;

// Helper: generate a simple verification token
function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))?.map(b => b?.toString(16)?.padStart(2, '0'))?.join('');
}

export const adService = {
  async getAdCategories() {
    try {
      const { data, error } = await supabase
        ?.from('categories')
        ?.select('id, name, name_key')
        ?.eq('category_type', 'classified_ad')
        ?.order('name', { ascending: true });
      if (error) {
        // category_type puede no existir todavía en algún entorno que no
        // corrió 20260621000004_add_category_type_and_city.sql — en vez de
        // romper el formulario, caemos al comportamiento anterior
        // (todas las categorías, sin filtrar) en vez de mostrar error.
        if (error?.code === '42703') {
          const fallback = await supabase?.from('categories')?.select('id, name, name_key')?.order('name', { ascending: true });
          if (fallback?.error) throw fallback.error;
          return { data: fallback?.data || [], error: null };
        }
        throw error;
      }
      return { data: data || [], error: null };
    } catch (error) {
      console.error('adService.getAdCategories error:', error);
      return { data: [], error };
    }
  },

  async getAll({ listingType, category, search, priceRange, dateFilter, condition, sort = 'newest', page = 1, pageSize = 12 } = {}) {
    const buildQuery = (applyListingTypeFilter) => {
      let query = supabase?.from('classified_ads')?.select('*, ad_images(storage_path, alt_text, is_primary, image_type)', { count: 'exact' })?.eq('ad_status', 'active');

      if (applyListingTypeFilter && listingType === 'oficio') {
        query = query?.eq('listing_type', 'oficio');
      } else if (applyListingTypeFilter && listingType === 'clasificados') {
        // Contrato: Clasificados = todo aviso que no sea 'oficio'.
        query = query?.neq('listing_type', 'oficio');
      }
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
      return query?.range(from, to);
    };

    try {
      let { data, error, count } = await buildQuery(true);
      if (error?.code === '42703') {
        // listing_type puede no existir todavía en algún entorno que no
        // corrió 20260702300000_profesionales_oficios.sql — caemos al
        // comportamiento anterior (sin filtrar por tipo) en vez de romper
        // el listado.
        ({ data, error, count } = await buildQuery(false));
      }
      if (error) throw error;
      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      console.error('adService.getAll error:', error);
      return { data: [], count: 0, error };
    }
  },

  async getRecent(limit = 6) {
    try {
      // Contrato: "Reciente" del home no debe mezclar profesionales.
      let { data, error } = await supabase
        ?.from('classified_ads')
        ?.select('*, ad_images(storage_path, alt_text, is_primary, image_type)')
        ?.eq('ad_status', 'active')
        ?.neq('listing_type', 'oficio')
        ?.order('created_at', { ascending: false })
        ?.limit(limit);
      if (error?.code === '42703') {
        // listing_type puede no existir todavía en algún entorno — caemos
        // al comportamiento anterior en vez de romper el home.
        const fallback = await supabase?.from('classified_ads')?.select('*, ad_images(storage_path, alt_text, is_primary, image_type)')?.eq('ad_status', 'active')?.order('created_at', { ascending: false })?.limit(limit);
        data = fallback?.data;
        error = fallback?.error;
      }
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
        ?.select('*, ad_images(storage_path, alt_text, is_primary, image_type)')
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
        ?.select('*, ad_images(storage_path, alt_text, is_primary, image_type, sort_order)')
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
      const { data, error } = await supabase?.from('classified_ads')?.select('*, ad_images(storage_path, alt_text, is_primary, image_type)')?.eq('user_id', userId)?.order('created_at', { ascending: false });
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

  // Create ad — supports both authenticated and guest users.
  // profilePhotoPath: single path for a profesional's portrait (image_type='profile').
  // photoPaths: portfolio images (image_type='portfolio') — or regular ad photos
  //             for avisos de venta, que no usan foto de perfil separada.
  async create({ userId, formData, photoPaths, profilePhotoPath, guestInfo, ipAddress }) {
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
        location: formData?.location || getActiveCityConfig().name,
        duration_days: parseInt(formData?.duration || 30),
        expires_at: expiresAt?.toISOString(),
        ad_status: isGuest ? 'pending' : 'active',
        ip_address: ipAddress || null,
        guest_email: isGuest ? guestInfo?.email : null,
        verification_token: verificationToken,
        listing_type: formData?.listing_type || 'venta',
        price_type: formData?.price_type || null,
        schedule_note: formData?.schedule_note || null,
        provider_name: formData?.provider_name || null,
        provider_last_name: formData?.provider_last_name || null,
        provider_display_name: formData?.provider_display_name || null,
        ratings_enabled: formData?.ratings_enabled || false,
        available_urgency: formData?.available_urgency || false,
        weekend_service: formData?.weekend_service || false,
        issues_invoice: formData?.issues_invoice || false,
      };

      const { data: ad, error: adError } = await supabase?.from('classified_ads')?.insert(payload)?.select()?.single();

      if (adError) throw adError;

      const imageInserts = [];

      if (profilePhotoPath) {
        // Foto de perfil explícita — siempre primaria, nunca parte del portafolio.
        imageInserts.push({
          ad_id: ad?.id,
          storage_path: profilePhotoPath,
          is_primary: true,
          image_type: 'profile',
          sort_order: 0,
        });
      }

      if (photoPaths?.length > 0) {
        photoPaths?.forEach((path, index) => {
          imageInserts.push({
            ad_id: ad?.id,
            storage_path: path,
            // Sin foto de perfil explícita, la primera imagen es la primaria
            // (comportamiento anterior, para avisos de venta).
            is_primary: !profilePhotoPath && index === 0,
            image_type: 'portfolio',
            sort_order: index,
          });
        });
      }

      if (imageInserts?.length > 0) {
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
    return `${r2Public()}/${storagePath}`;
  },

  formatAd(ad) {
    const allImages = ad?.ad_images || [];

    // Foto de perfil: image_type='profile' explícito, o fallback legacy a is_primary.
    const profileImg = allImages?.find(img => img?.image_type === 'profile')
      || allImages?.find(img => img?.is_primary)
      || allImages?.[0]
      || null;

    // Portafolio: toda imagen que NO sea la foto de perfil.
    const portfolioImgs = allImages
      ?.filter(img => img !== profileImg && img?.image_type !== 'profile')
      ?.map(img => ({
        url: img?.storage_path?.startsWith('http')
          ? img.storage_path
          : `${r2Public()}/${img.storage_path}`,
        alt: img?.alt_text || ad?.title,
      }));

    const imageUrl = profileImg?.storage_path
      ? (profileImg?.storage_path?.startsWith('http') ? profileImg.storage_path : `${r2Public()}/${profileImg.storage_path}`)
      : null;

    const now = Date.now();
    const createdAt = new Date(ad?.created_at);
    const diffMs = now - createdAt?.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    const timeAgo = diffH < 1 ? 'Hace menos de 1 hora' : diffH < 24 ? `Hace ${diffH} hora${diffH > 1 ? 's' : ''}` : diffD < 7 ? `Hace ${diffD} día${diffD > 1 ? 's' : ''}` : `Hace ${Math.floor(diffD / 7)} semana${Math.floor(diffD / 7) > 1 ? 's' : ''}`;

    const providerLabel = ad?.provider_display_name
      || [ad?.provider_name, ad?.provider_last_name]?.filter(Boolean)?.join(' ')
      || null;
    const isNew = diffD < 30;

    return {
      ...ad,
      image: imageUrl,
      imageAlt: profileImg?.alt_text || ad?.title,
      portfolioImages: portfolioImgs,
      timeAgo,
      datePosted: createdAt,
      providerLabel,
      isNew,
    };
  }
};
