import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { siteConfig } from '../../config/siteConfig';

let lastMapContainerProps = null;
const mockSetView = vi.fn();
const mockGetZoom = vi.fn(() => 15);
const mockUseCity = vi.fn();

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
  Marker: () => null,
  useMapEvents: () => null,
  useMap: () => ({ setView: mockSetView, getZoom: mockGetZoom }),
}));

vi.mock('../../contexts/CityContext', () => ({
  useCity: () => mockUseCity(),
}));

import OSMMap from './OSMMap';

beforeEach(() => {
  lastMapContainerProps = null;
  mockSetView.mockClear();
  mockGetZoom.mockClear();
  // Por defecto: sin ciudad resuelta (equivalente a FALLBACK_CITY para los
  // campos que usa OSMMap) — mismo comportamiento que antes de PR-3.
  mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'fallback' });
});

/**
 * PR-1: centro por defecto desde siteConfig.map.defaultCenter.
 * PR-3: ahora desde city?.default_lat/lng (CityContext), con siteConfig
 * como fallback explícito, y con recenter (map.setView) cuando la ciudad
 * activa cambia después del primer render.
 */
describe('OSMMap', () => {
  it('usa siteConfig.map.defaultCenter cuando no recibe lat/lng y no hay ciudad resuelta (fallback)', () => {
    render(<OSMMap />);
    expect(lastMapContainerProps?.center).toEqual([
      siteConfig?.map?.defaultCenter?.lat,
      siteConfig?.map?.defaultCenter?.lng,
    ]);
  });

  it('no altera el comportamiento existente: usa lat/lng explícitos cuando se pasan como props', () => {
    render(<OSMMap lat={-33.4489} lng={-70.6693} />);
    expect(lastMapContainerProps?.center).toEqual([-33.4489, -70.6693]);
  });

  it('no altera props explícitas como zoom', () => {
    render(<OSMMap zoom={10} />);
    expect(lastMapContainerProps?.zoom).toBe(10);
  });

  it('usa default_lat/default_lng de una ciudad activa distinta a Coronel (sin lat/lng explícitos)', () => {
    mockUseCity.mockReturnValue({
      city: { default_lat: -34.6037, default_lng: -58.3816 },
      loading: false,
      resolutionStatus: 'resolved',
    });
    render(<OSMMap />);
    expect(lastMapContainerProps?.center).toEqual([-34.6037, -58.3816]);
  });

  it('cae a siteConfig cuando default_lat/default_lng de la ciudad resuelta son null', () => {
    mockUseCity.mockReturnValue({
      city: { default_lat: null, default_lng: null },
      loading: false,
      resolutionStatus: 'resolved',
    });
    render(<OSMMap />);
    expect(lastMapContainerProps?.center).toEqual([
      siteConfig?.map?.defaultCenter?.lat,
      siteConfig?.map?.defaultCenter?.lng,
    ]);
  });

  it('cae a siteConfig cuando CityContext reporta resolutionStatus "error"', () => {
    mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'error' });
    render(<OSMMap />);
    expect(lastMapContainerProps?.center).toEqual([
      siteConfig?.map?.defaultCenter?.lat,
      siteConfig?.map?.defaultCenter?.lng,
    ]);
  });

  it('reposiciona el mapa (map.setView) cuando la ciudad activa cambia después del primer render, sin coords explícitas', () => {
    mockUseCity.mockReturnValue({ city: null, loading: false, resolutionStatus: 'fallback' });
    const { rerender } = render(<OSMMap />);

    // Montaje inicial: MapContainer ya usó el centro correcto; MapRecenter
    // no debe disparar un setView redundante en el propio montaje.
    expect(mockSetView).not.toHaveBeenCalled();

    // La ciudad resuelve después del montaje (simula la consulta async de
    // CityContext completándose más tarde) con coordenadas distintas.
    mockUseCity.mockReturnValue({
      city: { default_lat: -34.6037, default_lng: -58.3816 },
      loading: false,
      resolutionStatus: 'resolved',
    });
    rerender(<OSMMap />);

    expect(mockSetView).toHaveBeenCalledWith([-34.6037, -58.3816], 15);
  });

  it('no reposiciona el mapa si la ciudad no cambia entre renders (sin llamadas redundantes)', () => {
    mockUseCity.mockReturnValue({
      city: { default_lat: -34.6037, default_lng: -58.3816 },
      loading: false,
      resolutionStatus: 'resolved',
    });
    const { rerender } = render(<OSMMap />);
    mockSetView.mockClear();

    rerender(<OSMMap />);

    expect(mockSetView).not.toHaveBeenCalled();
  });

  it('sigue reposicionando correctamente cuando cambian lat/lng explícitos (comportamiento previo a PR-3, sin regresión)', () => {
    const { rerender } = render(<OSMMap lat={-33.45} lng={-70.66} />);
    mockSetView.mockClear();

    rerender(<OSMMap lat={-33.03} lng={-71.55} />);

    expect(mockSetView).toHaveBeenCalledWith([-33.03, -71.55], 15);
  });
});
