import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Referencia estable: un objeto nuevo en cada render dispararía el
// useEffect([user, navigate]) del componente en cada render (loop infinito).
const mockAdminUser = { id: 'admin-1', app_metadata: { role: 'admin' } };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockAdminUser }),
}));
vi.mock('../../services/businessService', () => ({
  businessService: {
    getHierarchicalCategories: vi.fn().mockResolvedValue({ data: [], flat: [] }),
  },
}));
vi.mock('../../services/adminService', () => ({
  adminBusinessService: { create: vi.fn(), update: vi.fn() },
}));

let lastOSMMapProps = null;
vi.mock('components/maps/OSMMap', () => ({
  default: (props) => {
    lastOSMMapProps = props;
    return <div data-testid="osm-map" />;
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

import AdminQuickBusinessEntry from './AdminQuickBusinessEntry';
import { siteConfig } from '../../config/siteConfig';

// jsdom no implementa scrollIntoView; el componente lo llama cuando aparece
// un error de geocoding (errorRef.current.scrollIntoView(...)).
Element.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  lastOSMMapProps = null;
  mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'fallback' });
  mockGeocode.mockResolvedValue({ lat: -10, lng: -20, display_name: 'Test' });
});

function renderForm() {
  return render(
    <MemoryRouter>
      <AdminQuickBusinessEntry />
    </MemoryRouter>
  );
}

function fillAddressAndSearch() {
  const input = screen.getByPlaceholderText('Calle y número, Coronel');
  fireEvent.change(input, { target: { value: 'Calle Falsa 123' } });
  fireEvent.click(screen.getByText('Buscar dirección en mapa'));
}

/**
 * PR-4: AdminQuickBusinessEntry debe (a) pasar { geocodingSuffix } de
 * CityContext a geocode(), y (b) usar city?.default_lat/lng — no
 * CORONEL_DEFAULT — como centro inicial del picker y como fallback cuando
 * geocode() no encuentra resultado.
 */
describe('AdminQuickBusinessEntry — geocodificación por ciudad activa', () => {
  it('pasa geocodingSuffix de siteConfig cuando no hay ciudad resuelta (fallback)', async () => {
    renderForm();
    fillAddressAndSearch();
    await waitFor(() => expect(mockGeocode).toHaveBeenCalled());
    expect(mockGeocode).toHaveBeenCalledWith('Calle Falsa 123', {
      geocodingSuffix: siteConfig?.map?.geocodingSuffix,
    });
  });

  it('pasa geocoding_suffix de la ciudad activa cuando CityContext resuelve una ciudad distinta a Coronel', async () => {
    mockUseCity.mockReturnValue({
      city: { geocoding_suffix: 'Chascomús, Argentina', default_lat: -35.5, default_lng: -58.0 },
      loading: false,
      resolutionStatus: 'resolved',
    });
    renderForm();
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
    renderForm();
    fillAddressAndSearch();
    await waitFor(() => expect(mockGeocode).toHaveBeenCalled());
    expect(mockGeocode).toHaveBeenCalledWith('Calle Falsa 123', {
      geocodingSuffix: siteConfig?.map?.geocodingSuffix,
    });
  });

  it('usa default_lat/default_lng de la ciudad activa como centro inicial del picker (sin geocodificar aún)', () => {
    mockUseCity.mockReturnValue({
      city: { default_lat: -34.6037, default_lng: -58.3816 },
      loading: false,
      resolutionStatus: 'resolved',
    });
    renderForm();
    expect(lastOSMMapProps?.lat).toBe(-34.6037);
    expect(lastOSMMapProps?.lng).toBe(-58.3816);
  });

  it('cae a siteConfig.map.defaultCenter como centro inicial cuando no hay ciudad resuelta', () => {
    renderForm();
    expect(lastOSMMapProps?.lat).toBe(siteConfig?.map?.defaultCenter?.lat);
    expect(lastOSMMapProps?.lng).toBe(siteConfig?.map?.defaultCenter?.lng);
  });

  it('usa default_lat/default_lng de la ciudad activa como fallback cuando geocode() no encuentra la dirección', async () => {
    mockUseCity.mockReturnValue({
      city: { default_lat: -34.6037, default_lng: -58.3816 },
      loading: false,
      resolutionStatus: 'resolved',
    });
    mockGeocode.mockResolvedValue(null);
    renderForm();
    fillAddressAndSearch();

    await waitFor(() => {
      expect(screen.getByText(/No se encontró la dirección/))?.toBeInTheDocument();
    });
    expect(lastOSMMapProps?.lat).toBe(-34.6037);
    expect(lastOSMMapProps?.lng).toBe(-58.3816);
  });

  it('estado de error de CityContext no rompe el formulario: sigue permitiendo buscar y cae a siteConfig', async () => {
    mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'error' });
    renderForm();

    // El picker se renderiza con el fallback de siteConfig, sin lanzar.
    expect(lastOSMMapProps?.lat).toBe(siteConfig?.map?.defaultCenter?.lat);

    fillAddressAndSearch();
    await waitFor(() => expect(mockGeocode).toHaveBeenCalled());
    expect(mockGeocode).toHaveBeenCalledWith('Calle Falsa 123', {
      geocodingSuffix: siteConfig?.map?.geocodingSuffix,
    });
  });
});
