import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Logo from './Logo';
import { siteConfig } from '../config/siteConfig';

/**
 * PR-1 (config estática): Logo debe leer src/alt desde siteConfig.branding
 * en vez de tener los valores hardcodeados, sin cambiar el resultado.
 */
describe('Logo', () => {
  it('usa siteConfig.branding.logoPath y logoAlt para la imagen', () => {
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
});
