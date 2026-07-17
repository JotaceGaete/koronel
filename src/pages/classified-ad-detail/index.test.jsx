import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
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
