import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BusinessCard from './BusinessCard';

vi.mock('contexts/CityContext', () => ({
  useCity: () => ({ name: 'Coronel' }),
}));

describe('BusinessCard Walinka CTA', () => {
  it('shows Ver catálogo when the business has a valid Walinka catalog URL', () => {
    render(
      <MemoryRouter>
        <BusinessCard
          business={{
            id: 'business-card-1',
            name: 'Negocio con catálogo',
            category: 'Comercio',
            image: '/assets/images/no_image.png',
            website: 'https://go.ventalink.app/catalogo/negocio',
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute(
      'href',
      'https://go.ventalink.app/catalogo/negocio'
    );
  });

  it('shows Crear catálogo Walinka when the business has no catalog URL', () => {
    render(
      <MemoryRouter>
        <BusinessCard
          business={{
            id: 'business-card-2',
            name: 'Negocio sin catálogo',
            category: 'Comercio',
            image: '/assets/images/no_image.png',
            whatsapp: '+56 9 1234 5678',
          }}
        />
      </MemoryRouter>
    );

    const cta = screen.getByRole('link', { name: /crear catálogo walinka/i });
    expect(cta).toHaveAttribute('href', expect.stringContaining('/business-registration?'));
    expect(cta).toHaveAttribute('href', expect.stringContaining('source=koronel'));
  });
});
