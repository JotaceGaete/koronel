const WALINKA_BASE_URL = 'https://miralatienda.de/catalogo';
const ALLOWED_PROTOCOLS = ['https:'];

/**
 * Given raw input (slug or full URL), normalizes to a canonical catalog URL.
 * Returns null if input is empty or invalid.
 */
export function normalizeWalinkaCatalogInput(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // If it looks like a URL, validate and return as-is
  if (trimmed.includes('://') || trimmed.startsWith('//')) {
    const url = safeParseUrl(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
    if (!url || !ALLOWED_PROTOCOLS.includes(url.protocol)) return null;
    return url.href;
  }

  // Treat as slug — strip leading slashes and build URL
  const slug = trimmed.replace(/^\/+/, '');
  if (!slug) return null;
  return `${WALINKA_BASE_URL}/${slug}`;
}

/**
 * Returns the public catalog URL given stored slug and/or customUrl.
 * customUrl takes precedence over slug.
 */
export function getWalinkaCatalogUrl({ slug, customUrl } = {}) {
  if (customUrl) return customUrl;
  if (slug) return `${WALINKA_BASE_URL}/${slug}`;
  return null;
}

/**
 * Returns true if the URL is safe to use as an external catalog link.
 */
export function isValidWalinkaCatalogUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const parsed = safeParseUrl(url);
  if (!parsed) return false;
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return false;
  if (parsed.username || parsed.password) return false;
  return true;
}

function safeParseUrl(str) {
  try {
    return new URL(str);
  } catch {
    return null;
  }
}
