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

// Estados de un reporte de corrección (public_service_reports.status).
export const PUBLIC_SERVICE_REPORT_STATUSES = [
  { key: 'pending', label: 'Pendiente' },
  { key: 'reviewed', label: 'Revisado' },
  { key: 'resolved', label: 'Resuelto' },
  { key: 'dismissed', label: 'Descartado' },
];

const VALID_REPORT_STATUSES = new Set(PUBLIC_SERVICE_REPORT_STATUSES?.map(s => s?.key));

// Columnas editables de public_services desde el panel admin. Igual patrón que
// BUSINESS_COLUMNS en businessService.js / adminService.js: allow-list explícita
// antes de insert/update, nunca se manda el payload crudo del formulario.
const SERVICE_COLUMNS = new Set([
  'name', 'slug', 'institution_type', 'category_key', 'description',
  'address', 'phone', 'email', 'schedule_note', 'website', 'whatsapp',
  'latitude', 'longitude', 'verified_at', 'source_url', 'status', 'sort_order',
]);

// Un string vacío no es "sin dato" para Postgres — es un dato (una cadena
// vacía). Los campos opcionales se guardan como NULL, nunca como ''.
function nullifyEmptyString(value) {
  return typeof value === 'string' && value?.trim() === '' ? null : value;
}

function sanitizeServicePayload(payload = {}) {
  const out = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!SERVICE_COLUMNS?.has(key) || value === undefined) continue;
    out[key] = nullifyEmptyString(value);
  }
  return out;
}

// Traduce errores de Postgres conocidos a un mensaje que un admin puede
// entender sin ver el código de error crudo.
function friendlyServiceError(error) {
  if (error?.code === '23505') {
    return new Error('Ya existe un servicio con ese slug. Elige otro.');
  }
  if (error?.code === '23503') {
    return new Error('No se puede eliminar: este servicio tiene reportes asociados. Desactívalo, o resuelve/descarta sus reportes primero.');
  }
  return error;
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

  // ── Admin: gestión de fichas ───────────────────────────────────
  // Estos métodos devuelven TODAS las fichas (activas e inactivas) —
  // a diferencia de getAll/getById, que son de uso público y solo
  // muestran 'published'. La seguridad real vive en las políticas RLS
  // (solo public.is_admin() puede insertar/actualizar/eliminar); esto
  // no reemplaza esa protección, solo evita mostrar datos innecesarios.
  async adminGetAll({ search, categoryKey, status } = {}) {
    try {
      let query = supabase?.from('public_services')?.select('*');

      if (categoryKey && categoryKey !== 'all' && VALID_CATEGORY_KEYS?.has(categoryKey)) {
        query = query?.eq('category_key', categoryKey);
      }
      if (status && status !== 'all') {
        query = query?.eq('status', status);
      }
      if (search?.trim()) {
        query = query?.ilike('name', `%${search?.trim()}%`);
      }

      query = query?.order('sort_order', { ascending: true })?.order('name', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('publicServicesService.adminGetAll error:', error);
      return { data: [], error };
    }
  },

  async adminGetById(id) {
    try {
      if (!id) return { data: null, error: null };
      const { data, error } = await supabase
        ?.from('public_services')
        ?.select('*')
        ?.eq('id', id)
        ?.maybeSingle();
      if (error) throw error;
      return { data: data || null, error: null };
    } catch (error) {
      console.error('publicServicesService.adminGetById error:', error);
      return { data: null, error };
    }
  },

  async adminCreate(payload) {
    try {
      if (!payload?.name?.trim()) {
        return { data: null, error: new Error('El nombre es obligatorio.') };
      }
      if (!VALID_CATEGORY_KEYS?.has(payload?.category_key)) {
        return { data: null, error: new Error('Elige una categoría válida.') };
      }
      if (!payload?.institution_type?.trim()) {
        return { data: null, error: new Error('El tipo de institución es obligatorio.') };
      }

      const clean = sanitizeServicePayload({
        ...payload,
        status: payload?.status || 'published',
      });

      const { data, error } = await supabase?.from('public_services')?.insert(clean)?.select()?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('publicServicesService.adminCreate error:', error);
      return { data: null, error: friendlyServiceError(error) };
    }
  },

  async adminUpdate(id, payload) {
    try {
      if (!id) return { data: null, error: new Error('Falta el id del servicio.') };
      if (payload?.name !== undefined && !payload?.name?.trim()) {
        return { data: null, error: new Error('El nombre es obligatorio.') };
      }
      if (payload?.category_key !== undefined && !VALID_CATEGORY_KEYS?.has(payload?.category_key)) {
        return { data: null, error: new Error('Elige una categoría válida.') };
      }
      if (payload?.institution_type !== undefined && !payload?.institution_type?.trim()) {
        return { data: null, error: new Error('El tipo de institución es obligatorio.') };
      }

      const clean = sanitizeServicePayload(payload);

      const { data, error } = await supabase?.from('public_services')?.update(clean)?.eq('id', id)?.select()?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('publicServicesService.adminUpdate error:', error);
      return { data: null, error: friendlyServiceError(error) };
    }
  },

  // Desactivar/activar (status draft/published) — la acción normal para
  // dejar de mostrar una institución sin perder su historial ni sus reportes.
  async adminSetActive(id, isActive) {
    try {
      const { data, error } = await supabase
        ?.from('public_services')
        ?.update({ status: isActive ? 'published' : 'draft' })
        ?.eq('id', id)
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('publicServicesService.adminSetActive error:', error);
      return { data: null, error };
    }
  },

  // Eliminación física — acción secundaria y poco frecuente. La base de
  // datos (FK ON DELETE RESTRICT) rechaza el borrado mientras existan
  // reportes asociados; ese error se traduce a un mensaje claro.
  async adminDelete(id) {
    try {
      if (!id) return { error: new Error('Falta el id del servicio.') };
      const { error } = await supabase?.from('public_services')?.delete()?.eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('publicServicesService.adminDelete error:', error);
      return { error: friendlyServiceError(error) };
    }
  },

  // ── Admin: reportes de corrección ──────────────────────────────
  async adminGetReports({ status } = {}) {
    try {
      let query = supabase
        ?.from('public_service_reports')
        ?.select('*, service:public_services(id, name, slug)')
        ?.order('created_at', { ascending: false });

      if (status && status !== 'all' && VALID_REPORT_STATUSES?.has(status)) {
        query = query?.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('publicServicesService.adminGetReports error:', error);
      return { data: [], error };
    }
  },

  async adminUpdateReportStatus(id, status) {
    try {
      if (!VALID_REPORT_STATUSES?.has(status)) {
        return { data: null, error: new Error('Estado de reporte no válido.') };
      }
      const { data, error } = await supabase
        ?.from('public_service_reports')
        ?.update({ status })
        ?.eq('id', id)
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('publicServicesService.adminUpdateReportStatus error:', error);
      return { data: null, error };
    }
  },
};
