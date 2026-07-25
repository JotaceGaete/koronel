import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

import Logo from './Logo';
import { CityProvider } from '../contexts/CityContext';
import { siteConfig } from '../config/siteConfig';

beforeEach(() => {
  mockEq.mockReset();
});

function renderLogo(props = {}) {
  return render(
    <MemoryRouter>
      <CityProvider>
        <Logo {...props} />
      </CityProvider>
    </MemoryRouter>
  );
}

/**
 * PR-1: Logo debe leer src/alt desde siteConfig.branding en vez de tener
 * los valores hardcodeados. PR-3: ahora los lee de la ciudad activa
 * (CityContext), con siteConfig como fallback explícito.
 */
describe('Logo', () => {
  it('sin CityProvider: usa siteConfig.branding.logoPath y logoAlt (valor por defecto del contexto)', () => {
    render(
      <MemoryRouter>
        <Logo />
      </MemoryRouter>
    );
    const img = screen.getByRole('img', { name: siteConfig?.branding?.logoAlt });
    expect(img).toHaveAttribute('src', siteConfig?.branding?.logoPath);
    expect(img).toHaveAttribute('alt', siteConfig?.branding?.logoAlt);
  });

  it('no altera el comportamiento existente de las props explícitas (variant, to)', () => {
    render(
      <MemoryRouter>
        <Logo variant="auth" to="/custom-path" />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: 'Ir al inicio' });
    expect(link).toHaveAttribute('href', '/custom-path');
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', '180');
    expect(img).toHaveAttribute('height', '40');
  });

  // PR-3: a partir de acá, CityProvider real (no useCity mockeado) — la
  // consulta a Supabase se controla mockeando lib/supabase.
  it('Provider real: tabla vacía — sin regresión, mismo logo de siempre (fallback)', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });
    renderLogo();
    const img = await screen.findByRole('img', { name: siteConfig?.branding?.logoAlt });
    expect(img).toHaveAttribute('src', siteConfig?.branding?.logoPath);
  });

  it('Provider real: usa logo_path/logo_alt de una ciudad activa distinta a Coronel, resuelta después del montaje', async () => {
    mockEq.mockResolvedValue({
      data: [{
        slug: 'chascomus',
        domains: ['localhost'],
        logo_path: '/chascomus-logo.png',
        logo_alt: 'Chascomús Local',
      }],
      error: null,
    });
    renderLogo();
    // En el primer render (antes de que resuelva la consulta) se ve el
    // fallback; findByRole espera hasta que el logo cambie.
    const img = await screen.findByRole('img', { name: 'Chascomús Local' });
    expect(img).toHaveAttribute('src', '/chascomus-logo.png');
  });

  it('Provider real: cae a siteConfig cuando logo_path/logo_alt de la ciudad resuelta son null', async () => {
    mockEq.mockResolvedValue({
      data: [{ slug: 'chascomus', domains: ['localhost'], logo_path: null, logo_alt: null }],
      error: null,
    });
    renderLogo();
    const img = await screen.findByRole('img', { name: siteConfig?.branding?.logoAlt });
    expect(img).toHaveAttribute('src', siteConfig?.branding?.logoPath);
  });

  it('Provider real: cae a siteConfig cuando la consulta a Supabase falla (resolutionStatus "error")', async () => {
    mockEq.mockRejectedValue(new Error('network down'));
    renderLogo();
    const img = await screen.findByRole('img', { name: siteConfig?.branding?.logoAlt });
    expect(img).toHaveAttribute('src', siteConfig?.branding?.logoPath);
  });
});
