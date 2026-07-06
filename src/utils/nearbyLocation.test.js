import { describe, expect, it } from 'vitest';
import {
  calculateDistanceKm,
  formatDistance,
  getDirectionsUrl,
  isValidCoordinate,
} from './nearbyLocation';

describe('nearby location helpers', () => {
  it('calculates distance between two known points', () => {
    const distance = calculateDistanceKm(-37.0167, -73.1333, -36.827, -73.05);

    expect(distance).toBeGreaterThan(22);
    expect(distance).toBeLessThan(23);
  });

  it('formats distances under 1 km in meters', () => {
    expect(formatDistance(0.15)).toBe('A 150 m');
  });

  it('formats distances over 1 km in kilometers', () => {
    expect(formatDistance(1.24)).toBe('A 1,2 km');
  });

  it('handles invalid coordinates without breaking', () => {
    expect(isValidCoordinate('foo', -73.1)).toBe(false);
    expect(isValidCoordinate(-91, -73.1)).toBe(false);
    expect(calculateDistanceKm('foo', -73.1, -37, -73)).toBeNull();
    expect(formatDistance(null)).toBeNull();
  });

  it('does not build directions for businesses without lat/lng', () => {
    expect(getDirectionsUrl(null, -73.1)).toBeNull();
    expect(getDirectionsUrl(-37, undefined)).toBeNull();
  });
});
