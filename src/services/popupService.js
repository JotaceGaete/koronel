import { supabase } from '../lib/supabase';
import { applyCityFilter } from '../lib/cityFilter';

export const popupService = {
  async getActivePopup({ communityCityId = null } = {}) {
    try {
      const now = new Date()?.toISOString();
      let query = supabase
        ?.from('popups')
        ?.select('*')
        ?.eq('active', true)
        ?.or(`starts_at.is.null,starts_at.lte.${now}`)
        ?.or(`ends_at.is.null,ends_at.gte.${now}`);

      query = applyCityFilter(query, communityCityId, { source: 'popupService.getActivePopup' });

      const { data, error } = await query
        ?.order('created_at', { ascending: false })
        ?.limit(1)
        ?.single();
      if (error) throw error;
      return { data: data || null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
