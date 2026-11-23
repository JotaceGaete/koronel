import { supabase } from '../lib/supabase';

// Página informativa oficial de Walinka (desde ahí se accede a la plataforma).
// No usar el origen técnico de catálogos (miralatienda.de). Configurable por entorno.
export const WALINKA_INFO_URL =
  import.meta.env?.VITE_WALINKA_INFO_URL || 'https://walinka.com/';

const ERROR_MESSAGES = {
  WALINKA_AUTH_REQUIRED: 'Debes iniciar sesión para gestionar tu catálogo.',
  WALINKA_NOT_AUTHORIZED: 'No tienes permiso para gestionar este negocio.',
  WALINKA_CATALOG_REQUIRED: 'Selecciona un catálogo.',
  KORONEL_BUSINESS_NOT_CLAIMED: 'Este negocio no está registrado a tu nombre en Koronel.',
  WALINKA_CATALOG_NOT_OWNED: 'Ese catálogo Walinka no pertenece a tu cuenta.',
  WALINKA_CATALOG_INACTIVE: 'Ese catálogo Walinka no está activo.',
  WALINKA_LINK_ALREADY_ACTIVE: 'Este negocio ya tiene un catálogo vinculado. Desvincúlalo primero.',
  WALINKA_CATALOG_LINKED_TO_ANOTHER_OWN_BUSINESS:
    'Ese catálogo ya está vinculado a otro de tus negocios. Desvincúlalo allí primero.',
  WALINKA_OWNERSHIP_CONFLICT: 'Ese catálogo no está disponible para vincular.',
  WALINKA_LINK_NOT_FOUND: 'Este negocio no tiene un catálogo vinculado.',
};

export function walinkaErrorMessage(error) {
  const raw = error?.message || '';
  const code = Object.keys(ERROR_MESSAGES).find((k) => raw.includes(k));
  return code ? ERROR_MESSAGES[code] : 'No se pudo completar la operación. Intenta de nuevo.';
}

/**
 * Acepta solo URLs https absolutas, sin credenciales ni puerto. Defensa adicional:
 * la URL ya viene calculada por el servidor (wa_resolve_catalog_url).
 */
export function safeCatalogUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password || url.port) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

export const walinkaService = {
  /** Catálogos Walinka del usuario autenticado, solo los activos y con URL pública válida. */
  async getMyCatalogs() {
    const { data, error } = await supabase.rpc('get_my_walinka_catalogs');
    if (error) return { data: [], error };
    const catalogs = (data || [])
      .filter((c) => c?.is_active === true && safeCatalogUrl(c?.public_url))
      .map((c) => ({ ...c, public_url: safeCatalogUrl(c.public_url) }));
    return { data: catalogs, error: null };
  },

  /** Estado del vínculo activo de un negocio propio (null si no hay). */
  async getLinkStatus(koronelBusinessId) {
    const { data, error } = await supabase.rpc('get_business_walinka_link_status', {
      p_koronel_business_id: koronelBusinessId,
    });
    if (error) return { data: null, error };
    const row = firstRow(data);
    if (!row) return { data: null, error: null };
    return {
      data: {
        ...row,
        walinka_public_url: row.walinka_is_active ? safeCatalogUrl(row.walinka_public_url) : null,
      },
      error: null,
    };
  },

  async link(koronelBusinessId, walinkaBusinessId) {
    const { data, error } = await supabase.rpc('request_business_walinka_link', {
      p_koronel_business_id: koronelBusinessId,
      p_walinka_business_id: walinkaBusinessId,
    });
    return { data: firstRow(data), error };
  },

  async unlink(koronelBusinessId) {
    const { data, error } = await supabase.rpc('revoke_business_walinka_link', {
      p_koronel_business_id: koronelBusinessId,
    });
    return { data: firstRow(data), error };
  },

  /** Ficha pública: nombre y URL del catálogo vinculado, o null. Nunca lanza. */
  async getPublicLink(koronelBusinessId) {
    if (!koronelBusinessId) return null;
    try {
      const { data, error } = await supabase.rpc('get_public_walinka_link', {
        p_koronel_business_id: koronelBusinessId,
      });
      if (error) return null;
      const row = firstRow(data);
      const url = safeCatalogUrl(row?.public_url);
      return url ? { name: row?.walinka_name || null, url } : null;
    } catch {
      return null;
    }
  },
};
