import { supabase } from '../lib/supabase';

/**
 * Nombres de las RPCs consumidas por este servicio, centralizados a
 * propósito: PR-W1 (Walinka) y PR-K1 (Koronel) todavía no están
 * desplegadas. Si el contrato de alguna cambia antes de ese despliegue,
 * se ajusta en este único lugar.
 *
 * MY_CATALOGS vive en el proyecto Walinka (jotacegaete/saas, PR-W1) y se
 * llama directo porque Koronel y Walinka comparten el mismo proyecto
 * Supabase — no es una llamada de red a otro backend, es el mismo cliente
 * `supabase` de Koronel invocando una RPC que existe en la base compartida.
 * LINK_STATUS/REQUEST_LINK/REVOKE_LINK viven en el propio esquema de
 * Koronel (PR-K1).
 */
const RPC = {
  MY_CATALOGS: 'get_my_walinka_catalogs',
  LINK_STATUS: 'get_business_walinka_link_status',
  REQUEST_LINK: 'request_business_walinka_link',
  REVOKE_LINK: 'revoke_business_walinka_link',
};

export const WALINKA_LINK_STATUS = {
  none: 'none',
  connected: 'connected',
};

const WALINKA_ERROR_MESSAGES = {
  WALINKA_AUTH_REQUIRED: 'Debes iniciar sesión para continuar.',
  WALINKA_NOT_AUTHORIZED: 'No tienes permiso para esta acción.',
  KORONEL_BUSINESS_NOT_CLAIMED: 'Este negocio debe estar reclamado antes de vincular un catálogo.',
  WALINKA_CATALOG_NOT_OWNED: 'No encontramos ese catálogo asociado a tu cuenta.',
  WALINKA_CATALOG_INACTIVE: 'Ese catálogo de Walinka está inactivo.',
  WALINKA_LINK_ALREADY_ACTIVE: 'Este negocio ya tiene un catálogo Walinka vinculado.',
  WALINKA_CATALOG_LINKED_TO_ANOTHER_OWN_BUSINESS: 'Ese catálogo ya está vinculado a otro de tus negocios.',
  WALINKA_OWNERSHIP_CONFLICT: 'Ese catálogo ya está vinculado a otro negocio y no se puede conectar automáticamente.',
  WALINKA_LINK_NOT_FOUND: 'No hay ningún catálogo vinculado para revocar.',
};
const WALINKA_DEFAULT_ERROR_MESSAGE = 'Ocurrió un error. Intenta de nuevo.';

/** Traduce un error crudo de Postgres/Supabase a un código estable + mensaje en español. Nunca se muestra el texto crudo al usuario. */
export function mapWalinkaError(error) {
  const raw = error?.message || '';
  const code = Object.keys(WALINKA_ERROR_MESSAGES)?.find((c) => raw?.includes(c));
  return {
    code: code || 'WALINKA_UNKNOWN_ERROR',
    message: WALINKA_ERROR_MESSAGES?.[code] || WALINKA_DEFAULT_ERROR_MESSAGE,
  };
}

/** Normaliza una fila de get_my_walinka_catalogs (Walinka). public_url/uses_custom_domain llegan ya resueltos — no se tocan ni se reconstruyen. */
function normalizeCatalog(row) {
  if (!row) return null;
  return {
    id: row?.id,
    name: row?.name,
    slug: row?.slug ?? null,
    logoUrl: row?.logo_url ?? null,
    isActive: Boolean(row?.is_active),
    publicUrl: row?.public_url ?? null,
    usesCustomDomain: Boolean(row?.uses_custom_domain),
  };
}

/**
 * Normaliza una fila de get_business_walinka_link_status (Koronel, PR-K1).
 * Contrato ASUMIDO — PR-K1 todavía no está escrita ni desplegada. Se
 * documenta explícitamente en la entrega de este PR para que sea fácil de
 * ajustar si el contrato real termina siendo distinto.
 */
function normalizeLink(row) {
  if (!row) return null;
  return {
    koronelBusinessId: row?.koronel_business_id,
    walinkaBusinessId: row?.walinka_business_id,
    status: row?.connection_status || WALINKA_LINK_STATUS.none,
    source: row?.source ?? null,
    connectedAt: row?.connected_at ?? null,
    connectedBy: row?.connected_by ?? null,
    catalog: row?.walinka_business_id
      ? {
          name: row?.walinka_name ?? null,
          logoUrl: row?.walinka_logo_url ?? null,
          isActive: row?.walinka_is_active ?? null,
          publicUrl: row?.walinka_public_url ?? null,
          usesCustomDomain: Boolean(row?.walinka_uses_custom_domain),
        }
      : null,
  };
}

export const walinkaLinkService = {
  /** Lista los catálogos Walinka del usuario autenticado (RPC en el proyecto compartido, PR-W1). */
  async getMyCatalogs() {
    try {
      const { data, error } = await supabase?.rpc(RPC.MY_CATALOGS);
      if (error) throw error;
      return { data: (data || [])?.map(normalizeCatalog), error: null };
    } catch (error) {
      console.error('walinkaLinkService.getMyCatalogs error:', error);
      return { data: [], error: mapWalinkaError(error) };
    }
  },

  /** Vínculo vigente (si existe) para un negocio Koronel. */
  async getLinkStatus(koronelBusinessId) {
    if (!koronelBusinessId) return { data: null, error: null };
    try {
      const { data, error } = await supabase?.rpc(RPC.LINK_STATUS, {
        p_koronel_business_id: koronelBusinessId,
      });
      if (error) throw error;
      return { data: normalizeLink(data?.[0]), error: null };
    } catch (error) {
      console.error('walinkaLinkService.getLinkStatus error:', error);
      return { data: null, error: mapWalinkaError(error) };
    }
  },

  /** Vincula un catálogo Walinka ya elegido (por id, resuelto previamente vía getMyCatalogs) a un negocio Koronel. */
  async requestLink({ koronelBusinessId, walinkaBusinessId }) {
    try {
      const { data, error } = await supabase?.rpc(RPC.REQUEST_LINK, {
        p_koronel_business_id: koronelBusinessId,
        p_walinka_business_id: walinkaBusinessId,
      });
      if (error) throw error;
      return { data: normalizeLink(data?.[0]), error: null };
    } catch (error) {
      console.error('walinkaLinkService.requestLink error:', error);
      return { data: null, error: mapWalinkaError(error) };
    }
  },

  /** Revoca el vínculo vigente de un negocio Koronel (nunca hace DELETE del lado de datos — eso lo maneja la RPC). */
  async revokeLink(koronelBusinessId) {
    try {
      const { data, error } = await supabase?.rpc(RPC.REVOKE_LINK, {
        p_koronel_business_id: koronelBusinessId,
      });
      if (error) throw error;
      return { data: normalizeLink(data?.[0]), error: null };
    } catch (error) {
      console.error('walinkaLinkService.revokeLink error:', error);
      return { data: null, error: mapWalinkaError(error) };
    }
  },
};
