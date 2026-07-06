import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BusinessBottomSheet from './BusinessBottomSheet';

vi.mock('contexts/CityContext', () => ({
  useCity: () => ({ name: 'Coronel', siteName: 'Koronel' }),
}));

describe('BusinessBottomSheet nearby and catalog details', () => {
  it('shows distance and directions when the business has valid coordinates', () => {
    render(
      <MemoryRouter>
        <BusinessBottomSheet
          business={{
            id: 'business-1',
            name: 'Negocio con ubicación',
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
    expect(screen.getByRole('link', { name: /cómo llegar/i })).toHaveAttribute(
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
            name: 'Negocio sin ubicación',
            category: 'Comercio',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/^A \d/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /cómo llegar/i })).not.toBeInTheDocument();
  });

  it('shows Ver catálogo when the business has a Walinka catalog URL', () => {
    render(
      <MemoryRouter>
        <BusinessBottomSheet
          business={{
            id: 'business-3',
            name: 'Negocio con catálogo',
            category: 'Comercio',
            website: 'https://go.ventalink.app/catalogo/mi-negocio',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute(
      'href',
      'https://go.ventalink.app/catalogo/mi-negocio'
    );
    expect(screen.queryByRole('link', { name: /crea tu catálogo gratis/i })).not.toBeInTheDocument();
  });

  it('shows a discreet create catalog CTA when the business has no catalog URL', () => {
    render(
      <MemoryRouter>
        <BusinessBottomSheet
          business={{
            id: 'business-4',
            name: 'Negocio sin catálogo',
            category: 'Comercio',
            address: 'Centro',
            whatsapp: '+56 9 1234 5678',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    const cta = screen.getByRole('link', { name: /crea tu catálogo gratis/i });
    expect(cta).toHaveAttribute('href', expect.stringContaining('/business-registration?'));
    expect(cta).toHaveAttribute('href', expect.stringContaining('source=koronel'));
    expect(cta).toHaveAttribute('href', expect.stringContaining('koronel_business_id=business-4'));
  });

  it('does not break render when the catalog URL is invalid', () => {
    render(
      <MemoryRouter>
        <BusinessBottomSheet
          business={{
            id: 'business-5',
            name: 'Negocio con URL inválida',
            category: 'Comercio',
            catalog_url: 'no-es-url',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /ver catálogo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /crea tu catálogo gratis/i })).toBeInTheDocument();
  });
});
