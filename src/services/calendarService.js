import { supabase } from '../lib/supabase';

export const calendarService = {
  async getUpcoming(categoryKey, limit = 3) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const in60days = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

      let query = supabase
        ?.from('commercial_calendar')
        ?.select('*')
        ?.gte('date', today)
        ?.lte('date', in60days)
        ?.order('date', { ascending: true })
        ?.limit(limit * 3); // fetch more, then filter client-side by relevance

      const { data, error } = await query;
      if (error) throw error;

      const events = data || [];
      // Prioritize events relevant to this category
      const relevant = events.filter(e =>
        !e.relevance?.length || e.relevance.includes(categoryKey) || e.relevance.includes('todos')
      );
      const others = events.filter(e => !relevant.includes(e));
      return { data: [...relevant, ...others].slice(0, limit), error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  daysUntil(dateStr) {
    const target = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / 86400000);
  },
};
