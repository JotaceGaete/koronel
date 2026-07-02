import { supabase } from '../lib/supabase';
import { uploadFile } from './uploadService';
import { logger } from '../lib/logger';

const R2_PUBLIC = import.meta.env?.VITE_R2_PUBLIC_URL || 'https://multimedia.koronel.cl';

export const actionService = {
  // ─── Public listing ────────────────────────────────────────────────────────

  async getAll({ search, category, sector, sort = 'newest', page = 1, pageSize = 12 } = {}) {
    try {
      let query = supabase
        ?.from('commercial_actions')
        ?.select('*, business:businesses(id, name, category_key, walinka_enabled, walinka_catalog_url), action_images(storage_path, alt_text, sort_order)', { count: 'exact' })
        ?.eq('status', 'active')
        ?.eq('dist_koronel', true)
        ?.gte('ends_at', new Date().toISOString());

      if (search?.trim()) {
        query = query?.or(`title.ilike.%${search}%,headline.ilike.%${search}%`);
      }
      if (category && category !== 'all') {
        query = query?.eq('category_key', category);
      }
      if (sector && sector !== 'all') {
        query = query?.eq('target_sector', sector);
      }

      if (sort === 'ending_soon') {
        query = query?.order('ends_at', { ascending: true });
      } else if (sort === 'most_viewed') {
        query = query?.order('views', { ascending: false });
      } else {
        query = query?.order('featured', { ascending: false })?.order('created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      query = query?.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      logger.error('actionService.getAll error:', error);
      return { data: [], count: 0, error };
    }
  },

  async getUrgent(limit = 6) {
    try {
      const soon = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        ?.from('commercial_actions')
        ?.select('*, business:businesses(id, name), action_images(storage_path, alt_text, sort_order)')
        ?.eq('status', 'active')
        ?.eq('dist_koronel', true)
        ?.gte('ends_at', new Date().toISOString())
        ?.lte('ends_at', soon)
        ?.order('ends_at', { ascending: true })
        ?.limit(limit);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getBySlug(slug) {
    try {
      const { data, error } = await supabase
        ?.from('commercial_actions')
        ?.select('*, business:businesses(id, name, category_key, phone, whatsapp, address, walinka_enabled, walinka_catalog_url, walinka_business_slug), action_images(storage_path, alt_text, sort_order)')
        ?.eq('slug', slug)
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('actionService.getBySlug error:', error);
      return { data: null, error };
    }
  },

  async getByBusiness(businessId, excludeSlug, limit = 4) {
    try {
      let query = supabase
        ?.from('commercial_actions')
        ?.select('*, action_images(storage_path, alt_text, sort_order)')
        ?.eq('business_id', businessId)
        ?.eq('status', 'active')
        ?.gte('ends_at', new Date().toISOString())
        ?.order('created_at', { ascending: false })
        ?.limit(limit);
      if (excludeSlug) query = query?.neq('slug', excludeSlug);
      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  // ─── Business owner ─────────────────────────────────────────────────────────

  async getByUser(userId) {
    try {
      const { data, error } = await supabase
        ?.from('commercial_actions')
        ?.select('*, business:businesses(id, name), action_images(storage_path, alt_text, sort_order)')
        ?.eq('user_id', userId)
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async create({ userId, businessId, formData, coverImagePath, triggerIntent, suggestedType, acceptedSuggestion, pulseAtCreation, daysInactiveAtCreation, aiContextSnapshot }) {
    try {
      const payload = {
        user_id:                    userId,
        business_id:                businessId,
        trigger_intent:             triggerIntent || null,
        action_type:                formData?.action_type || 'offer',
        suggested_action_type:      suggestedType || null,
        accepted_suggestion:        acceptedSuggestion ?? false,
        title:                      formData?.title,
        headline:                   formData?.headline || null,
        description:                formData?.description || null,
        cover_image_url:            coverImagePath ? actionService.getImageUrl(coverImagePath) : (formData?.cover_image_url || null),
        discount_type:              formData?.discount_type || null,
        discount_pct:               formData?.discount_pct ? parseInt(formData.discount_pct) : null,
        discount_amount:            formData?.discount_amount ? parseInt(String(formData.discount_amount).replace(/\D/g, '')) : null,
        discount_label:             formData?.discount_label || null,
        original_price:             formData?.original_price ? parseInt(String(formData.original_price).replace(/\D/g, '')) : null,
        promo_price:                formData?.promo_price ? parseInt(String(formData.promo_price).replace(/\D/g, '')) : null,
        promo_code:                 formData?.promo_code || null,
        starts_at:                  formData?.starts_at || new Date().toISOString(),
        ends_at:                    formData?.ends_at,
        max_redemptions:            formData?.max_redemptions ? parseInt(formData.max_redemptions) : null,
        show_countdown:             formData?.show_countdown ?? true,
        status:                     'active',
        dist_koronel:               formData?.dist_koronel ?? true,
        dist_map:                   formData?.dist_map ?? true,
        dist_profile:               formData?.dist_profile ?? true,
        dist_followers:             formData?.dist_followers ?? true,
        dist_walinka:               formData?.dist_walinka ?? false,
        walinka_link_type:          formData?.walinka_link_type || null,
        walinka_link_ref:           formData?.walinka_link_ref || null,
        walinka_catalog_url:        formData?.walinka_catalog_url || null,
        target_sector:              formData?.target_sector || null,
        category_key:               formData?.category_key || null,
        pulse_at_creation:          pulseAtCreation || null,
        days_inactive_at_creation:  daysInactiveAtCreation ?? null,
        ai_context_snapshot:        aiContextSnapshot || null,
        published_at:               new Date().toISOString(),
      };

      const { data: action, error: actionError } = await supabase
        ?.from('commercial_actions')
        ?.insert(payload)
        ?.select()
        ?.single();

      if (actionError) throw actionError;

      if (coverImagePath) {
        await supabase?.from('action_images')?.insert({
          action_id:    action?.id,
          storage_path: coverImagePath,
          alt_text:     formData?.title || 'Imagen de acción',
          sort_order:   0,
        });
      }

      return { data: action, error: null };
    } catch (error) {
      logger.error('actionService.create error:', error);
      return { data: null, error };
    }
  },

  async update(actionId, userId, updates) {
    try {
      const { data, error } = await supabase
        ?.from('commercial_actions')
        ?.update({ ...updates, updated_at: new Date().toISOString() })
        ?.eq('id', actionId)
        ?.eq('user_id', userId)
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async pause(actionId, userId) {
    return actionService.update(actionId, userId, { status: 'paused' });
  },

  async cancel(actionId, userId) {
    return actionService.update(actionId, userId, { status: 'cancelled' });
  },

  // ─── Analytics (fire-and-forget) ───────────────────────────────────────────

  async incrementViews(actionId) {
    try {
      await supabase?.rpc('increment_action_counter', { p_action_id: actionId, p_column: 'views' });
    } catch { /* silent */ }
  },

  async trackWhatsappClick(actionId) {
    try {
      await supabase?.rpc('increment_action_counter', { p_action_id: actionId, p_column: 'whatsapp_clicks' });
    } catch { /* silent */ }
  },

  async trackCatalogClick(actionId) {
    try {
      await supabase?.rpc('increment_action_counter', { p_action_id: actionId, p_column: 'catalog_clicks' });
    } catch { /* silent */ }
  },

  async trackShare(actionId) {
    try {
      await supabase?.rpc('increment_action_counter', { p_action_id: actionId, p_column: 'share_count' });
    } catch { /* silent */ }
  },

  // ─── Image upload ───────────────────────────────────────────────────────────

  async uploadCoverImage(file) {
    try {
      const { url, path: storagePath, error } = await uploadFile(file, { entityType: 'action_cover', entityId: null });
      if (error) throw error;
      return { path: storagePath, url, error: null };
    } catch (error) {
      return { path: null, url: null, error };
    }
  },

  // ─── Helpers ────────────────────────────────────────────────────────────────

  getImageUrl(storagePath) {
    if (!storagePath) return null;
    if (storagePath?.startsWith('http')) return storagePath;
    return `${R2_PUBLIC}/${storagePath}`;
  },

  // ── Impulsar promoción ────────────────────────────────────────────────────────
  // Flujo: reserve → mark featured → confirm  (release si algo falla)

  async boostAction({ actionId, accountId, userId }) {
    // Idempotency key: una sola clave por acción. Si ya se impulsó con esta key,
    // fn_wallet_reserve retornará { idempotent: true } sin cobrar de nuevo.
    const idempotencyKey = `boost-action-${actionId}`;

    // 1. Verificar que la acción existe, pertenece al usuario y no está ya impulsada
    const { data: action, error: fetchErr } = await supabase
      .from('commercial_actions')
      .select('id, user_id, boosted_at, status')
      .eq('id', actionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr || !action) {
      return { ok: false, error: 'Acción no encontrada o no tienes permiso.' };
    }
    if (action.boosted_at) {
      return { ok: false, error: 'Esta acción ya está impulsada.', alreadyBoosted: true };
    }
    if (action.status !== 'active') {
      return { ok: false, error: 'Solo se pueden impulsar acciones activas.' };
    }

    // 2. Reservar créditos
    const { walletService } = await import('./walletService.js');
    const reserveRes = await walletService.reserve({
      accountId,
      actionKey:      'PROMOTION_BOOST',
      referenceType:  'commercial_action',
      referenceId:    actionId,
      idempotencyKey,
    });

    if (!reserveRes.data?.ok) {
      const err = reserveRes.data?.error || reserveRes.error?.message || 'Error al reservar créditos.';
      return { ok: false, error: err, insufficientBalance: err === 'insufficient_balance' };
    }

    const consumptionId = reserveRes.data.consumption_id;

    // 3. Marcar como impulsada y featured
    const { error: updateErr } = await supabase
      .from('commercial_actions')
      .update({
        featured:             true,
        tier:                 'boost',
        boosted_at:           new Date().toISOString(),
        boost_consumption_id: consumptionId,
      })
      .eq('id', actionId)
      .eq('user_id', userId);

    if (updateErr) {
      // El UPDATE falló — liberar la reserva para no perder créditos
      await walletService.release({
        consumptionId,
        failureReason: `update_failed: ${updateErr.message}`,
      });
      return { ok: false, error: 'No se pudo impulsar la acción. Créditos liberados.' };
    }

    // 4. Confirmar el consumo
    const confirmRes = await walletService.confirm({
      consumptionId,
      displayLabel: 'Promoción impulsada',
    });

    if (!confirmRes.data?.ok) {
      // El confirm falló — la acción ya está marcada como featured.
      // Revertir el featured y liberar la reserva.
      await Promise.all([
        supabase
          .from('commercial_actions')
          .update({ featured: false, tier: 'free', boosted_at: null, boost_consumption_id: null })
          .eq('id', actionId),
        walletService.release({
          consumptionId,
          failureReason: `confirm_failed: ${confirmRes.error?.message}`,
        }),
      ]);
      return { ok: false, error: 'Error al confirmar el pago. La acción no fue impulsada.' };
    }

    return { ok: true, balance: confirmRes.data.balance };
  },

  formatAction(action) {
    const images = action?.action_images || [];
    const cover = images.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
    const coverUrl = action?.cover_image_url
      || (cover?.storage_path ? actionService.getImageUrl(cover.storage_path) : null);

    const now = Date.now();
    const endsAt = new Date(action?.ends_at);
    const msLeft = endsAt - now;
    const hoursLeft = Math.max(0, Math.floor(msLeft / 3600000));
    const isUrgent = msLeft > 0 && msLeft < 48 * 3600 * 1000;
    const isExpired = msLeft <= 0;

    const discountDisplay = action?.discount_label
      || (action?.discount_pct ? `-${action.discount_pct}%` : null)
      || (action?.discount_amount ? `-$${Number(action.discount_amount).toLocaleString('es-CL')}` : null)
      || null;

    return {
      ...action,
      coverUrl,
      isUrgent,
      isExpired,
      hoursLeft,
      discountDisplay,
    };
  },
};
