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

  // PR-4: geocode(addressText, config) acepta un segundo parámetro opcional
  // con geocodingSuffix, construido por el llamador desde CityContext.
  describe('config.geocodingSuffix (PR-4)', () => {
    it('usa config.geocodingSuffix en vez de siteConfig.map.geocodingSuffix cuando se entrega', async () => {
      await geocode('Calle Alsina 456', { geocodingSuffix: 'Chascomús, Argentina' });
      const [calledUrl] = global.fetch.mock.calls[0];
      expect(calledUrl).toBe(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent('Calle Alsina 456, Chascomús, Argentina')}&format=json&limit=1`
      );
    });

    it('llamadas sin segundo parámetro siguen funcionando (compatibilidad hacia atrás)', async () => {
      await geocode('Avenida Los Carrera 789');
      const [calledUrl] = global.fetch.mock.calls[0];
      expect(calledUrl).toContain(encodeURIComponent(`Avenida Los Carrera 789, ${siteConfig?.map?.geocodingSuffix}`));
    });

    it('cae a siteConfig.map.geocodingSuffix cuando config es un objeto vacío', async () => {
      await geocode('Pasaje Sin Nombre 12', {});
      const [calledUrl] = global.fetch.mock.calls[0];
      expect(calledUrl).toContain(encodeURIComponent(`Pasaje Sin Nombre 12, ${siteConfig?.map?.geocodingSuffix}`));
    });

    it('cae a siteConfig.map.geocodingSuffix cuando config.geocodingSuffix es null', async () => {
      await geocode('Calle Nula 34', { geocodingSuffix: null });
      const [calledUrl] = global.fetch.mock.calls[0];
      expect(calledUrl).toContain(encodeURIComponent(`Calle Nula 34, ${siteConfig?.map?.geocodingSuffix}`));
    });

    it('cae a siteConfig.map.geocodingSuffix cuando config.geocodingSuffix es undefined', async () => {
      await geocode('Calle Indefinida 56', { geocodingSuffix: undefined });
      const [calledUrl] = global.fetch.mock.calls[0];
      expect(calledUrl).toContain(encodeURIComponent(`Calle Indefinida 56, ${siteConfig?.map?.geocodingSuffix}`));
    });
  });

  // PR-4 (corrección post-revisión): la clave de CACHE debe incluir el
  // suffix efectivo, no solo la dirección — dos ciudades geocodificando la
  // misma dirección con distinto geocodingSuffix son consultas distintas.
  describe('clave de CACHE incluye el geocodingSuffix efectivo', () => {
    it('misma dirección + mismo suffix: reutiliza caché, no repite fetch', async () => {
      const first = await geocode('Av. Cache Uno 100', { geocodingSuffix: 'Ciudad A, País' });
      const second = await geocode('Av. Cache Uno 100', { geocodingSuffix: 'Ciudad A, País' });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });

    it('misma dirección + suffix distinto: hace una consulta nueva y no devuelve el resultado de la otra ciudad', async () => {
      global.fetch = vi.fn().mockImplementation((url) => {
        const isCityA = url?.includes(encodeURIComponent('Ciudad A, País'));
        return Promise.resolve({
          ok: true,
          json: async () => [
            isCityA
              ? { lat: '-10.0', lon: '-20.0', display_name: 'Resultado Ciudad A' }
              : { lat: '-30.0', lon: '-40.0', display_name: 'Resultado Ciudad B' },
          ],
        });
      });

      const resultA = await geocode('Av. Cache Dos 200', { geocodingSuffix: 'Ciudad A, País' });
      const resultB = await geocode('Av. Cache Dos 200', { geocodingSuffix: 'Ciudad B, País' });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(resultA?.display_name).toBe('Resultado Ciudad A');
      expect(resultB?.display_name).toBe('Resultado Ciudad B');
      expect(resultB).not.toEqual(resultA);
    });

    it('el fallback a siteConfig participa en la clave: llamar sin config y llamar con el mismo suffix explícito comparten caché', async () => {
      const withoutConfig = await geocode('Av. Cache Tres 300');
      const withExplicitSameSuffix = await geocode('Av. Cache Tres 300', {
        geocodingSuffix: siteConfig?.map?.geocodingSuffix,
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(withExplicitSameSuffix).toEqual(withoutConfig);
    });

    it('el fallback a siteConfig participa en la clave: un suffix distinto sigue generando una consulta nueva', async () => {
      await geocode('Av. Cache Cuatro 400', { geocodingSuffix: 'Ciudad Distinta, País' });
      await geocode('Av. Cache Cuatro 400'); // sin config -> cae a siteConfig, distinto del anterior

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
