import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

import { CityProvider, useCity, resolveCityForHostname, FALLBACK_CITY } from './CityContext';
import { siteConfig } from '../config/siteConfig';

beforeEach(() => {
  mockEq.mockReset();
});

const CORONEL_DOMAINS = ['koronel.cl', 'www.koronel.cl', 'beta.koronel.cl'];

describe('resolveCityForHostname (función pura)', () => {
  const cities = [
    { slug: 'coronel', domains: CORONEL_DOMAINS },
    { slug: 'chascomus', domains: ['chascomus.example.com'] },
  ];

  it('koronel.cl coincide con Coronel', () => {
    expect(resolveCityForHostname('koronel.cl', cities)?.slug).toBe('coronel');
  });

  it('www.koronel.cl coincide con Coronel', () => {
    expect(resolveCityForHostname('www.koronel.cl', cities)?.slug).toBe('coronel');
  });

  it('beta.koronel.cl coincide con Coronel', () => {
    expect(resolveCityForHostname('beta.koronel.cl', cities)?.slug).toBe('coronel');
  });

  it('ignora diferencias de mayúsculas/minúsculas en el hostname recibido y en los dominios guardados', () => {
    expect(resolveCityForHostname('KORONEL.CL', cities)?.slug).toBe('coronel');
    expect(resolveCityForHostname('Www.Koronel.Cl', cities)?.slug).toBe('coronel');
    const upperCaseStored = [{ slug: 'coronel', domains: ['KORONEL.CL'] }];
    expect(resolveCityForHostname('koronel.cl', upperCaseStored)?.slug).toBe('coronel');
  });

  it('ignora un punto final en el hostname (FQDN trailing dot)', () => {
    expect(resolveCityForHostname('koronel.cl.', cities)?.slug).toBe('coronel');
  });

  it('devuelve null para un dominio desconocido', () => {
    expect(resolveCityForHostname('otro-dominio.com', cities)).toBeNull();
  });

  it('devuelve null con hostname vacío/null/no-string o cities no-array, sin lanzar', () => {
    expect(resolveCityForHostname('', cities)).toBeNull();
    expect(resolveCityForHostname(null, cities)).toBeNull();
    expect(resolveCityForHostname(undefined, cities)).toBeNull();
    expect(resolveCityForHostname(123, cities)).toBeNull();
    expect(resolveCityForHostname('koronel.cl', null)).toBeNull();
    expect(resolveCityForHostname('koronel.cl', undefined)).toBeNull();
  });

  it('ignora filas sin domains, o con entradas no-string dentro de domains, sin lanzar', () => {
    const withBadRows = [
      { slug: 'sin-dominios' },
      { slug: 'dominio-invalido', domains: [null, 42, undefined] },
      ...cities,
    ];
    expect(resolveCityForHostname('koronel.cl', withBadRows)?.slug).toBe('coronel');
  });
});

function CityProbe() {
  const { city, loading, resolutionStatus } = useCity();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="slug">{city?.slug}</span>
      <span data-testid="status">{resolutionStatus}</span>
    </div>
  );
}

describe('CityProvider', () => {
  it('tabla vacía: FALLBACK_CITY con resolutionStatus "fallback"', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });
    render(
      <CityProvider>
        <CityProbe />
      </CityProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading')?.textContent).toBe('false'));
    expect(screen.getByTestId('slug')?.textContent).toBe(FALLBACK_CITY?.slug);
    expect(screen.getByTestId('status')?.textContent).toBe('fallback');
    expect(FALLBACK_CITY?.brand_name).toBe(siteConfig?.brandName);
  });

  it('hay filas pero ninguna coincide con el hostname actual: FALLBACK_CITY con resolutionStatus "fallback"', async () => {
    mockEq.mockResolvedValue({
      data: [{ slug: 'otra-ciudad', domains: ['otra-ciudad.example.com'] }],
      error: null,
    });
    render(
      <CityProvider>
        <CityProbe />
      </CityProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading')?.textContent).toBe('false'));
    expect(screen.getByTestId('slug')?.textContent).toBe('coronel');
    expect(screen.getByTestId('status')?.textContent).toBe('fallback');
  });

  it('hay match con el hostname actual (jsdom: localhost): ciudad resuelta con resolutionStatus "resolved"', async () => {
    mockEq.mockResolvedValue({
      data: [
        { slug: 'coronel-real', domains: ['localhost'] },
        { slug: 'otra-ciudad', domains: ['otra-ciudad.example.com'] },
      ],
      error: null,
    });
    render(
      <CityProvider>
        <CityProbe />
      </CityProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading')?.textContent).toBe('false'));
    expect(screen.getByTestId('slug')?.textContent).toBe('coronel-real');
    expect(screen.getByTestId('status')?.textContent).toBe('resolved');
  });

  it('la consulta a Supabase falla (excepción): FALLBACK_CITY con resolutionStatus "error"', async () => {
    mockEq.mockRejectedValue(new Error('network down'));
    render(
      <CityProvider>
        <CityProbe />
      </CityProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading')?.textContent).toBe('false'));
    expect(screen.getByTestId('slug')?.textContent).toBe('coronel');
    expect(screen.getByTestId('status')?.textContent).toBe('error');
  });

  it('la consulta a Supabase responde con error (no excepción): FALLBACK_CITY con resolutionStatus "error"', async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });
    render(
      <CityProvider>
        <CityProbe />
      </CityProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading')?.textContent).toBe('false'));
    expect(screen.getByTestId('slug')?.textContent).toBe('coronel');
    expect(screen.getByTestId('status')?.textContent).toBe('error');
  });
});
