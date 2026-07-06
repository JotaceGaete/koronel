import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BusinessBottomSheet from './BusinessBottomSheet';

vi.mock('contexts/CityContext', () => ({
  useCity: () => ({ siteName: 'Koronel' }),
}));

describe('BusinessBottomSheet nearby details', () => {
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
});
