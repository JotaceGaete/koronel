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
    const url = new URL(normalizeCatalogUrl(value));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function normalizeCatalogUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isWalinkaCatalogUrl(value) {
  if (!isValidUrl(value)) return false;

  const { hostname } = new URL(normalizeCatalogUrl(value));
  return WALINKA_ALLOWED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function getBusinessCatalogUrl(business = {}) {
  const candidate = business?.catalog_url || business?.catalogUrl || business?.website;
  return isWalinkaCatalogUrl(candidate) ? normalizeCatalogUrl(candidate) : null;
}

export function isBusinessOwner(business = {}, user = null) {
  const ownerId = business?.owner_id || business?.ownerId;
  return Boolean(ownerId && user?.id && ownerId === user.id);
}

export function canCreateWalinkaCatalog(business = {}, user = null) {
  return Boolean(business?.claimed === true && isBusinessOwner(business, user));
}

export function buildBusinessClaimUrl(business = {}) {
  const id = business?.id ? encodeURIComponent(String(business.id)) : '';
  return `/business-profile-page${id ? `?id=${id}` : ''}`;
}

export function buildWalinkaRegisterUrl() {
  return `${WALINKA_APP_URL.replace(/\/+$/, '')}/register`;
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
