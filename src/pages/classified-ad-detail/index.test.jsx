import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

const mockUseCity = vi.fn();
vi.mock('../../contexts/CityContext', () => ({
  useCity: () => mockUseCity(),
}));

vi.mock('../../services/messageService', () => ({
  messageService: {
    getAdOwner: vi.fn(),
    formatLastSeen: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

vi.mock('../../services/adService', () => ({
  adService: {
    getById: vi.fn(),
    formatAd: vi.fn(),
    incrementViews: vi.fn(),
    getByCategory: vi.fn(),
    getImageUrl: vi.fn(),
  },
}));

import { adService } from '../../services/adService';
import { messageService } from '../../services/messageService';
import ClassifiedAdDetail from './index';

const baseAd = {
  id: 'oficio-1',
  listing_type: 'oficio',
  title: 'Gasfitería 24h',
  provider_display_name: 'Juan Pérez',
  created_at: new Date().toISOString(),
  ad_images: [],
};

function renderAt(id) {
  return render(
    <MemoryRouter initialEntries={[`/clasificados/${id}`]}>
      <Routes>
        <Route path="/clasificados/:id" element={<ClassifiedAdDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Por defecto, sin ciudad resuelta todavía (FALLBACK_CITY real de
  // CityContext no aplica acá porque el módulo está mockeado) — el
  // componente debe caer a siteConfig.brandName, igual que antes de PR-3.
  mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'fallback' });
  messageService?.getAdOwner?.mockResolvedValue({ data: null });
  adService?.getByCategory?.mockResolvedValue({ data: [] });
  adService?.getImageUrl?.mockReturnValue(null);
  adService?.formatAd?.mockImplementation(ad => ({
    ...ad,
    providerLabel: ad?.provider_display_name,
    isNew: true,
  }));
});

describe('ClassifiedAdDetail (perfil profesional)', () => {
  it('renders the new-professional badge without crashing on CITY_CONFIG', async () => {
    adService?.getById?.mockResolvedValue({ data: baseAd, error: null });

    renderAt('oficio-1');

    expect(await screen.findByRole('heading', { name: 'Juan Pérez' }))?.toBeInTheDocument();
    expect(screen.getByText(/Nuevo en CoronelLocal/))?.toBeInTheDocument();
  });

  // PR-3: caso representativo de la migración de siteConfig.brandName a
  // city?.brand_name ?? siteConfig?.brandName (ver también EventActions,
  // AdCard, FooterSection, etc. — mismo patrón mecánico).
  it('usa brand_name de la ciudad activa cuando CityContext resuelve una ciudad distinta a Coronel', async () => {
    mockUseCity.mockReturnValue({
      city: { brand_name: 'ChascomúsLocal' },
      loading: false,
      resolutionStatus: 'resolved',
    });
    adService?.getById?.mockResolvedValue({ data: baseAd, error: null });

    renderAt('oficio-1');

    expect(await screen.findByRole('heading', { name: 'Juan Pérez' }))?.toBeInTheDocument();
    expect(screen.getByText(/Nuevo en ChascomúsLocal/))?.toBeInTheDocument();
    expect(screen.queryByText(/Nuevo en CoronelLocal/))?.not?.toBeInTheDocument();
  });

  it('cae a siteConfig.brandName cuando city.brand_name es null/undefined (fila real con el campo vacío)', async () => {
    mockUseCity.mockReturnValue({
      city: { brand_name: null },
      loading: false,
      resolutionStatus: 'resolved',
    });
    adService?.getById?.mockResolvedValue({ data: baseAd, error: null });

    renderAt('oficio-1');

    expect(await screen.findByRole('heading', { name: 'Juan Pérez' }))?.toBeInTheDocument();
    expect(screen.getByText(/Nuevo en CoronelLocal/))?.toBeInTheDocument();
  });

  it('cae a siteConfig.brandName cuando CityContext reporta resolutionStatus "error"', async () => {
    mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'error' });
    adService?.getById?.mockResolvedValue({ data: baseAd, error: null });

    renderAt('oficio-1');

    expect(await screen.findByRole('heading', { name: 'Juan Pérez' }))?.toBeInTheDocument();
    expect(screen.getByText(/Nuevo en CoronelLocal/))?.toBeInTheDocument();
  });

  it('renders the profile even when incrementViews rejects (view-count RPC failing must not block rendering)', async () => {
    adService?.getById?.mockResolvedValue({ data: baseAd, error: null });
    adService?.incrementViews?.mockRejectedValue(new Error('404: increment_ad_views not found'));

    renderAt('oficio-1');

    expect(await screen.findByRole('heading', { name: 'Juan Pérez' }))?.toBeInTheDocument();
    expect(adService?.incrementViews)?.toHaveBeenCalledWith('oficio-1');
  });

  it('shows the not-found state when the ad fails to load, instead of crashing', async () => {
    adService?.getById?.mockResolvedValue({ data: null, error: new Error('not found') });

    renderAt('missing-ad');

    expect(await screen.findByText('Aviso no encontrado'))?.toBeInTheDocument();
  });
});
