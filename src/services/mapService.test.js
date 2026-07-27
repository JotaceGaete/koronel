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

describe('mapService.getEventsForMap — filtrado por city_id (Fase 4 / B6)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  // Encadenable (select/in/ilike/eq) y "thenable" — misma forma que el
  // query builder real, awaitable directamente sin método terminal.
  function makeEventsBuilder(result) {
    const builder = {};
    ['select', 'in', 'ilike', 'eq']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  it('con communityCityId válido, filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeEventsBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('events');
      return builder;
    });

    await mapService?.getEventsForMap({ communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('mantiene los filtros existentes de status, búsqueda y categoría junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeEventsBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await mapService?.getEventsForMap({ search: 'feria', category: 'cultura', communityCityId: cityId });

    expect(builder?.in)?.toHaveBeenCalledWith('status', ['approved', 'active']);
    expect(builder?.ilike)?.toHaveBeenCalledWith('title', '%feria%');
    expect(builder?.eq)?.toHaveBeenCalledWith('category', 'cultura');
    expect(builder?.eq)?.toHaveBeenCalledWith('city_id', cityId);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeEventsBuilder({
      data: [{ id: 'ev-1', lat: -37.03, lng: -73.14 }],
      error: null,
    });
    supabase?.from?.mockImplementation(() => builder);

    const result = await mapService?.getEventsForMap({ communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('mapService.getEventsForMap');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.error)?.toBeNull();
  });
});

describe('mapService.getUpcomingEvents — filtrado por city_id (Fase 4 / B6)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  // Encadenable (select/in/gte/eq/order/limit) y "thenable".
  function makeUpcomingBuilder(result) {
    const builder = {};
    ['select', 'in', 'gte', 'eq', 'order', 'limit']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  it('acepta la firma por objeto { limit, communityCityId } y filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeUpcomingBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('events');
      return builder;
    });

    await mapService?.getUpcomingEvents({ limit: 5, communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('conserva el filtro de status/fecha, el orden y el límite existentes junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeUpcomingBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await mapService?.getUpcomingEvents({ limit: 5, communityCityId: cityId });

    expect(builder?.in)?.toHaveBeenCalledWith('status', ['approved', 'active']);
    expect(builder?.gte)?.toHaveBeenCalledWith('start_datetime', expect.any(String));
    expect(builder?.order)?.toHaveBeenCalledWith('start_datetime', { ascending: true });
    expect(builder?.limit)?.toHaveBeenCalledWith(5);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeUpcomingBuilder({
      data: [{ id: 'ev-1', lat: -37.03, lng: -73.14 }],
      error: null,
    });
    supabase?.from?.mockImplementation(() => builder);

    const result = await mapService?.getUpcomingEvents({ limit: 5, communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('mapService.getUpcomingEvents');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.error)?.toBeNull();
  });

  it('sin argumentos (todo por defecto): limit=5 y sin filtro de ciudad', async () => {
    const builder = makeUpcomingBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await mapService?.getUpcomingEvents();

    expect(builder?.limit)?.toHaveBeenCalledWith(5);
    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
  });
});
