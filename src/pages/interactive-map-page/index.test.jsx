import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { siteConfig } from '../../config/siteConfig';

const { mockGetBusinessesForMap } = vi.hoisted(() => ({
  mockGetBusinessesForMap: vi.fn(),
}));

let lastMapContainerProps = null;
const mockFlyTo = vi.fn();
const mockSetView = vi.fn();
const mockGetZoom = vi.fn(() => 14);
const mockUseCity = vi.fn();

// Ids de negocio renderizados en la pasada de render ACTUAL únicamente — se
// reinicia en cada render de MapContainer (el padre), así nunca acumula
// marcadores de una pasada de render anterior (Fase 4: prueba de que los
// resultados de una ciudad no quedan mezclados con los de la siguiente).
let currentBusinessMarkerIds = [];

vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: (props) => {
    lastMapContainerProps = props;
    currentBusinessMarkerIds = [];
    return <div data-testid="map-container">{props?.children}</div>;
  },
  TileLayer: () => null,
  useMap: () => ({ flyTo: mockFlyTo, setView: mockSetView, getZoom: mockGetZoom }),
}));

vi.mock('../../contexts/CityContext', () => ({
  useCity: () => mockUseCity(),
}));

// Header trae AuthContext/supabase; los servicios de mapa/comunidad tocan
// Supabase directo. Se mockean para probar solo el centro del mapa (foco de
// este PR), no la carga de datos ni la sesión.
vi.mock('components/ui/Header', () => ({ default: () => <div /> }));
vi.mock('../../services/mapService', () => ({
  mapService: {
    getBusinessesForMap: mockGetBusinessesForMap,
    getEventsForMap: vi.fn().mockResolvedValue({ data: [] }),
    getUpcomingEvents: vi.fn().mockResolvedValue({ data: [] }),
  },
}));
vi.mock('../../services/communityService', () => ({
  communityService: {
    getCommunityPostsForMap: vi.fn().mockResolvedValue({ data: [] }),
  },
}));
vi.mock('./components/MapSearchBar', () => ({ default: () => <div /> }));
vi.mock('./components/BusinessBottomSheet', () => ({ default: () => <div /> }));
vi.mock('./components/EventBottomSheet', () => ({ default: () => <div /> }));
vi.mock('./components/UpcomingEventsPanel', () => ({ default: () => <div /> }));
vi.mock('./components/MapMarkers', () => ({
  BusinessMarker: (props) => { currentBusinessMarkerIds?.push(props?.business?.id); return null; },
  EventMarker: () => null,
  CommunityPostMarker: () => null,
}));

import InteractiveMapPage from './index';

beforeEach(() => {
  lastMapContainerProps = null;
  currentBusinessMarkerIds = [];
  mockFlyTo.mockClear();
  mockSetView.mockClear();
  mockGetZoom.mockClear();
  mockGetBusinessesForMap.mockReset();
  mockGetBusinessesForMap.mockResolvedValue({ data: [] });
  // Por defecto: sin ciudad resuelta — mismo comportamiento que antes de PR-3.
  mockUseCity.mockReturnValue({ city: null, communityCityId: null, loading: false, resolutionStatus: 'fallback' });
});

/**
 * PR-1: centro desde siteConfig.map.interactiveMapCenter (literal duplicado
 * eliminado). PR-3: ahora desde city?.interactive_map_lat/lng (CityContext),
 * con siteConfig como fallback explícito, y con recenter (map.setView)
 * cuando la ciudad activa cambia después del primer render.
 */
describe('InteractiveMapPage', () => {
  it('conserva su centro actual cuando no hay ciudad resuelta (fallback a siteConfig.map.interactiveMapCenter)', () => {
    render(<InteractiveMapPage />);
    expect(lastMapContainerProps?.center).toEqual([
      siteConfig?.map?.interactiveMapCenter?.lat,
      siteConfig?.map?.interactiveMapCenter?.lng,
    ]);
  });

  it('el centro sigue siendo [-37.0298, -73.1429], el mismo valor que tenía el literal CORONEL_CENTER', () => {
    render(<InteractiveMapPage />);
    expect(lastMapContainerProps?.center).toEqual([-37.0298, -73.1429]);
  });

  it('usa interactive_map_lat/lng de una ciudad activa distinta a Coronel', () => {
    mockUseCity.mockReturnValue({
      city: { interactive_map_lat: -34.6037, interactive_map_lng: -58.3816 },
      loading: false,
      resolutionStatus: 'resolved',
    });
    render(<InteractiveMapPage />);
    expect(lastMapContainerProps?.center).toEqual([-34.6037, -58.3816]);
  });

  it('cae a siteConfig cuando interactive_map_lat/lng de la ciudad resuelta son null', () => {
    mockUseCity.mockReturnValue({
      city: { interactive_map_lat: null, interactive_map_lng: null },
      loading: false,
      resolutionStatus: 'resolved',
    });
    render(<InteractiveMapPage />);
    expect(lastMapContainerProps?.center).toEqual([
      siteConfig?.map?.interactiveMapCenter?.lat,
      siteConfig?.map?.interactiveMapCenter?.lng,
    ]);
  });

  it('cae a siteConfig cuando CityContext reporta resolutionStatus "error"', () => {
    mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'error' });
    render(<InteractiveMapPage />);
    expect(lastMapContainerProps?.center).toEqual([
      siteConfig?.map?.interactiveMapCenter?.lat,
      siteConfig?.map?.interactiveMapCenter?.lng,
    ]);
  });

  it('reposiciona el mapa (map.setView) cuando la ciudad activa cambia después del primer render', () => {
    mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'fallback' });
    const { rerender } = render(<InteractiveMapPage />);

    // Montaje inicial: no debe disparar un setView redundante.
    expect(mockSetView).not.toHaveBeenCalled();

    // La ciudad resuelve después del montaje con coordenadas distintas.
    mockUseCity.mockReturnValue({
      city: { interactive_map_lat: -34.6037, interactive_map_lng: -58.3816 },
      loading: false,
      resolutionStatus: 'resolved',
    });
    rerender(<InteractiveMapPage />);

    expect(mockSetView).toHaveBeenCalledWith([-34.6037, -58.3816], 14);
  });

  it('no reposiciona el mapa si la ciudad no cambia entre renders (sin llamadas redundantes)', () => {
    mockUseCity.mockReturnValue({
      city: { interactive_map_lat: -34.6037, interactive_map_lng: -58.3816 },
      loading: false,
      resolutionStatus: 'resolved',
    });
    const { rerender } = render(<InteractiveMapPage />);
    mockSetView.mockClear();

    rerender(<InteractiveMapPage />);

    expect(mockSetView).not.toHaveBeenCalled();
  });
});

describe('InteractiveMapPage — carga de negocios filtrada por communityCityId (Fase 4)', () => {
  it('pasa communityCityId a mapService.getBusinessesForMap junto con search/category vigentes', async () => {
    mockUseCity.mockReturnValue({
      city: null,
      communityCityId: 'city-a',
      loading: false,
      resolutionStatus: 'resolved',
    });
    render(<InteractiveMapPage />);

    await waitFor(() =>
      expect(mockGetBusinessesForMap).toHaveBeenCalledWith({
        search: '',
        category: 'all',
        communityCityId: 'city-a',
      })
    );
    expect(mockGetBusinessesForMap).toHaveBeenCalledTimes(1);
  });

  it('un cambio real de communityCityId recarga el mapa con el identificador nuevo, sin cargas duplicadas', async () => {
    mockUseCity.mockReturnValue({
      city: null,
      communityCityId: 'city-a',
      loading: false,
      resolutionStatus: 'resolved',
    });
    const { rerender } = render(<InteractiveMapPage />);

    await waitFor(() => expect(mockGetBusinessesForMap).toHaveBeenCalledTimes(1));
    expect(mockGetBusinessesForMap).toHaveBeenLastCalledWith({
      search: '',
      category: 'all',
      communityCityId: 'city-a',
    });

    mockUseCity.mockReturnValue({
      city: null,
      communityCityId: 'city-b',
      loading: false,
      resolutionStatus: 'resolved',
    });
    rerender(<InteractiveMapPage />);

    await waitFor(() => expect(mockGetBusinessesForMap).toHaveBeenCalledTimes(2));
    expect(mockGetBusinessesForMap).toHaveBeenLastCalledWith({
      search: '',
      category: 'all',
      communityCityId: 'city-b',
    });
  });

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockUseCity.mockReturnValue({
      city: null,
      communityCityId: 'city-a',
      loading: false,
      resolutionStatus: 'resolved',
    });
    const { rerender } = render(<InteractiveMapPage />);
    await waitFor(() => expect(mockGetBusinessesForMap).toHaveBeenCalledTimes(1));

    rerender(<InteractiveMapPage />);

    expect(mockGetBusinessesForMap).toHaveBeenCalledTimes(1);
  });

  it('los negocios de la ciudad anterior no quedan mezclados con los de la ciudad nueva', async () => {
    mockUseCity.mockReturnValue({
      city: null,
      communityCityId: 'city-a',
      loading: false,
      resolutionStatus: 'resolved',
    });
    mockGetBusinessesForMap.mockResolvedValueOnce({
      data: [{ id: 'biz-city-a', lat: -37.03, lng: -73.14 }],
    });
    const { rerender } = render(<InteractiveMapPage />);

    await waitFor(() => expect(currentBusinessMarkerIds).toEqual(['biz-city-a']));

    mockUseCity.mockReturnValue({
      city: null,
      communityCityId: 'city-b',
      loading: false,
      resolutionStatus: 'resolved',
    });
    mockGetBusinessesForMap.mockResolvedValueOnce({
      data: [{ id: 'biz-city-b', lat: -34.6, lng: -58.38 }],
    });
    rerender(<InteractiveMapPage />);

    await waitFor(() => expect(currentBusinessMarkerIds).toEqual(['biz-city-b']));
    expect(currentBusinessMarkerIds).not.toContain('biz-city-a');
  });
});
