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
  it('shows Sin catalogo and the create catalog card when there is no link', () => {
    renderCard();

    expect(screen.getByText('Sin catálogo')).toBeInTheDocument();
    expect(screen.getByText(/crea tu catálogo online/i)).toBeInTheDocument();
    expect(screen.getByText(/muestra productos, precios y fotos/i)).toBeInTheDocument();
    expect(screen.getByText(/comparte tu catálogo por whatsapp/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /crear catálogo gratis/i })).toHaveAttribute(
      'href',
      'https://go.ventalink.app/register'
    );
  });

  it('shows Pendiente and keeps the create catalog card for pending links without URL', () => {
    renderCard({
      walinkaLink: {
        status: 'pending',
        koronelBusinessId: business.id,
      },
    });

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /crear catálogo gratis/i })).toBeInTheDocument();
  });

  it('keeps existing catalog URL as a visible catalog card', () => {
    renderCard({
      business: {
        ...business,
        website: 'https://go.ventalink.app/catalogo/negocio-local',
      },
    });

    expect(screen.getByText(/sin catálogo/i)).toBeInTheDocument();
    expect(screen.getByText(/catálogo walinka conectado/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute(
      'href',
      'https://go.ventalink.app/catalogo/negocio-local'
    );
    expect(screen.getByRole('button', { name: /editar url/i })).toBeInTheDocument();
  });

  it('shows Conectado and the create catalog card if the connected link has no URL yet', () => {
    renderCard({
      walinkaLink: {
        status: 'connected',
        koronelBusinessId: business.id,
        walinkaBusinessId: 'walinka-business-1',
      },
    });

    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /crear catálogo gratis/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /continuar en walinka/i })).not.toBeInTheDocument();
  });
});
