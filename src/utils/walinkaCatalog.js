export const WALINKA_APP_URL =
  import.meta?.env?.VITE_WALINKA_APP_URL || 'https://go.ventalink.app';

const WALINKA_ALLOWED_HOSTS = [
  'ventalink.app',
  'walinka.app',
  'walinka.cl',
];

export function isValidUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isWalinkaCatalogUrl(value) {
  if (!isValidUrl(value)) return false;

  const { hostname } = new URL(value.trim());
  return WALINKA_ALLOWED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function getBusinessCatalogUrl(business = {}) {
  const candidate = business?.catalog_url || business?.catalogUrl || business?.website;
  return isWalinkaCatalogUrl(candidate) ? candidate.trim() : null;
}

export function buildWalinkaCreateCatalogUrl(business = {}) {
  const params = {
    source: 'koronel',
    koronel_business_id: business?.id,
    name: business?.name,
    whatsapp: business?.whatsapp,
    address: business?.address,
    city: business?.city,
    category: business?.category || business?.category_key,
  };

  const query = Object.entries(params)
    .filter(([, value]) => value != null && String(value).trim())
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value).trim())}`)
    .join('&');

  return `${WALINKA_APP_URL.replace(/\/+$/, '')}/business-registration?${query}`;
}
