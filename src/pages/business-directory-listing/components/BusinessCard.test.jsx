import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BusinessCard from './BusinessCard';

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('contexts/CityContext', () => ({
  useCity: () => ({ name: 'Coronel' }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('BusinessCard Walinka CTA', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null });
  });

  it('shows Ver catalogo when the business has a valid Walinka catalog URL', () => {
    render(
      <MemoryRouter>
        <BusinessCard
          business={{
            id: 'business-card-1',
            name: 'Negocio con catalogo',
            category: 'Comercio',
            image: '/assets/images/no_image.png',
            website: 'https://go.ventalink.app/catalogo/negocio',
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /ver productos/i })).toHaveAttribute(
      'href',
      'https://go.ventalink.app/catalogo/negocio'
    );
  });

  it('does not show a public catalog CTA when a business has no catalog URL', () => {
    render(
      <MemoryRouter>
        <BusinessCard
          business={{
            id: 'business-card-2',
            name: 'Negocio sin catalogo',
            category: 'Comercio',
            image: '/assets/images/no_image.png',
            whatsapp: '+56 9 1234 5678',
          }}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /crear cat.logo walinka/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /recl.malo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ver productos/i })).not.toBeInTheDocument();
  });

  it('renders category objects as labels', () => {
    render(
      <MemoryRouter>
        <BusinessCard
          business={{
            id: 'business-card-category-object',
            name: 'Artesellos',
            category: {
              id: 'cat-1',
              name: 'Imprenta y grafica',
              name_key: 'imprenta-grafica',
              parent_id: 'parent-1',
              parent: { id: 'parent-1', name: 'Comercio local' },
            },
            image: '/assets/images/no_image.png',
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Imprenta y grafica')).toBeInTheDocument();
  });

  it('does not show create catalog CTA in public listing cards for claimed owners', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'owner-1' } });

    render(
      <MemoryRouter>
        <BusinessCard
          business={{
            id: 'business-card-3',
            name: 'Negocio propio',
            category: 'Comercio',
            image: '/assets/images/no_image.png',
            whatsapp: '+56 9 1234 5678',
            claimed: true,
            owner_id: 'owner-1',
          }}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /crear cat.logo walinka/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ver productos/i })).not.toBeInTheDocument();
  });
});
