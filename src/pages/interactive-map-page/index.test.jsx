import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { siteConfig } from '../../config/siteConfig';

const { mockGetBusinessesForMap, mockGetEventsForMap, mockGetUpcomingEvents, mockGetCommunityPostsForMap } = vi.hoisted(() => ({
  mockGetBusinessesForMap: vi.fn(),
  mockGetEventsForMap: vi.fn(),
  mockGetUpcomingEvents: vi.fn(),
  mockGetCommunityPostsForMap: vi.fn(),
}));

let lastMapContainerProps = null;
const mockFlyTo = vi.fn();
const mockSetView = vi.fn();
const mockGetZoom = vi.fn(() => 14);
const mockUseCity = vi.fn();

// Ids de negocio/evento/publicación renderizados en la pasada de render
// ACTUAL únicamente — se reinician en cada render de MapContainer (el
// padre), así nunca acumulan marcadores de una pasada de render anterior
// (Fase 4: prueba de que los resultados de una ciudad no quedan mezclados
// con los de la siguiente, en ninguna de las cuatro capas).
let currentBusinessMarkerIds = [];
let currentEventMarkerIds = [];
let currentCommunityPostMarkerIds = [];

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
    currentEventMarkerIds = [];
    currentCommunityPostMarkerIds = [];
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
    getEventsForMap: mockGetEventsForMap,
    getUpcomingEvents: mockGetUpcomingEvents,
  },
}));
vi.mock('../../services/communityService', () => ({
  communityService: {
    getCommunityPostsForMap: mockGetCommunityPostsForMap,
  },
}));
vi.mock('./components/MapSearchBar', () => ({ default: () => <div /> }));
vi.mock('./components/BusinessBottomSheet', () => ({ default: () => <div /> }));
vi.mock('./components/EventBottomSheet', () => ({ default: () => <div /> }));
vi.mock('./components/UpcomingEventsPanel', () => ({ default: () => <div /> }));
vi.mock('./components/MapMarkers', () => ({
  BusinessMarker: (props) => { currentBusinessMarkerIds?.push(props?.business?.id); return null; },
  EventMarker: (props) => { currentEventMarkerIds?.push(props?.event?.id); return null; },
  CommunityPostMarker: (props) => { currentCommunityPostMarkerIds?.push(props?.post?.id); return null; },
}));

import InteractiveMapPage from './index';

beforeEach(() => {
  lastMapContainerProps = null;
  currentBusinessMarkerIds = [];
  currentEventMarkerIds = [];
  currentCommunityPostMarkerIds = [];
  mockFlyTo.mockClear();
  mockSetView.mockClear();
  mockGetZoom.mockClear();
  mockGetBusinessesForMap.mockReset();
  mockGetBusinessesForMap.mockResolvedValue({ data: [] });
  mockGetEventsForMap.mockReset();
  mockGetEventsForMap.mockResolvedValue({ data: [] });
  mockGetUpcomingEvents.mockReset();
  mockGetUpcomingEvents.mockResolvedValue({ data: [] });
  mockGetCommunityPostsForMap.mockReset();
  mockGetCommunityPostsForMap.mockResolvedValue({ data: [] });
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

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

describe('InteractiveMapPage — aislamiento completo del mapa por ciudad: eventos y comunidad (Fase 4 / B6)', () => {
  it('los tres métodos (eventos del mapa, próximos eventos, publicaciones comunitarias) reciben communityCityId', async () => {
    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-a', loading: false, resolutionStatus: 'resolved' });
    render(<InteractiveMapPage />);

    await waitFor(() => expect(mockGetEventsForMap).toHaveBeenCalledWith(
      expect.objectContaining({ communityCityId: 'city-a' })
    ));
    expect(mockGetUpcomingEvents).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, communityCityId: 'city-a' })
    );
    expect(mockGetCommunityPostsForMap).toHaveBeenCalledWith(
      expect.objectContaining({ communityCityId: 'city-a' })
    );
  });

  it('la página envía el mismo communityCityId a sus cuatro fuentes: negocios, eventos del mapa, próximos eventos y publicaciones comunitarias', async () => {
    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-a', loading: false, resolutionStatus: 'resolved' });
    render(<InteractiveMapPage />);

    await waitFor(() => expect(mockGetEventsForMap).toHaveBeenCalled());
    expect(mockGetBusinessesForMap).toHaveBeenLastCalledWith(expect.objectContaining({ communityCityId: 'city-a' }));
    expect(mockGetEventsForMap).toHaveBeenLastCalledWith(expect.objectContaining({ communityCityId: 'city-a' }));
    expect(mockGetUpcomingEvents).toHaveBeenLastCalledWith(expect.objectContaining({ communityCityId: 'city-a' }));
    expect(mockGetCommunityPostsForMap).toHaveBeenLastCalledWith(expect.objectContaining({ communityCityId: 'city-a' }));
  });

  it('un cambio real de ciudad provoca exactamente una secuencia adicional de carga en las cuatro fuentes', async () => {
    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-a', loading: false, resolutionStatus: 'resolved' });
    const { rerender } = render(<InteractiveMapPage />);
    await waitFor(() => expect(mockGetEventsForMap).toHaveBeenCalledTimes(1));
    expect(mockGetUpcomingEvents).toHaveBeenCalledTimes(1);
    expect(mockGetCommunityPostsForMap).toHaveBeenCalledTimes(1);

    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-b', loading: false, resolutionStatus: 'resolved' });
    rerender(<InteractiveMapPage />);

    await waitFor(() => expect(mockGetEventsForMap).toHaveBeenCalledTimes(2));
    expect(mockGetUpcomingEvents).toHaveBeenCalledTimes(2);
    expect(mockGetCommunityPostsForMap).toHaveBeenCalledTimes(2);
    expect(mockGetEventsForMap).toHaveBeenLastCalledWith(expect.objectContaining({ communityCityId: 'city-b' }));
    expect(mockGetUpcomingEvents).toHaveBeenLastCalledWith(expect.objectContaining({ communityCityId: 'city-b' }));
    expect(mockGetCommunityPostsForMap).toHaveBeenLastCalledWith(expect.objectContaining({ communityCityId: 'city-b' }));
  });

  it('re-renderizar sin que communityCityId cambie no dispara ninguna carga adicional en las cuatro fuentes', async () => {
    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-a', loading: false, resolutionStatus: 'resolved' });
    const { rerender } = render(<InteractiveMapPage />);
    await waitFor(() => expect(mockGetEventsForMap).toHaveBeenCalledTimes(1));

    rerender(<InteractiveMapPage />);

    expect(mockGetBusinessesForMap).toHaveBeenCalledTimes(1);
    expect(mockGetEventsForMap).toHaveBeenCalledTimes(1);
    expect(mockGetUpcomingEvents).toHaveBeenCalledTimes(1);
    expect(mockGetCommunityPostsForMap).toHaveBeenCalledTimes(1);
  });

  it('los eventos y publicaciones de la ciudad anterior desaparecen de inmediato al cambiar de ciudad, antes de que resuelvan las nuevas consultas', async () => {
    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-a', loading: false, resolutionStatus: 'resolved' });
    mockGetEventsForMap.mockResolvedValueOnce({ data: [{ id: 'ev-city-a', resolvedLat: -37.03, resolvedLng: -73.14 }] });
    mockGetCommunityPostsForMap.mockResolvedValueOnce({ data: [{ id: 'post-city-a', lat: -37.03, lng: -73.14 }] });
    const { rerender } = render(<InteractiveMapPage />);

    await waitFor(() => expect(currentEventMarkerIds).toEqual(['ev-city-a']));
    expect(currentCommunityPostMarkerIds).toEqual(['post-city-a']);

    const deferredEvents = createDeferred();
    const deferredPosts = createDeferred();
    mockGetEventsForMap.mockReturnValueOnce(deferredEvents.promise);
    mockGetCommunityPostsForMap.mockReturnValueOnce(deferredPosts.promise);
    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-b', loading: false, resolutionStatus: 'resolved' });
    rerender(<InteractiveMapPage />);

    // Antes de resolver cualquier consulta de la ciudad nueva, ya no deben
    // verse los marcadores de la ciudad anterior en ninguna de las capas.
    expect(currentEventMarkerIds).toHaveLength(0);
    expect(currentCommunityPostMarkerIds).toHaveLength(0);

    deferredEvents.resolve({ data: [{ id: 'ev-city-b', resolvedLat: -34.6, resolvedLng: -58.38 }] });
    deferredPosts.resolve({ data: [{ id: 'post-city-b', lat: -34.6, lng: -58.38 }] });

    await waitFor(() => expect(currentEventMarkerIds).toEqual(['ev-city-b']));
    expect(currentCommunityPostMarkerIds).toEqual(['post-city-b']);
  });

  it('una respuesta tardía de la ciudad anterior (ya obsoleta) no sobrescribe los datos de la ciudad vigente', async () => {
    const deferredEventsA = createDeferred();
    const deferredPostsA = createDeferred();
    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-a', loading: false, resolutionStatus: 'resolved' });
    mockGetEventsForMap.mockReturnValueOnce(deferredEventsA.promise);
    mockGetCommunityPostsForMap.mockReturnValueOnce(deferredPostsA.promise);
    const { rerender } = render(<InteractiveMapPage />);
    await waitFor(() => expect(mockGetEventsForMap).toHaveBeenCalledTimes(1));

    const deferredEventsB = createDeferred();
    const deferredPostsB = createDeferred();
    mockGetEventsForMap.mockReturnValueOnce(deferredEventsB.promise);
    mockGetCommunityPostsForMap.mockReturnValueOnce(deferredPostsB.promise);
    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-b', loading: false, resolutionStatus: 'resolved' });
    rerender(<InteractiveMapPage />);
    await waitFor(() => expect(mockGetEventsForMap).toHaveBeenCalledTimes(2));

    // La ciudad vigente (B) resuelve primero.
    deferredEventsB.resolve({ data: [{ id: 'ev-city-b', resolvedLat: -34.6, resolvedLng: -58.38 }] });
    deferredPostsB.resolve({ data: [{ id: 'post-city-b', lat: -34.6, lng: -58.38 }] });
    await waitFor(() => expect(currentEventMarkerIds).toEqual(['ev-city-b']));
    expect(currentCommunityPostMarkerIds).toEqual(['post-city-b']);

    // La respuesta de la ciudad anterior (A), ya obsoleta, llega después.
    deferredEventsA.resolve({ data: [{ id: 'ev-city-a', resolvedLat: -37.03, resolvedLng: -73.14 }] });
    deferredPostsA.resolve({ data: [{ id: 'post-city-a', lat: -37.03, lng: -73.14 }] });
    await new Promise((r) => setTimeout(r, 0));

    expect(currentEventMarkerIds).toEqual(['ev-city-b']);
    expect(currentCommunityPostMarkerIds).toEqual(['post-city-b']);
  });

  it('no aparecen marcadores duplicados tras un cambio de ciudad con datos reales en las cuatro capas', async () => {
    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-a', loading: false, resolutionStatus: 'resolved' });
    mockGetBusinessesForMap.mockResolvedValueOnce({ data: [{ id: 'biz-a', lat: -37.03, lng: -73.14 }] });
    mockGetEventsForMap.mockResolvedValueOnce({ data: [{ id: 'ev-a', resolvedLat: -37.03, resolvedLng: -73.14 }] });
    mockGetCommunityPostsForMap.mockResolvedValueOnce({ data: [{ id: 'post-a', lat: -37.03, lng: -73.14 }] });
    const { rerender } = render(<InteractiveMapPage />);
    await waitFor(() => expect(currentBusinessMarkerIds).toEqual(['biz-a']));

    mockGetBusinessesForMap.mockResolvedValueOnce({ data: [{ id: 'biz-b', lat: -34.6, lng: -58.38 }] });
    mockGetEventsForMap.mockResolvedValueOnce({ data: [{ id: 'ev-b', resolvedLat: -34.6, resolvedLng: -58.38 }] });
    mockGetCommunityPostsForMap.mockResolvedValueOnce({ data: [{ id: 'post-b', lat: -34.6, lng: -58.38 }] });
    mockUseCity.mockReturnValue({ city: null, communityCityId: 'city-b', loading: false, resolutionStatus: 'resolved' });
    rerender(<InteractiveMapPage />);

    await waitFor(() => expect(currentBusinessMarkerIds).toEqual(['biz-b']));
    // Exactamente un marcador por capa — ni duplicados, ni sobrantes de A.
    expect(currentBusinessMarkerIds).toHaveLength(1);
    expect(currentEventMarkerIds).toEqual(['ev-b']);
    expect(currentCommunityPostMarkerIds).toEqual(['post-b']);
  });
});
