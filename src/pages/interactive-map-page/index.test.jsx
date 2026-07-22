import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../../services/mapService', () => ({
  mapService: {
    getBusinessesForMap: vi.fn(() => Promise.resolve({ data: [] })),
    getEventsForMap: vi.fn(() => Promise.resolve({ data: [] })),
    getUpcomingEvents: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

vi.mock('../../services/communityService', () => ({
  communityService: {
    getCommunityPostsForMap: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

vi.mock('./components/MapSearchBar', () => ({ default: () => <div>MapSearchBar</div> }));
vi.mock('./components/BusinessBottomSheet', () => ({ default: () => null }));
vi.mock('./components/EventBottomSheet', () => ({ default: () => null }));
vi.mock('./components/UpcomingEventsPanel', () => ({ default: () => <div>UpcomingEventsPanel</div> }));
vi.mock('./components/MapMarkers', () => ({
  BusinessMarker: () => null,
  EventMarker: () => null,
  CommunityPostMarker: () => null,
}));

// The invalidateSize() call is the whole point of this regression test, so the
// react-leaflet mock needs to expose it — but nothing here needs a real Leaflet
// instance or real DOM measurement, which jsdom can't provide anyway.
const invalidateSize = vi.fn();
const mapStub = { getContainer: () => document.createElement('div'), invalidateSize, flyTo: vi.fn() };
let resizeObserverInstances = [];

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, style }) => (
    <div data-testid="map-container" style={style}>{children}</div>
  ),
  TileLayer: () => null,
  useMap: () => mapStub,
}));

vi.mock('leaflet', () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
  },
}));

import InteractiveMapPage from './index';

class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
    resizeObserverInstances?.push(this);
  }
  observe() {}
  disconnect() {
    this.disconnected = true;
  }
  trigger() {
    this.callback?.();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  resizeObserverInstances = [];
  global.ResizeObserver = MockResizeObserver;
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/mapa']}>
      <InteractiveMapPage />
    </MemoryRouter>
  );
}

describe('InteractiveMapPage — layout (root cause: fixed Header is not a flex participant)', () => {
  it('sizes the map area with fixed positioning + insets, not flex + margin-top', async () => {
    const { container } = renderPage();
    await screen.findByTestId('map-container');

    // The map's own wrapper is the parent of the mocked MapContainer div.
    const mapArea = screen.getByTestId('map-container')?.parentElement;

    expect(mapArea?.style?.position)?.toBe('fixed');
    expect(mapArea?.style?.top)?.toBe('64px');
    expect(mapArea?.style?.left)?.toBe('0px');
    expect(mapArea?.style?.right)?.toBe('0px');
    expect(mapArea?.style?.bottom)?.toBe('0px');

    // The old bug: a flex column with height:100vh assuming the fixed Header
    // consumed 64px of it, compensated with marginTop. Neither should exist
    // anymore for this container — inset-based sizing needs neither.
    expect(mapArea?.style?.marginTop)?.toBe('');
    expect(container?.querySelector('[style*="height: 100vh"]'))?.toBeNull();
  });

  it('the map fills 100% of that fixed box (no additional height/margin hardcoded on it)', async () => {
    await renderPage();
    const mapContainer = await screen.findByTestId('map-container');
    expect(mapContainer?.style?.width)?.toBe('100%');
    expect(mapContainer?.style?.height)?.toBe('100%');
  });
});

describe('InteractiveMapPage — Leaflet invalidateSize on container resize', () => {
  it('registers a ResizeObserver on the map container and calls invalidateSize() when it fires', async () => {
    await renderPage();
    await screen.findByTestId('map-container');

    expect(resizeObserverInstances)?.toHaveLength(1);
    expect(invalidateSize)?.not?.toHaveBeenCalled();

    resizeObserverInstances?.[0]?.trigger();

    expect(invalidateSize)?.toHaveBeenCalledTimes(1);
  });

  it('disconnects the ResizeObserver on unmount (no leaked observers)', async () => {
    const { unmount } = renderPage();
    await screen.findByTestId('map-container');
    const observer = resizeObserverInstances?.[0];

    unmount();

    expect(observer?.disconnected)?.toBe(true);
  });
});

describe('InteractiveMapPage — legend and upcoming events panel still render', () => {
  it('shows the legend (Negocios/Eventos/Comunidad) and the upcoming events panel', async () => {
    renderPage();
    await screen.findByTestId('map-container');

    const legendTitle = screen.getByText('Leyenda');
    const legend = legendTitle?.closest('div');
    expect(legend)?.toBeTruthy();
    // "Negocios" also appears in the header nav — scope to the legend card.
    expect(screen.getAllByText('Negocios')?.length)?.toBeGreaterThan(0);
    expect(legend?.textContent)?.toContain('Negocios');
    expect(legend?.textContent)?.toContain('Eventos');
    expect(legend?.textContent)?.toContain('Comunidad');
    expect(screen.getAllByText('UpcomingEventsPanel')?.length)?.toBeGreaterThan(0);
    expect(screen.getByText('MapSearchBar'))?.toBeInTheDocument();
  });
});
