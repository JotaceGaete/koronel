import { supabase } from '../lib/supabase';
import { uploadFile } from './uploadService';

export const eventService = {
  async getAll({ category, search, status = 'approved', upcoming = true, page = 1, pageSize = 12 } = {}) {
    try {
      let query = supabase
        ?.from('events')
        ?.select('*, organizer:businesses(id, name, category)', { count: 'exact' });

      if (status && status !== 'all') {
        query = query?.eq('status', status);
      }
      if (category && category !== 'all') {
        query = query?.eq('category', category);
      }
      if (search?.trim()) {
        query = query?.ilike('title', `%${search}%`);
      }
      if (upcoming) {
        query = query?.gte('start_datetime', new Date()?.toISOString());
      }

      query = query?.order('start_datetime', { ascending: true });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query?.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      console.error('eventService.getAll error:', error);
      return { data: [], count: 0, error };
    }
  },

  async getUpcoming(limit = 4) {
    try {
      const { data, error } = await supabase
        ?.from('events')
        ?.select('*, organizer:businesses(id, name)')
        ?.eq('status', 'approved')
        ?.gte('start_datetime', new Date()?.toISOString())
        ?.order('start_datetime', { ascending: true })
        ?.limit(limit);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getById(id) {
    try {
      const { data, error } = await supabase
        ?.from('events')
        ?.select('*, organizer:businesses(id, name, category, address, phone)')
        ?.eq('id', id)
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getByUser(userId) {
    try {
      const { data, error } = await supabase
        ?.from('events')
        ?.select('*')
        ?.eq('user_id', userId)
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async create({ userId, formData, imageUrl }) {
    try {
      const { data, error } = await supabase
        ?.from('events')
        ?.insert({
          user_id: userId,
          title: formData?.title,
          description: formData?.description,
          category: formData?.category,
          start_datetime: formData?.startDatetime,
          end_datetime: formData?.endDatetime,
          venue_name: formData?.venueName,
          address: formData?.address,
          image_url: imageUrl || null,
          contact_whatsapp: formData?.contactWhatsapp || null,
          organizer_business_id: formData?.organizerBusinessId || null,
          status: 'pending',
        })
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async update(id, updates) {
    try {
      const { data, error } = await supabase
        ?.from('events')
        ?.update({ ...updates, updated_at: new Date()?.toISOString() })
        ?.eq('id', id)
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateStatus(id, status) {
    return this.update(id, { status });
  },

  async delete(id) {
    try {
      const { error } = await supabase?.from('events')?.delete()?.eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async uploadImage(file, userId) {
    try {
      const { url, path: storageKey, error: uploadError } = await uploadFile(file, {
        entityType: 'event_image',
        entityId: null,
      });
      if (uploadError) throw uploadError;
      return { path: storageKey, publicUrl: url, error: null };
    } catch (error) {
      return { path: null, publicUrl: null, error };
    }
  },

  // Admin: get all events regardless of status
  async adminGetAll({ search, status, category, page = 1, pageSize = 20 } = {}) {
    try {
      let query = supabase
        ?.from('events')
        ?.select('*, user:user_profiles(id, full_name, email), organizer:businesses(id, name)', { count: 'exact' });

      if (status && status !== 'all') {
        query = query?.eq('status', status);
      }
      if (category && category !== 'all') {
        query = query?.eq('category', category);
      }
      if (search?.trim()) {
        query = query?.ilike('title', `%${search}%`);
      }

      query = query?.order('created_at', { ascending: false });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query?.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      return { data: [], count: 0, error };
    }
  },

  formatEvent(event) {
    const start = new Date(event?.start_datetime);
    const end = new Date(event?.end_datetime);
    const now = new Date();
    const isUpcoming = start > now;
    const isPast = end < now;

    const dateStr = start?.toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const timeStr = start?.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const CATEGORY_LABELS = {
      church: 'Iglesia',
      courses: 'Cursos',
      meetups: 'Encuentros',
      other: 'Otro',
    };

    const CATEGORY_COLORS = {
      church: '#7c3aed',
      courses: '#0891b2',
      meetups: '#059669',
      other: '#d97706',
    };

    // Capitalize first letter for unknown/dynamic categories
    const rawCategory = event?.category || 'other';
    const categoryLabel = CATEGORY_LABELS?.[rawCategory]
      || (rawCategory?.charAt(0)?.toUpperCase() + rawCategory?.slice(1));
    const categoryColor = CATEGORY_COLORS?.[rawCategory] || '#6b7280';

    return {
      ...event,
      dateStr,
      timeStr,
      isUpcoming,
      isPast,
      categoryLabel,
      categoryColor,
    };
  },
};

// Church details service
export const churchDetailsService = {
  async getByBusinessId(businessId) {
    try {
      const { data, error } = await supabase
        ?.from('church_details')
        ?.select('*')
        ?.eq('business_id', businessId)
        ?.single();
      if (error && error?.code !== 'PGRST116') throw error;
      return { data: data || null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async upsert(businessId, fields) {
    try {
      const { data, error } = await supabase
        ?.from('church_details')
        ?.upsert({
          business_id: businessId,
          pastor_name: fields?.pastorName || null,
          service_schedule: fields?.serviceSchedule || null,
          weekly_message: fields?.weeklyMessage || null,
          updated_at: new Date()?.toISOString(),
        }, { onConflict: 'business_id' })
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async hasApprovedClaim(businessId, userId) {
    try {
      const { data, error } = await supabase
        ?.from('business_claims')
        ?.select('id')
        ?.eq('business_id', businessId)
        ?.eq('user_id', userId)
        ?.eq('claim_status', 'approved')
        ?.single();
      if (error && error?.code !== 'PGRST116') return false;
      return !!data;
    } catch {
      return false;
    }
  },
};
