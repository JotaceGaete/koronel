import { supabase } from '../lib/supabase';

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'organizador';
}

export const organizerService = {
  async getByUser(userId) {
    try {
      const { data, error } = await supabase
        ?.from('event_organizers')
        ?.select('id, name, type, logo_url, business_id, verified, status')
        ?.eq('user_id', userId)
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async create({ userId, name, type, phone, whatsapp, email }) {
    try {
      const baseSlug = slugify(name);

      // Check for slug collision
      const { data: existing } = await supabase
        ?.from('event_organizers')
        ?.select('id')
        ?.eq('slug', baseSlug)
        ?.maybeSingle();

      const slug = existing
        ? `${baseSlug}-${Date.now().toString(36)}`
        : baseSlug;

      const { data, error } = await supabase
        ?.from('event_organizers')
        ?.insert({
          user_id: userId,
          name: name.trim(),
          slug,
          type: type || 'independent',
          phone: phone?.trim() || null,
          whatsapp: whatsapp?.trim() || null,
          email: email?.trim() || null,
          status: 'active',
        })
        ?.select('id, name, type, logo_url, business_id, verified, status')
        ?.single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

export const ORGANIZER_TYPE_LABELS = {
  independent: 'Independiente',
  business: 'Empresa / Negocio',
  institution: 'Institución',
  club: 'Club / Agrupación',
  foundation: 'Fundación',
  municipality: 'Municipalidad',
};
