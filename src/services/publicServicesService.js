import { supabase } from '../lib/supabase';

// Fuente única de las categorías de "Servicios para la comunidad". Igual que
// COMMUNITY_CATEGORIES en communityService.js: se define acá, no en una tabla,
// porque son 4 categorías fijas y agregar una nueva no debería requerir una
// migración. `category_key` en public_services está restringido por un CHECK
// a estas mismas 4 claves.
export const PUBLIC_SERVICE_CATEGORIES = [
  { key: 'instituciones_publicas', label: 'Instituciones públicas' },
  { key: 'salud', label: 'Salud' },
  { key: 'emergencias', label: 'Emergencias' },
  { key: 'atencion_ciudadana', label: 'Atención ciudadana' },
];

const VALID_CATEGORY_KEYS = new Set(PUBLIC_SERVICE_CATEGORIES?.map(c => c?.key));

export function getPublicServiceCategoryLabel(categoryKey) {
  return PUBLIC_SERVICE_CATEGORIES?.find(c => c?.key === categoryKey)?.label || categoryKey;
}

export const publicServicesService = {
  // Directorio de instituciones. Lee únicamente de `public_services`, nunca
  // de `businesses` — no hay forma de que esto se mezcle con negocios.
  async getAll({ categoryKey } = {}) {
    try {
      let query = supabase
        ?.from('public_services')
        ?.select('*')
        ?.eq('status', 'published');

      if (categoryKey && VALID_CATEGORY_KEYS?.has(categoryKey)) {
        query = query?.eq('category_key', categoryKey);
      }

      query = query?.order('sort_order', { ascending: true })?.order('name', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('publicServicesService.getAll error:', error);
      return { data: [], error };
    }
  },

  async getById(id) {
    try {
      if (!id) return { data: null, error: null };
      const { data, error } = await supabase
        ?.from('public_services')
        ?.select('*')
        ?.eq('id', id)
        ?.eq('status', 'published')
        ?.maybeSingle();
      if (error) throw error;
      return { data: data || null, error: null };
    } catch (error) {
      console.error('publicServicesService.getById error:', error);
      return { data: null, error };
    }
  },

  // "¿Encontraste información incorrecta?" — reporte simple, sin cuenta ni
  // panel de administración todavía. Queda en public_service_reports para
  // que un futuro flujo de verificación/corrección tenga historial desde
  // el día uno.
  async submitReport({ serviceId, name, email, message }) {
    try {
      if (!serviceId || !message?.trim()) {
        return { data: null, error: new Error('Falta el mensaje del reporte.') };
      }
      const { data, error } = await supabase
        ?.from('public_service_reports')
        ?.insert({
          service_id: serviceId,
          reporter_name: name?.trim() || null,
          reporter_email: email?.trim() || null,
          message: message?.trim(),
        })
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('publicServicesService.submitReport error:', error);
      return { data: null, error };
    }
  },
};
