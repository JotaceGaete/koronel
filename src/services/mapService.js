import { supabase } from '../lib/supabase';
import { formatDate, formatTime } from '../utils/format';
import { getActiveCityConfig } from '../config/city';
import { filterMapItems } from '../utils/businessCategoryFilter';

export const mapService = {
  async getBusinessesForMap({ search = '', category = '' } = {}) {
    try {
      let query = supabase
        ?.from('businesses')
        ?.select('id, name, category, category_key, address, phone, lat, lng, featured, verified')
        ?.not('lat', 'is', null);

      const { data, error } = await query;
      if (error) throw error;

      const withCoords = (data || [])?.filter(b => b?.lat && b?.lng);
      const { items, debugStats } = filterMapItems(withCoords, {
        activeType: 'business',
        activeCategory: category,
        searchTerm: search,
      });

      return { data: items, debugStats, error: null };
    } catch (error) {
      console.error('mapService.getBusinessesForMap error:', error);
      return { data: [], error };
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
      return `${getActiveCityConfig().mediaBaseUrl}/${data?.storage_path}`;
    } catch {
      return null;
    }
  },

  async getEventsForMap({ search = '', category = '' } = {}) {
    try {
      let query = supabase
        ?.from('events')
        ?.select('id, title, category, start_datetime, end_datetime, venue_name, address, address_text, lat, lng, image_url, contact_whatsapp, organizer_business_id, status, organizer:businesses(id, name, lat, lng)')
        ?.in('status', ['approved', 'active']);

      if (search?.trim()) {
        query = query?.ilike('title', `%${search}%`);
      }
      if (category && category !== 'all') {
        query = query?.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      const normalized = (data || [])?.map(ev => {
        const orgLat = ev?.organizer?.lat;
        const orgLng = ev?.organizer?.lng;
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
        ?.select('id, title, category, start_datetime, venue_name, address_text, address, lat, lng, organizer_business_id, organizer:businesses(id, name, lat, lng)')
        ?.in('status', ['approved', 'active'])
        ?.gte('start_datetime', new Date()?.toISOString())
        ?.order('start_datetime', { ascending: true })
        ?.limit(limit);
      if (error) throw error;

      const normalized = (data || [])?.map(ev => ({
        ...ev,
        resolvedLat: ev?.organizer?.lat || ev?.lat,
        resolvedLng: ev?.organizer?.lng || ev?.lng,
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
      return formatDate(dtStr, { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return ''; }
  },

  formatEventTime(dtStr) {
    if (!dtStr) return '';
    try {
      return formatTime(dtStr);
    } catch { return ''; }
  },
};
