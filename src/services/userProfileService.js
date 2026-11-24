import { supabase } from '../lib/supabase';

// email y phone de user_profiles ya no son legibles con select/embed (permisos por
// columna). Solo un admin puede obtenerlos, mediante la RPC admin_get_user_contacts.

export const ADMIN_CONTACTS_ERROR_EVENT = 'koronel:admin-contacts-error';

// Un fallo de la RPC no debe pasar en silencio: el panel admin perdería los emails sin
// que nadie lo note. Se registra en consola con un prefijo fijo (fácil de buscar) y se
// emite un evento que AdminDashboard muestra como aviso visible.
function reportContactsError(error) {
  const detail = {
    code: error?.code || 'unknown',
    message: error?.message || String(error),
  };
  console.error('[admin-contacts] admin_get_user_contacts falló', detail);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(ADMIN_CONTACTS_ERROR_EVENT, { detail }));
  }
}

/**
 * Añade email y phone al perfil embebido en cada fila (row[key]), que debe incluir `id`.
 * Si la RPC falla devuelve las filas sin contactos (la lista sigue usable), pero lo
 * informa con reportContactsError.
 */
export async function attachUserContacts(rows, key) {
  const list = Array.isArray(rows) ? rows : [];
  const ids = [...new Set(list.map((r) => r?.[key]?.id).filter(Boolean))];
  if (ids.length === 0) return list;
  const { data, error } = await supabase.rpc('admin_get_user_contacts', { p_user_ids: ids });
  if (error || !Array.isArray(data)) {
    reportContactsError(error || new Error('Respuesta inesperada de admin_get_user_contacts'));
    return list;
  }
  const byId = new Map(data.map((c) => [c.id, c]));
  return list.map((r) => {
    const profile = r?.[key];
    const contact = profile?.id ? byId.get(profile.id) : null;
    if (!contact) return r;
    return { ...r, [key]: { ...profile, email: contact.email, phone: contact.phone } };
  });
}

// El perfil propio (con email, phone, location, role) se lee con la RPC get_my_profile,
// porque anon/authenticated solo pueden leer columnas públicas de user_profiles.
// Respaldo a select('*') mientras la RPC no exista en la base (PGRST202 / 42883).
export async function fetchOwnProfile(userId) {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (!error) return { data: Array.isArray(data) ? data[0] ?? null : data, error: null };
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    return supabase.from('user_profiles')?.select('*')?.eq('id', userId)?.single();
  }
  return { data: null, error };
}
