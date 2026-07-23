export const WALINKA_APP_URL =
  import.meta?.env?.VITE_WALINKA_APP_URL || 'https://go.ventalink.app';

/**
 * Único uso de este archivo: el botón "Crear catálogo gratis" cuando el
 * dueño todavía no tiene ningún catálogo Walinka. Koronel nunca construye
 * ni reconstruye la URL pública de un catálogo (dominio + slug, dominio
 * propio, etc.) — esa resolución vive exclusivamente del lado Walinka
 * (wa_resolve_catalog_url / get_my_walinka_catalogs /
 * get_walinka_catalog_public_info) y llega ya resuelta en `public_url`.
 */
export function buildWalinkaRegisterUrl() {
  return `${WALINKA_APP_URL.replace(/\/+$/, '')}/register`;
}
