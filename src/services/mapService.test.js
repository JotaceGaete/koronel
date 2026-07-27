import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import { mapService } from './mapService';

// Encadenable (select/not/ilike/eq) y "thenable" — igual que el query
// builder real de Supabase, awaitable directamente sin un método terminal
// explícito.
function makeListBuilder(result) {
  const builder = {};
  ['select', 'not', 'ilike', 'eq']?.forEach((method) => {
    builder[method] = vi.fn(() => builder);
  });
  builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
  return builder;
}

describe('mapService.getBusinessesForMap — filtrado por city_id (Fase 4)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  it('con communityCityId válido, filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeListBuilder({ data: [{ id: 'b1', lat: -37.03, lng: -73.14 }], error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('businesses');
      return builder;
    });

    await mapService?.getBusinessesForMap({ communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('mantiene los filtros existentes de búsqueda, categoría y coordenadas junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeListBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await mapService?.getBusinessesForMap({
      search: 'ferreteria',
      category: 'ferreteria',
      communityCityId: cityId,
    });

    expect(builder?.not)?.toHaveBeenCalledWith('lat', 'is', null);
    expect(builder?.ilike)?.toHaveBeenCalledWith('name', '%ferreteria%');
    expect(builder?.eq)?.toHaveBeenCalledWith('category_key', 'ferreteria');
    expect(builder?.eq)?.toHaveBeenCalledWith('city_id', cityId);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeListBuilder({ data: [{ id: 'b1', lat: -37.03, lng: -73.14 }], error: null });
    supabase?.from?.mockImplementation(() => builder);

    const result = await mapService?.getBusinessesForMap({ communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('mapService.getBusinessesForMap');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.error)?.toBeNull();
  });

  it('sin communityCityId (parámetro omitido → default null): mismo comportamiento que pasarlo explícito', async () => {
    const builder = makeListBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await mapService?.getBusinessesForMap({});

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
  });
});
