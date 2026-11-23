import React, { useEffect, useState } from 'react';
import Icon from 'components/AppIcon';
import { walinkaService } from '../../../services/walinkaService';

/**
 * Botón público hacia el catálogo Walinka vinculado.
 * No renderiza nada (ni espacio vacío) si no hay vínculo activo y válido.
 */
export default function WalinkaCatalogButton({ businessId }) {
  const [link, setLink] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLink(null);
    if (!businessId) return undefined;
    walinkaService.getPublicLink(businessId).then((result) => {
      if (!cancelled) setLink(result);
    });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  if (!link?.url) return null;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
      style={{ background: '#16a34a' }}
      data-testid="walinka-catalog-button"
    >
      <Icon name="ShoppingBag" size={18} color="white" />
      Ver catálogo y pedir por WhatsApp
    </a>
  );
}
