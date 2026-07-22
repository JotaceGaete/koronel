import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../../services/publicServicesService', () => ({
  publicServicesService: {
    getAll: vi.fn(),
  },
  PUBLIC_SERVICE_CATEGORIES: [
    { key: 'instituciones_publicas', label: 'Instituciones públicas' },
    { key: 'salud', label: 'Salud' },
    { key: 'emergencias', label: 'Emergencias' },
    { key: 'atencion_ciudadana', label: 'Atención ciudadana' },
  ],
  getPublicServiceCategoryLabel: (key) => ({
    instituciones_publicas: 'Instituciones públicas',
    salud: 'Salud',
    emergencias: 'Emergencias',
    atencion_ciudadana: 'Atención ciudadana',
  }?.[key] || key),
}));

import { publicServicesService } from '../../services/publicServicesService';
import PublicServicesListing from './index';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/servicios']}>
      <PublicServicesListing />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PublicServicesListing', () => {
  it('loads without errors and shows the section title', async () => {
    publicServicesService?.getAll?.mockResolvedValue({ data: [], error: null });
    renderPage();

    expect(await screen.findByText('Servicios para la comunidad'))?.toBeInTheDocument();
  });

  it('renders "Todas" plus the four fixed categories', async () => {
    publicServicesService?.getAll?.mockResolvedValue({ data: [], error: null });
    renderPage();

    await screen.findByText('Servicios para la comunidad');
    expect(screen.getByText('Todas'))?.toBeInTheDocument();
    expect(screen.getByText('Instituciones públicas'))?.toBeInTheDocument();
    expect(screen.getByText('Salud'))?.toBeInTheDocument();
    expect(screen.getByText('Emergencias'))?.toBeInTheDocument();
    expect(screen.getByText('Atención ciudadana'))?.toBeInTheDocument();
  });

  it('shows an empty state instead of crashing when there are no institutions in a category', async () => {
    publicServicesService?.getAll?.mockResolvedValue({ data: [], error: null });
    renderPage();

    expect(await screen.findByText('Aún no hay instituciones publicadas en esta categoría.'))?.toBeInTheDocument();
  });

  it('an institution card links to its own ficha (detail route)', async () => {
    publicServicesService?.getAll?.mockResolvedValue({
      data: [{ id: 'svc-1', name: 'Municipalidad de Coronel', institution_type: 'Municipalidad', address: 'Los Notros 1489, Coronel' }],
      error: null,
    });
    renderPage();

    const link = await screen.findByText('Municipalidad de Coronel');
    const anchor = link?.closest('a');
    expect(anchor)?.toHaveAttribute('href', '/servicios/svc-1');
  });

  it('clicking a category chip re-queries with that categoryKey (filter from the query, not client-side)', async () => {
    publicServicesService?.getAll?.mockResolvedValue({ data: [], error: null });
    renderPage();
    await screen.findByText('Todas');

    fireEvent.click(screen.getByText('Salud'));

    await vi.waitFor(() => {
      expect(publicServicesService?.getAll)?.toHaveBeenCalledWith(
        expect.objectContaining({ categoryKey: 'salud' })
      );
    });
  });
});
