import { supabase } from '../lib/supabase';

export const mapService = {
  async getBusinessesForMap({ search = '', categoryId = null } = {}) {
    try {
      let query = supabase
        ?.from('businesses')
        ?.select('id, name, category, category_key, category_id, address, phone, lat, lng, featured, verified')
        ?.not('lat', 'is', null)
        ?.eq('status', 'published');

      if (search?.trim()) {
        query = query?.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
      }
      if (categoryId) {
        query = query?.eq('category_key', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data: (data || [])?.filter(b => b?.lat && b?.lng), error: null };
    } catch (error) {
      console.error('mapService.getBusinessesForMap error:', error);
      return { data: [], error };
    }
  },

  async getCategories() {
    try {
      const { data, error } = await supabase
        ?.from('categories')
        ?.select('id, name, name_key, icon')
        ?.is('parent_id', null)
        ?.order('sort_order', { ascending: true })
        ?.order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  async getBusinessImageUrl(businessId) {
    try {
      const { data, error } = await supabase
        ?.from('business_images')
        ?.select('storage_path, alt_text')
        ?.eq('business_id', businessId)
        ?.eq('is_primary', true)
        ?.single();
      if (error || !data) return null;
      if (data?.storage_path?.startsWith('http')) return data?.storage_path;
      const base = import.meta.env?.VITE_R2_PUBLIC_URL || 'https://multimedia.koronel.cl';
      return `${base}/${data?.storage_path}`;
    } catch {
      return null;
    }
  },

  async getEventsForMap({ search = '' } = {}) {
    try {
      let query = supabase
        ?.from('events')
        ?.select('id, title, category, start_datetime, end_datetime, venue_name, address, address_text, lat, lng, image_url, contact_whatsapp, organizer_id, organizer_business_id, status, organizer:event_organizers(id, name, logo_url, business:businesses(lat, lng))')
        ?.in('status', ['approved', 'active']);

      if (search?.trim()) {
        query = query?.ilike('title', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const normalized = (data || [])?.map(ev => {
        const orgLat = ev?.organizer?.business?.lat;
        const orgLng = ev?.organizer?.business?.lng;
        const resolvedLat = orgLat || ev?.lat;
        const resolvedLng = orgLng || ev?.lng;
        return {
          ...ev,
          resolvedLat,
          resolvedLng,
          displayAddress: ev?.address_text || ev?.address || '',
        };
      })?.filter(ev => ev?.resolvedLat && ev?.resolvedLng);

      return { data: normalized, error: null };
    } catch (error) {
      console.error('mapService.getEventsForMap error:', error);
      return { data: [], error };
    }
  },

  async getUpcomingEvents(limit = 5) {
    try {
      const { data, error } = await supabase
        ?.from('events')
        ?.select('id, title, category, start_datetime, venue_name, address_text, address, lat, lng, organizer_id, organizer_business_id, organizer:event_organizers(id, name, logo_url, business:businesses(lat, lng))')
        ?.in('status', ['approved', 'active'])
        ?.gte('start_datetime', new Date()?.toISOString())
        ?.order('start_datetime', { ascending: true })
        ?.limit(limit);
      if (error) throw error;

      const normalized = (data || [])?.map(ev => ({
        ...ev,
        resolvedLat: ev?.organizer?.business?.lat || ev?.lat,
        resolvedLng: ev?.organizer?.business?.lng || ev?.lng,
        displayAddress: ev?.address_text || ev?.address || '',
      }));

      return { data: normalized, error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  formatEventDate(dtStr) {
    if (!dtStr) return '';
    try {
      return new Date(dtStr)?.toLocaleDateString('es-CL', {
        weekday: 'short', day: 'numeric', month: 'short',
      });
    } catch { return ''; }
  },

  formatEventTime(dtStr) {
    if (!dtStr) return '';
    try {
      return new Date(dtStr)?.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  },
};
