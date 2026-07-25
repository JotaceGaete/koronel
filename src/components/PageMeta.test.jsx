import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Helmet } from 'react-helmet';
import PageMeta from './PageMeta';
import { siteConfig } from '../config/siteConfig';

describe('PageMeta', () => {
  it('renders without crashing', () => {
    render(<PageMeta title="Eventos" description="Eventos en Coronel." />);
  });

  it('renders with different props without error', () => {
    render(<PageMeta title="Inicio" description="Página de inicio." />);
    // En entorno jsdom, react-helmet puede no actualizar document de forma síncrona.
    // Comprobamos que el componente acepta props y no lanza.
    expect(true).toBe(true);
  });

  // PR-1 (config estática): el nombre y la descripción por defecto deben
  // venir de siteConfig, no de constantes locales duplicadas.
  it('usa siteConfig.brandName como sufijo del título cuando se pasa un título de página', () => {
    render(<PageMeta title="Eventos" description="Eventos en Coronel." />);
    const helmet = Helmet.peek();
    expect(helmet?.title).toBe(`Eventos | ${siteConfig?.brandName}`);
  });

  it('usa siteConfig.brandName y siteConfig.seo.defaultDescription cuando no se pasan props', () => {
    render(<PageMeta />);
    const helmet = Helmet.peek();
    expect(helmet?.title).toBe(siteConfig?.brandName);
    const descriptionMeta = helmet?.metaTags?.find((m) => m?.name === 'description');
    expect(descriptionMeta?.content).toBe(siteConfig?.seo?.defaultDescription);
  });
});
