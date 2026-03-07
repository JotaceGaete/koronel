import React from 'react';
import { Helmet } from 'react-helmet';

const SITE_NAME = 'CoronelLocal';
const DEFAULT_DESCRIPTION = 'Directorio de negocios, clasificados, eventos, empleos y comunidad en Coronel y la región.';
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

/**
 * SEO por página: título, descripción y Open Graph.
 * Usar en cada página para mejor indexación y preview en redes.
 */
export default function PageMeta({ title, description, image, path }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const desc = description || DEFAULT_DESCRIPTION;
  const url = path ? `${BASE_URL}${path}` : (typeof window !== 'undefined' ? window.location.href : '');
  const ogImage = image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : `${BASE_URL}/favicon.ico`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
    </Helmet>
  );
}
