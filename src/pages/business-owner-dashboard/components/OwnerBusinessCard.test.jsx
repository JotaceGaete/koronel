import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OwnerBusinessCard from './OwnerBusinessCard';

vi.mock('../../../services/businessService', () => ({
  businessService: {
    getImageUrl: (path) => path,
  },
}));

const business = {
  id: 'koronel-business-1',
  name: 'Negocio Local',
  status: 'published',
  category_key: 'comercio',
  address: 'Centro',
  business_images: [],
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <OwnerBusinessCard business={business} onEdit={() => {}} {...props} />
    </MemoryRouter>
  );
}

describe('OwnerBusinessCard Walinka link status', () => {
  it('shows Sin catálogo and fallback CTA when there is no link', () => {
    renderCard();

    expect(screen.getByText('Sin catálogo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /crear catálogo walinka/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/business-registration?')
    );
  });

  it('shows Pendiente and continue CTA for pending links', () => {
    renderCard({
      walinkaLink: {
        status: 'pending',
        koronelBusinessId: business.id,
      },
    });

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continuar en walinka/i })).toBeInTheDocument();
  });

  it('keeps existing catalog URL as a visible fallback CTA', () => {
    renderCard({
      business: {
        ...business,
        website: 'https://go.ventalink.app/catalogo/negocio-local',
      },
    });

    expect(screen.getByText(/sin cat.logo/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver cat.logo/i })).toHaveAttribute(
      'href',
      'https://go.ventalink.app/catalogo/negocio-local'
    );
  });

  it('shows Conectado without create CTA for connected links', () => {
    renderCard({
      walinkaLink: {
        status: 'connected',
        koronelBusinessId: business.id,
        walinkaBusinessId: 'walinka-business-1',
      },
    });

    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /crear catálogo walinka/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /continuar en walinka/i })).not.toBeInTheDocument();
  });
});
