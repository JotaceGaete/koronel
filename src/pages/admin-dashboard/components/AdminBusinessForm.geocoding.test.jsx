import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../../services/businessService', () => ({
  businessService: {
    getHierarchicalCategories: vi.fn().mockResolvedValue({ data: [] }),
    getImageUrl: vi.fn(),
  },
}));
vi.mock('../../../services/adminService', () => ({
  adminBusinessService: { create: vi.fn(), update: vi.fn() },
}));
vi.mock('components/maps/OSMMap', () => ({ default: () => <div data-testid="osm-map" /> }));

const mockGeocode = vi.fn();
vi.mock('../../../services/geocodingService', () => ({
  geocode: (...args) => mockGeocode(...args),
}));

const mockUseCity = vi.fn();
vi.mock('../../../contexts/CityContext', () => ({
  useCity: () => mockUseCity(),
}));

import AdminBusinessForm from './AdminBusinessForm';
import { siteConfig } from '../../../config/siteConfig';

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'fallback' });
  mockGeocode.mockResolvedValue({ lat: -10, lng: -20, display_name: 'Test' });
});

function fillAddressAndSearch() {
  const input = screen.getByPlaceholderText('Ej: Las Encinas 80, Coronel');
  fireEvent.change(input, { target: { value: 'Calle Falsa 123' } });
  fireEvent.click(screen.getByText('Buscar en el mapa'));
}

/**
 * PR-4: AdminBusinessForm debe construir { geocodingSuffix } desde
 * CityContext y pasarlo a geocode(), con siteConfig como fallback.
 */
describe('AdminBusinessForm — geocodificación por ciudad activa', () => {
  it('pasa geocodingSuffix de siteConfig cuando no hay ciudad resuelta (fallback)', async () => {
    render(<AdminBusinessForm onSave={vi.fn()} onCancel={vi.fn()} />);
    fillAddressAndSearch();
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
    render(<AdminBusinessForm onSave={vi.fn()} onCancel={vi.fn()} />);
    fillAddressAndSearch();
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
    render(<AdminBusinessForm onSave={vi.fn()} onCancel={vi.fn()} />);
    fillAddressAndSearch();
    await waitFor(() => expect(mockGeocode).toHaveBeenCalled());
    expect(mockGeocode).toHaveBeenCalledWith('Calle Falsa 123', {
      geocodingSuffix: siteConfig?.map?.geocodingSuffix,
    });
  });

  it('estado de error de CityContext no rompe el formulario ni bloquea la búsqueda', async () => {
    mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'error' });
    render(<AdminBusinessForm onSave={vi.fn()} onCancel={vi.fn()} />);
    fillAddressAndSearch();
    await waitFor(() => expect(mockGeocode).toHaveBeenCalled());
    expect(mockGeocode).toHaveBeenCalledWith('Calle Falsa 123', {
      geocodingSuffix: siteConfig?.map?.geocodingSuffix,
    });
    // El resultado del geocode se sigue aplicando con normalidad.
    expect(await screen.findByPlaceholderText('Ej: Las Encinas 80, Coronel'))?.toBeInTheDocument();
  });
});
