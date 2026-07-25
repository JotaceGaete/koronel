import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('components/ui/Header', () => ({ default: () => <div /> }));
vi.mock('components/maps/OSMMap', () => ({ default: () => <div data-testid="osm-map" /> }));
// Referencia estable: un objeto nuevo en cada render dispararía el
// useEffect([user]) del componente en cada render (loop infinito).
const mockUser = { id: 'user-1' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
vi.mock('../../services/businessService', () => ({
  businessService: {
    getHierarchicalCategories: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

const mockGeocode = vi.fn();
vi.mock('../../services/geocodingService', () => ({
  geocode: (...args) => mockGeocode(...args),
}));

const mockUseCity = vi.fn();
vi.mock('../../contexts/CityContext', () => ({
  useCity: () => mockUseCity(),
}));

import PublishBusinessForm from './index';
import { siteConfig } from '../../config/siteConfig';

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'fallback' });
  mockGeocode.mockResolvedValue({ lat: -10, lng: -20, display_name: 'Test' });
});

function renderForm() {
  return render(
    <MemoryRouter>
      <PublishBusinessForm />
    </MemoryRouter>
  );
}

async function fillAddressAndSearch() {
  const input = await screen.findByPlaceholderText('Ej: Las Encinas 80, Coronel');
  fireEvent.change(input, { target: { value: 'Calle Falsa 123' } });
  fireEvent.click(screen.getByText('Buscar en el mapa'));
}

/**
 * PR-4: PublishBusinessForm debe construir { geocodingSuffix } desde
 * CityContext y pasarlo a geocode(), con siteConfig como fallback.
 */
describe('PublishBusinessForm — geocodificación por ciudad activa', () => {
  it('pasa geocodingSuffix de siteConfig cuando no hay ciudad resuelta (fallback)', async () => {
    renderForm();
    await fillAddressAndSearch();
    await waitFor(() => expect(mockGeocode).toHaveBeenCalled());
    expect(mockGeocode).toHaveBeenCalledWith('Calle Falsa 123', {
      geocodingSuffix: siteConfig?.map?.geocodingSuffix,
    });
  });

  it('pasa geocoding_suffix de la ciudad activa cuando CityContext resuelve una ciudad distinta a Coronel', async () => {
    mockUseCity.mockReturnValue({
      city: { geocoding_suffix: 'Chascomús, Argentina' },
      loading: false,
      resolutionStatus: 'resolved',
    });
    renderForm();
    await fillAddressAndSearch();
    await waitFor(() => expect(mockGeocode).toHaveBeenCalled());
    expect(mockGeocode).toHaveBeenCalledWith('Calle Falsa 123', {
      geocodingSuffix: 'Chascomús, Argentina',
    });
  });

  it('cae a siteConfig cuando geocoding_suffix de la ciudad resuelta es null', async () => {
    mockUseCity.mockReturnValue({
      city: { geocoding_suffix: null },
      loading: false,
      resolutionStatus: 'resolved',
    });
    renderForm();
    await fillAddressAndSearch();
    await waitFor(() => expect(mockGeocode).toHaveBeenCalled());
    expect(mockGeocode).toHaveBeenCalledWith('Calle Falsa 123', {
      geocodingSuffix: siteConfig?.map?.geocodingSuffix,
    });
  });

  it('estado de error de CityContext no rompe el formulario ni bloquea la búsqueda', async () => {
    mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'error' });
    renderForm();
    await fillAddressAndSearch();
    await waitFor(() => expect(mockGeocode).toHaveBeenCalled());
    expect(mockGeocode).toHaveBeenCalledWith('Calle Falsa 123', {
      geocodingSuffix: siteConfig?.map?.geocodingSuffix,
    });
    expect(screen.getByPlaceholderText('Ej: Las Encinas 80, Coronel'))?.toBeInTheDocument();
  });
});
