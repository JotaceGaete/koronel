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
  Marker: () => null,
  useMapEvents: () => null,
  useMap: () => ({ setView: vi.fn(), getZoom: () => 15 }),
}));

import OSMMap from './OSMMap';

/**
 * PR-1 (config estática): cuando OSMMap no recibe lat/lng explícitos (picker
 * sin dirección aún), el centro por defecto debe venir de
 * siteConfig.map.defaultCenter en vez del literal CORONEL_DEFAULT hardcodeado.
 */
describe('OSMMap', () => {
  it('usa siteConfig.map.defaultCenter cuando no recibe lat/lng', () => {
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
});
