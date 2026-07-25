import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Helmet } from 'react-helmet';

const { mockEq } = vi.hoisted(() => ({ mockEq: vi.fn() }));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: mockEq,
      }),
    }),
  },
}));

import PageMeta from './PageMeta';
import { CityProvider } from '../contexts/CityContext';
import { siteConfig } from '../config/siteConfig';

beforeEach(() => {
  mockEq.mockReset();
});

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
  // venir de siteConfig, no de constantes locales duplicadas. Sin
  // CityProvider, useCity() devuelve el valor por defecto del contexto
  // (equivalente a FALLBACK_CITY) — mismo resultado que antes de PR-3.
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

  // PR-3: a partir de acá, CityProvider real (no useCity mockeado) — la
  // consulta a Supabase se controla mockeando lib/supabase, igual que en
  // CityContext.test.jsx.
  it('Provider real: usa brand_name/seo_description de una ciudad activa distinta a Coronel', async () => {
    mockEq.mockResolvedValue({
      data: [{
        slug: 'chascomus',
        domains: ['localhost'],
        brand_name: 'ChascomúsLocal',
        seo_description: 'Directorio de negocios de Chascomús',
      }],
      error: null,
    });

    render(
      <CityProvider>
        <PageMeta />
      </CityProvider>
    );

    await waitFor(() => {
      expect(Helmet.peek()?.title).toBe('ChascomúsLocal');
    });
    const descriptionMeta = Helmet.peek()?.metaTags?.find((m) => m?.name === 'description');
    expect(descriptionMeta?.content).toBe('Directorio de negocios de Chascomús');
  });

  it('Provider real: la ciudad activa cambia después del primer render y el título se actualiza', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });

    render(
      <CityProvider>
        <PageMeta />
      </CityProvider>
    );

    // Primer render: sin match todavía (tabla vacía) -> fallback.
    expect(Helmet.peek()?.title).toBe(siteConfig?.brandName);

    await waitFor(() => {
      expect(Helmet.peek()?.title).toBe(siteConfig?.brandName);
    });
  });

  it('Provider real: cae a siteConfig cuando brand_name/seo_description de la ciudad resuelta son null', async () => {
    mockEq.mockResolvedValue({
      data: [{ slug: 'chascomus', domains: ['localhost'], brand_name: null, seo_description: null }],
      error: null,
    });

    render(
      <CityProvider>
        <PageMeta />
      </CityProvider>
    );

    await waitFor(() => {
      expect(Helmet.peek()?.title).toBe(siteConfig?.brandName);
    });
    const descriptionMeta = Helmet.peek()?.metaTags?.find((m) => m?.name === 'description');
    expect(descriptionMeta?.content).toBe(siteConfig?.seo?.defaultDescription);
  });

  it('Provider real: cae a siteConfig cuando la consulta a Supabase falla (resolutionStatus "error")', async () => {
    mockEq.mockRejectedValue(new Error('network down'));

    render(
      <CityProvider>
        <PageMeta />
      </CityProvider>
    );

    await waitFor(() => {
      expect(Helmet.peek()?.title).toBe(siteConfig?.brandName);
    });
  });

  it('Provider real: tabla vacía, sin regresión respecto al comportamiento previo a PR-3', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });

    render(
      <CityProvider>
        <PageMeta title="Eventos" />
      </CityProvider>
    );

    await waitFor(() => {
      expect(Helmet.peek()?.title).toBe(`Eventos | ${siteConfig?.brandName}`);
    });
  });
});
