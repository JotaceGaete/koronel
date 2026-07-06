import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BusinessInfo from './BusinessInfo';

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('../../../contexts/CityContext', () => ({
  useCity: () => ({ name: 'Coronel' }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const defaultHandlers = {
  onCall: () => {},
  onWhatsApp: () => {},
  onDirections: () => {},
  onShare: () => {},
};

describe('BusinessInfo Walinka CTA', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null });
  });

  it('shows Ver catalogo in the profile action buttons when connected', () => {
    render(
      <BusinessInfo
        business={{
          id: 'profile-1',
          name: 'Negocio con catalogo',
          category: 'Comercio',
          address: 'Centro',
          rating: 4,
          reviewCount: 2,
          website: 'https://go.ventalink.app/catalogo/perfil',
        }}
        {...defaultHandlers}
      />
    );

    expect(screen.getByRole('link', { name: /ver cat.logo/i })).toHaveAttribute(
      'href',
      'https://go.ventalink.app/catalogo/perfil'
    );
  });

  it('shows claim CTA in the profile action buttons for public users', () => {
    render(
      <BusinessInfo
        business={{
          id: 'profile-2',
          name: 'Negocio sin catalogo',
          category: 'Comercio',
          address: 'Centro',
          rating: 4,
          reviewCount: 2,
        }}
        {...defaultHandlers}
      />
    );

    expect(screen.queryByRole('link', { name: /crear cat.logo walinka/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /recl.malo/i })).toHaveAttribute(
      'href',
      '/business-profile-page?id=profile-2'
    );
  });

  it('shows Crear catalogo Walinka only for the claimed owner', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'owner-1' } });

    render(
      <BusinessInfo
        business={{
          id: 'profile-3',
          name: 'Negocio propio',
          category: 'Comercio',
          address: 'Centro',
          rating: 4,
          reviewCount: 2,
          claimed: true,
          owner_id: 'owner-1',
        }}
        {...defaultHandlers}
      />
    );

    const cta = screen.getByRole('link', { name: /crear cat.logo walinka/i });
    expect(cta).toHaveAttribute('href', expect.stringContaining('/business-registration?'));
  });
});
