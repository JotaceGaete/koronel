import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Logo Koronel.cl. Usado en header, login, footer, etc.
 * @param {string} [className] - Clases para el contenedor del link
 * @param {string} [imgClassName] - Clases para la imagen
 * @param {'header'|'headerMobile'|'auth'|'footer'} [variant] - Tamaño según contexto
 * @param {function} [onClick] - Opcional (ej. cerrar menú móvil)
 */
export default function Logo({ className = '', imgClassName = '', variant = 'header', to = '/homepage', onClick }) {
  const heights = {
    header: 'h-8',
    headerMobile: 'h-7',
    auth: 'h-10',
    footer: 'h-7',
  };
  const h = heights[variant] || 'h-8';

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`inline-flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded ${className}`}
      aria-label="Ir al inicio"
    >
      <img
        src="/koronel-logo.png"
        alt="Koronel.cl"
        className={`object-contain object-left ${h} w-auto ${imgClassName}`}
        width={variant === 'auth' ? 180 : 140}
        height={variant === 'auth' ? 40 : 32}
      />
    </Link>
  );
}
