import { supabase } from '../lib/supabase';

/**
 * Servicio público para obtener banners activos (lectura permitida por RLS).
 */
export const bannerService = {
  /**
   * Obtiene los banners activos para una posición.
   * @param {string} position - 'homepage_top' | 'homepage_bottom' | 'sidebar' | 'footer'
   * @param {number} limit - cantidad máxima (por defecto 4)
   */
  async getActiveByPosition(position, limit = 4) {
    try {
      const { data, error } = await supabase
        ?.from('banners')
        ?.select('id, title, image_url, link_url, position, sort_order')
        ?.eq('active', true)
        ?.eq('position', position)
        ?.order('sort_order', { ascending: true })
        ?.limit(limit);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('bannerService.getActiveByPosition error:', error);
      return { data: [], error };
    }
  },
};
