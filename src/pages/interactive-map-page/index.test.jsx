import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { siteConfig } from '../../config/siteConfig';

let lastMapContainerProps = null;

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
    return <div data-testid="map-container">{props?.children}</div>;
  },
  TileLayer: () => null,
  useMap: () => ({ flyTo: vi.fn() }),
}));

// Header trae AuthContext/supabase; los servicios de mapa/comunidad tocan
// Supabase directo. Se mockean para probar solo el centro del mapa (foco de
// este PR), no la carga de datos ni la sesión.
vi.mock('components/ui/Header', () => ({ default: () => <div /> }));
vi.mock('../../services/mapService', () => ({
  mapService: {
    getBusinessesForMap: vi.fn().mockResolvedValue({ data: [] }),
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
  BusinessMarker: () => null,
  EventMarker: () => null,
  CommunityPostMarker: () => null,
}));

import InteractiveMapPage from './index';

/**
 * PR-1 (config estática): el centro del mapa interactivo debe seguir siendo
 * exactamente el mismo valor que antes (CORONEL_CENTER), ahora leído desde
 * siteConfig.map.interactiveMapCenter en vez de un literal duplicado.
 */
describe('InteractiveMapPage', () => {
  it('conserva su centro actual, ahora desde siteConfig.map.interactiveMapCenter', () => {
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
});
