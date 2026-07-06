import React from 'react';
import { Helmet } from 'react-helmet';
import { useCity } from '../contexts/CityContext';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

/**
 * SEO por página: título, descripción y Open Graph.
 * Usar en cada página para mejor indexación y preview en redes.
 */
const resolveAbsolute = (value) => (value?.startsWith('http') ? value : `${BASE_URL}${value}`);

export default function PageMeta({ title, description, image, path }) {
  const CITY_CONFIG = useCity();
  const SITE_NAME = CITY_CONFIG.siteName;
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const desc = description || CITY_CONFIG.siteDescription;
  const url = path ? `${BASE_URL}${path}` : (typeof window !== 'undefined' ? window.location.href : '');
  const faviconHref = CITY_CONFIG.faviconUrl || '/favicon.ico';
  const ogImage = image
    ? resolveAbsolute(image)
    : CITY_CONFIG.logoUrl
      ? resolveAbsolute(CITY_CONFIG.logoUrl)
      : `${BASE_URL}/favicon.ico`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="icon" href={faviconHref} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
    </Helmet>
  );
}
