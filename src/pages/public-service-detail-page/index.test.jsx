import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

// Header -> Logo ahora usa CityContext, que importa lib/supabase (exige
// VITE_SUPABASE_URL). Sin relación con lo que prueba este archivo.
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

vi.mock('../../services/publicServicesService', () => ({
  publicServicesService: {
    getById: vi.fn(),
    submitReport: vi.fn(),
  },
  getPublicServiceCategoryLabel: (key) => ({
    salud: 'Salud',
    emergencias: 'Emergencias',
  }?.[key] || key),
}));

import { publicServicesService } from '../../services/publicServicesService';
import PublicServiceDetailPage from './index';

function renderDetail(id = 'svc-1') {
  return render(
    <MemoryRouter initialEntries={[`/servicios/${id}`]}>
      <Routes>
        <Route path="/servicios/:id" element={<PublicServiceDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PublicServiceDetailPage', () => {
  it('opens the ficha and renders the full set of fields when all data is present', async () => {
    publicServicesService?.getById?.mockResolvedValue({
      data: {
        id: 'svc-1',
        name: 'Hospital San José de Coronel',
        institution_type: 'Hospital público',
        category_key: 'salud',
        description: 'Hospital público de la comuna.',
        address: 'Lautaro 600, Coronel',
        phone: '+56 41 272 3250',
        email: null,
        schedule_note: 'Urgencia: todos los días, 24 horas',
        website: 'https://www.hospitaldecoronel.cl',
        verified_at: '2026-07-22',
      },
      error: null,
    });

    renderDetail('svc-1');

    expect(await screen.findByText('Hospital San José de Coronel'))?.toBeInTheDocument();
    expect(screen.getByText('Lautaro 600, Coronel'))?.toBeInTheDocument();
    expect(screen.getByText('Llamar'))?.toBeInTheDocument();
    expect(screen.getByText('Ver en el mapa'))?.toBeInTheDocument();
    expect(screen.getByText('Sitio oficial'))?.toBeInTheDocument();
    expect(screen.getByText('¿Encontraste información incorrecta?'))?.toBeInTheDocument();
  });

  it('does not crash and hides the corresponding buttons when optional fields are absent', async () => {
    publicServicesService?.getById?.mockResolvedValue({
      data: {
        id: 'svc-2',
        name: 'Cuerpo de Bomberos de Coronel',
        institution_type: 'Bomberos',
        category_key: 'emergencias',
        description: null,
        address: null,
        phone: '132',
        email: null,
        schedule_note: null,
        website: null,
        verified_at: null,
      },
      error: null,
    });

    renderDetail('svc-2');

    expect(await screen.findByText('Cuerpo de Bomberos de Coronel'))?.toBeInTheDocument();
    // Only the phone is present, so only the "Llamar" action should render.
    expect(screen.getByText('Llamar'))?.toBeInTheDocument();
    expect(screen.queryByText('Ver en el mapa'))?.not?.toBeInTheDocument();
    expect(screen.queryByText('Sitio oficial'))?.not?.toBeInTheDocument();
    expect(screen.queryByText(/Última verificación/))?.not?.toBeInTheDocument();
  });

  it('shows a not-found message instead of crashing when the service does not exist', async () => {
    publicServicesService?.getById?.mockResolvedValue({ data: null, error: null });

    renderDetail('does-not-exist');

    expect(await screen.findByText('No encontramos esta institución.'))?.toBeInTheDocument();
  });
});
