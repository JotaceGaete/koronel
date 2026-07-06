import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BusinessBottomSheet from './BusinessBottomSheet';

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('contexts/CityContext', () => ({
  useCity: () => ({ name: 'Coronel', siteName: 'Koronel' }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('BusinessBottomSheet nearby and catalog details', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null });
  });

  it('shows distance and directions when the business has valid coordinates', () => {
    render(
      <MemoryRouter>
        <BusinessBottomSheet
          business={{
            id: 'business-1',
            name: 'Negocio con ubicacion',
            category: 'Comercio',
            lat: -37.0167,
            lng: -73.1333,
            distanceLabel: 'A 150 m',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('A 150 m')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /c.mo llegar/i })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=-37.0167,-73.1333'
    );
  });

  it('does not show distance or directions when the business has no lat/lng', () => {
    render(
      <MemoryRouter>
        <BusinessBottomSheet
          business={{
            id: 'business-2',
            name: 'Negocio sin ubicacion',
            category: 'Comercio',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/^A \d/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /c.mo llegar/i })).not.toBeInTheDocument();
  });

  it('shows Ver catalogo when the business has a Walinka catalog URL', () => {
    render(
      <MemoryRouter>
        <BusinessBottomSheet
          business={{
            id: 'business-3',
            name: 'Negocio con catalogo',
            category: 'Comercio',
            website: 'https://go.ventalink.app/catalogo/mi-negocio',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /ver cat.logo/i })).toHaveAttribute(
      'href',
      'https://go.ventalink.app/catalogo/mi-negocio'
    );
    expect(screen.queryByRole('link', { name: /crear/i })).not.toBeInTheDocument();
  });

  it('shows claim CTA for public users when the business has no catalog URL', () => {
    render(
      <MemoryRouter>
        <BusinessBottomSheet
          business={{
            id: 'business-4',
            name: 'Negocio sin catalogo',
            category: 'Comercio',
            address: 'Centro',
            whatsapp: '+56 9 1234 5678',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /crea tu cat.logo gratis/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /recl.malo/i })).toHaveAttribute(
      'href',
      '/business-profile-page?id=business-4'
    );
  });

  it('shows create catalog CTA only for the claimed owner', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'owner-1' } });

    render(
      <MemoryRouter>
        <BusinessBottomSheet
          business={{
            id: 'business-5',
            name: 'Negocio propio',
            category: 'Comercio',
            address: 'Centro',
            whatsapp: '+56 9 1234 5678',
            claimed: true,
            owner_id: 'owner-1',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    const cta = screen.getByRole('link', { name: /crea tu cat.logo gratis/i });
    expect(cta).toHaveAttribute('href', expect.stringContaining('/business-registration?'));
  });

  it('does not break render when the catalog URL is invalid', () => {
    render(
      <MemoryRouter>
        <BusinessBottomSheet
          business={{
            id: 'business-6',
            name: 'Negocio con URL invalida',
            category: 'Comercio',
            catalog_url: 'no-es-url',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /ver cat.logo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /recl.malo/i })).toBeInTheDocument();
  });
});
