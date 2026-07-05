import { supabase } from '../lib/supabase';
import { formatDate, formatTime } from '../utils/format';
import { getActiveCityConfig } from '../config/city';

const BUSINESS_CATEGORY_ALIASES = {
  farmacias: 'salud-farmacia',
  farmacia: 'salud-farmacia',
  supermercado: 'supermercados',
  supermarkets: 'supermercados',
  supermarket: 'supermercados',
  grocery_or_supermarket: 'supermercados',
};

const BUSINESS_CATEGORY_CHILDREN = {
  restaurantes: [
    'restaurantes',
    'restaurantes-chilena',
    'restaurantes-pizzeria',
    'restaurantes-mariscos',
    'restaurantes-rapida',
    'restaurantes-cafe',
    'restaurantes-panaderia',
  ],
  salud: [
    'salud',
    'salud-dentistas',
    'salud-medicos',
    'salud-farmacia',
    'salud-optica',
    'salud-psicologia',
    'salud-kinesiologia',
    'salud-veterinaria',
  ],
  automotriz: [
    'automotriz',
    'automotriz-mecanica',
    'automotriz-lubricentro',
    'automotriz-electrico',
    'automotriz-lavado',
    'automotriz-repuestos',
  ],
  belleza: [
    'belleza',
    'belleza-peluqueria',
    'belleza-barberia',
    'belleza-manicure',
    'belleza-estetica',
  ],
  'servicios-negocio': [
    'servicios-negocio',
    'servicios-gasfiteria',
    'servicios-electricidad',
    'servicios-construccion',
    'servicios-jardineria',
    'servicios-mudanzas',
    'servicios-seguridad',
  ],
  'tecnologia-negocio': [
    'tecnologia-negocio',
    'tecnologia-reparacion-pc',
    'tecnologia-celulares',
    'tecnologia-redes',
    'tecnologia-diseno-web',
  ],
};

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeBusinessCategoryFilter(category) {
  const normalized = normalizeText(category);
  if (!normalized || normalized === 'all') return null;

  const categoryKey = BUSINESS_CATEGORY_ALIASES?.[normalized] || normalized;
  const keys = BUSINESS_CATEGORY_CHILDREN?.[categoryKey] || [categoryKey];

  return [...new Set(keys?.filter(Boolean))];
}

function collectBusinessCategoryKeys(business) {
  const categoryValues = [
    business?.category_key,
    typeof business?.category === 'string' ? business?.category : null,
    business?.category?.name_key,
    business?.category?.slug,
    business?.category?.key,
    business?.category?.name,
    typeof business?.rubro === 'string' ? business?.rubro : null,
    business?.rubro?.name_key,
    business?.rubro?.slug,
    business?.rubro?.key,
    business?.rubro?.name,
  ];

  [
    business?.categories,
    business?.rubros,
    business?.wa_rubros,
    business?.business_categories,
  ]?.forEach(items => {
    if (Array.isArray(items)) {
      items?.forEach(item => {
        if (typeof item === 'string') {
          categoryValues?.push(item);
          return;
        }
        categoryValues?.push(
          item?.category_key,
          item?.name_key,
          item?.slug,
          item?.key,
          item?.name,
          item?.category?.category_key,
          item?.category?.name_key,
          item?.category?.slug,
          item?.category?.key,
          item?.category?.name
        );
      });
    }
  });

  return categoryValues?.flatMap(value => {
    const normalized = normalizeText(value);
    if (!normalized) return [];
    return [normalized, BUSINESS_CATEGORY_ALIASES?.[normalized]]?.filter(Boolean);
  });
}

export function businessMatchesCategoryFilter(business, category) {
  const filterKeys = normalizeBusinessCategoryFilter(category);
  if (!filterKeys) return true;

  const businessKeys = collectBusinessCategoryKeys(business);
  return filterKeys?.some(key => businessKeys?.includes(key));
}

export const mapService = {
  async getBusinessesForMap({ search = '', category = '' } = {}) {
    try {
      let query = supabase
        ?.from('businesses')
        ?.select('id, name, category, category_key, address, phone, lat, lng, featured, verified')
        ?.not('lat', 'is', null);

      if (search?.trim()) {
        query = query?.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const normalized = (data || [])
        ?.filter(b => b?.lat && b?.lng)
        ?.filter(b => businessMatchesCategoryFilter(b, category));

      return { data: normalized, error: null };
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
