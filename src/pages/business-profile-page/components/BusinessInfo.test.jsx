import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BusinessInfo from './BusinessInfo';

vi.mock('../../../contexts/CityContext', () => ({
  useCity: () => ({ name: 'Coronel' }),
}));

const defaultHandlers = {
  onCall: () => {},
  onWhatsApp: () => {},
  onDirections: () => {},
  onShare: () => {},
};

describe('BusinessInfo Walinka CTA', () => {
  it('shows Ver catálogo in the profile action buttons when connected', () => {
    render(
      <BusinessInfo
        business={{
          id: 'profile-1',
          name: 'Negocio con catálogo',
          category: 'Comercio',
          address: 'Centro',
          rating: 4,
          reviewCount: 2,
          website: 'https://go.ventalink.app/catalogo/perfil',
        }}
        {...defaultHandlers}
      />
    );

    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute(
      'href',
      'https://go.ventalink.app/catalogo/perfil'
    );
  });

  it('shows Crear catálogo Walinka in the profile action buttons when not connected', () => {
    render(
      <BusinessInfo
        business={{
          id: 'profile-2',
          name: 'Negocio sin catálogo',
          category: 'Comercio',
          address: 'Centro',
          rating: 4,
          reviewCount: 2,
        }}
        {...defaultHandlers}
      />
    );

    const cta = screen.getByRole('link', { name: /crear catálogo walinka/i });
    expect(cta).toHaveAttribute('href', expect.stringContaining('/business-registration?'));
    expect(cta).toHaveAttribute('href', expect.stringContaining('koronel_business_id=profile-2'));
  });
});
