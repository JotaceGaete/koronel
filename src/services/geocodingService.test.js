import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocode, CORONEL_DEFAULT } from './geocodingService';
import { siteConfig } from '../config/siteConfig';

/**
 * PR-1 (config estática): la consulta enviada a Nominatim debe seguir
 * teniendo exactamente la misma forma que antes (`${direccion}, Coronel, Chile`),
 * ahora construida a partir de siteConfig.map.geocodingSuffix en vez de un
 * literal. Mismo proveedor, mismo endpoint, mismos headers, mismo manejo de
 * errores — solo cambia de dónde viene el sufijo.
 */
describe('geocodingService', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '-37.03', lon: '-73.14', display_name: 'Coronel, Chile' }],
    });
  });

  it('exporta CORONEL_DEFAULT igual a siteConfig.map.defaultCenter', () => {
    expect(CORONEL_DEFAULT).toEqual(siteConfig?.map?.defaultCenter);
  });

  it('construye la query concatenando siteConfig.map.geocodingSuffix, igual que antes', async () => {
    await geocode('Av. Colón 123');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = global.fetch.mock.calls[0];

    const expectedQuery = encodeURIComponent(`Av. Colón 123, ${siteConfig?.map?.geocodingSuffix}`);
    expect(calledUrl).toBe(`https://nominatim.openstreetmap.org/search?q=${expectedQuery}&format=json&limit=1`);
    // Mismo proveedor/endpoint, headers y formato de resultado que antes.
    expect(calledOptions?.headers?.['Accept-Language']).toBe('es');
    expect(calledOptions?.headers?.['User-Agent']).toBe('CoronelPortal/1.0 (coronellocal.cl)');
  });

  it('siteConfig.map.geocodingSuffix reproduce el literal original ", Coronel, Chile"', async () => {
    await geocode('Direccion de prueba');
    const [calledUrl] = global.fetch.mock.calls[0];
    expect(calledUrl).toContain(encodeURIComponent('Direccion de prueba, Coronel, Chile'));
  });
});
