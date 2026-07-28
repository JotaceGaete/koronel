import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import { eventService } from './eventService';

describe('eventService.getAll — filtrado por city_id (Fase 4 / B3)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  // Encadenable (select/eq/ilike/gte/order/range) y "thenable" — igual que
  // el query builder real de Supabase, awaitable directamente sin un método
  // terminal explícito.
  function makeGetAllBuilder(result) {
    const builder = {};
    ['select', 'eq', 'ilike', 'gte', 'order', 'range']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  it('con communityCityId válido, filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetAllBuilder({ data: [], count: 0, error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('events');
      return builder;
    });

    await eventService?.getAll({ communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('conserva select, status, categoría, búsqueda, upcoming, orden y paginación existentes junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetAllBuilder({ data: [], count: 0, error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('events');
      return builder;
    });

    await eventService?.getAll({
      category: 'meetups',
      search: 'feria',
      status: 'approved',
      upcoming: true,
      page: 2,
      pageSize: 10,
      communityCityId: cityId,
    });

    expect(builder?.select)?.toHaveBeenCalledWith('*, organizer:businesses(id, name, category)', { count: 'exact' });
    expect(builder?.eq)?.toHaveBeenCalledWith('status', 'approved');
    expect(builder?.eq)?.toHaveBeenCalledWith('category', 'meetups');
    expect(builder?.ilike)?.toHaveBeenCalledWith('title', '%feria%');
    expect(builder?.gte)?.toHaveBeenCalledWith('start_datetime', expect.any(String));
    expect(builder?.eq)?.toHaveBeenCalledWith('city_id', cityId);
    expect(builder?.order)?.toHaveBeenCalledWith('start_datetime', { ascending: true });
    expect(builder?.range)?.toHaveBeenCalledWith(10, 19);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeGetAllBuilder({ data: [{ id: 'ev-1' }], count: 1, error: null });
    supabase?.from?.mockImplementation(() => builder);

    const result = await eventService?.getAll({ communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('eventService.getAll');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.count)?.toBe(1);
    expect(result?.error)?.toBeNull();
  });

  it('sin communityCityId (parámetro omitido → default null): mismo comportamiento que pasarlo explícito', async () => {
    const builder = makeGetAllBuilder({ data: [], count: 0, error: null });
    supabase?.from?.mockImplementation(() => builder);

    await eventService?.getAll();

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
  });
});

describe('eventService.getUpcoming — filtrado por city_id (Fase 4 / B3)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  // Encadenable (select/eq/gte/order/limit) y "thenable".
  function makeUpcomingBuilder(result) {
    const builder = {};
    ['select', 'eq', 'gte', 'order', 'limit']?.forEach((method) => {
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

    await eventService?.getUpcoming({ limit: 4, communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('conserva el filtro de status/fecha, el orden y el límite existentes junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeUpcomingBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await eventService?.getUpcoming({ limit: 4, communityCityId: cityId });

    expect(builder?.eq)?.toHaveBeenCalledWith('status', 'approved');
    expect(builder?.gte)?.toHaveBeenCalledWith('start_datetime', expect.any(String));
    expect(builder?.order)?.toHaveBeenCalledWith('start_datetime', { ascending: true });
    expect(builder?.limit)?.toHaveBeenCalledWith(4);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeUpcomingBuilder({ data: [{ id: 'ev-1' }], error: null });
    supabase?.from?.mockImplementation(() => builder);

    const result = await eventService?.getUpcoming({ limit: 4, communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('eventService.getUpcoming');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.error)?.toBeNull();
  });

  it('llamada posicional heredada getUpcoming(4) (usada por event-detail-page, fuera de este bloque) sigue funcionando igual: limit=4, sin filtro de ciudad', async () => {
    const builder = makeUpcomingBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    // eslint-disable-next-line no-restricted-syntax -- se prueba deliberadamente la llamada posicional heredada
    await eventService?.getUpcoming(4);

    expect(builder?.limit)?.toHaveBeenCalledWith(4);
    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
  });

  it('llamada posicional getUpcoming(8): usa realmente límite 8, no el valor por defecto (regresión: desestructurar { limit = 4 } sobre un número ignoraba el valor recibido)', async () => {
    const builder = makeUpcomingBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    // eslint-disable-next-line no-restricted-syntax -- se prueba deliberadamente la llamada posicional con un límite distinto del default
    await eventService?.getUpcoming(8);

    expect(builder?.limit)?.toHaveBeenCalledWith(8);
    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
  });

  it('sin argumentos (todo por defecto): limit=4 y sin filtro de ciudad', async () => {
    const builder = makeUpcomingBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await eventService?.getUpcoming();

    expect(builder?.limit)?.toHaveBeenCalledWith(4);
    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
  });

  it('firma por objeto con limit=6 y communityCityId: usa límite 6 y filtra por esa ciudad', async () => {
    const builder = makeUpcomingBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await eventService?.getUpcoming({ limit: 6, communityCityId: 'city-a' });

    expect(builder?.limit)?.toHaveBeenCalledWith(6);
    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', 'city-a']);
  });
});
