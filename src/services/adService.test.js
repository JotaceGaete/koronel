import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import { adService } from './adService';

// Encadenable (select/eq/neq/order/limit) y "thenable" — igual que el query
// builder real de Supabase, awaitable directamente sin un método terminal
// explícito.
function makeGetRecentBuilder(result) {
  const builder = {};
  ['select', 'eq', 'neq', 'order', 'limit']?.forEach((method) => {
    builder[method] = vi.fn(() => builder);
  });
  builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('adService.getRecent — filtrado por city_id (Fase 4)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  it('acepta la firma por objeto { limit, communityCityId }', async () => {
    const builder = makeGetRecentBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('classified_ads');
      return builder;
    });

    const result = await adService?.getRecent({ limit: 6, communityCityId: null });

    expect(result?.data)?.toEqual([]);
    expect(result?.error)?.toBeNull();
  });

  it('con communityCityId válido, filtra por city_id exactamente una vez en la consulta principal', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetRecentBuilder({ data: [{ id: 'ad-1' }], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await adService?.getRecent({ limit: 6, communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('con communityCityId null: sin filtro de ciudad, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeGetRecentBuilder({ data: [{ id: 'ad-1' }], error: null });
    supabase?.from?.mockImplementation(() => builder);

    const result = await adService?.getRecent({ limit: 6, communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('adService.getRecent');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.error)?.toBeNull();
  });

  it('conserva select, ad_status=active, exclusión de listing_type=oficio, orden y límite', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetRecentBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('classified_ads');
      return builder;
    });

    await adService?.getRecent({ limit: 6, communityCityId: cityId });

    expect(builder?.select)?.toHaveBeenCalledWith('*, ad_images(storage_path, alt_text, is_primary, image_type)');
    expect(builder?.eq)?.toHaveBeenCalledWith('ad_status', 'active');
    expect(builder?.neq)?.toHaveBeenCalledWith('listing_type', 'oficio');
    expect(builder?.order)?.toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder?.limit)?.toHaveBeenCalledWith(6);
  });

  it('fallback por error 42703 (listing_type inexistente): repite sin ese filtro, aplica el filtro de ciudad exactamente una vez en ese camino, y conserva orden/límite', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    let callCount = 0;
    const failingBuilder = makeGetRecentBuilder({ data: null, error: { code: '42703', message: 'column does not exist' } });
    const fallbackBuilder = makeGetRecentBuilder({ data: [{ id: 'ad-2' }], error: null });
    supabase?.from?.mockImplementation(() => {
      callCount += 1;
      return callCount === 1 ? failingBuilder : fallbackBuilder;
    });

    const result = await adService?.getRecent({ limit: 6, communityCityId: cityId });

    // La consulta principal aplica la exclusión de oficio; el camino de
    // fallback (tras el 42703) nunca la aplica.
    expect(failingBuilder?.neq)?.toHaveBeenCalledWith('listing_type', 'oficio');
    expect(fallbackBuilder?.neq)?.not?.toHaveBeenCalled();

    // El filtro de ciudad se aplica exactamente una vez en cada camino que
    // realmente se ejecuta — nunca dos veces en la misma consulta.
    const failingCityCalls = failingBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    const fallbackCityCalls = fallbackBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(failingCityCalls)?.toHaveLength(1);
    expect(fallbackCityCalls)?.toHaveLength(1);

    expect(fallbackBuilder?.order)?.toHaveBeenCalledWith('created_at', { ascending: false });
    expect(fallbackBuilder?.limit)?.toHaveBeenCalledWith(6);
    expect(result?.data)?.toEqual([{ id: 'ad-2' }]);
    expect(result?.error)?.toBeNull();
  });

  it('errores no-42703 se devuelven controlados, sin lanzar excepción', async () => {
    const builder = makeGetRecentBuilder({ data: null, error: { code: '500', message: 'fail' } });
    supabase?.from?.mockImplementation(() => builder);

    const result = await adService?.getRecent({ limit: 6, communityCityId: null });

    expect(result?.data)?.toEqual([]);
    expect(result?.error)?.toEqual({ code: '500', message: 'fail' });
  });
});

describe('adService.getAll — filtrado por city_id (Fase 4 / B1)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  // Encadenable (select/eq/neq/ilike/gte/lte/order/range) y "thenable" —
  // igual que el query builder real de Supabase, awaitable directamente
  // sin un método terminal explícito.
  function makeGetAllBuilder(result) {
    const builder = {};
    ['select', 'eq', 'neq', 'ilike', 'gte', 'lte', 'order', 'range']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  it('con communityCityId válido, filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetAllBuilder({ data: [], count: 0, error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('classified_ads');
      return builder;
    });

    await adService?.getAll({ communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('conserva select, ad_status, listing_type, categoría, búsqueda, condición, rango de precio, fecha, orden y paginación existentes junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetAllBuilder({ data: [], count: 0, error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('classified_ads');
      return builder;
    });

    await adService?.getAll({
      listingType: 'clasificados',
      category: 'hogar',
      search: 'sofá',
      condition: 'usado',
      priceRange: '10000-50000',
      dateFilter: 'week',
      sort: 'price_asc',
      page: 2,
      pageSize: 10,
      communityCityId: cityId,
    });

    expect(builder?.select)?.toHaveBeenCalledWith(
      '*, ad_images(storage_path, alt_text, is_primary, image_type)',
      { count: 'exact' }
    );
    expect(builder?.eq)?.toHaveBeenCalledWith('ad_status', 'active');
    expect(builder?.neq)?.toHaveBeenCalledWith('listing_type', 'oficio');
    expect(builder?.eq)?.toHaveBeenCalledWith('category_key', 'hogar');
    expect(builder?.ilike)?.toHaveBeenCalledWith('title', '%sofá%');
    expect(builder?.eq)?.toHaveBeenCalledWith('condition', 'usado');
    expect(builder?.gte)?.toHaveBeenCalledWith('price', 10000);
    expect(builder?.lte)?.toHaveBeenCalledWith('price', 50000);
    expect(builder?.gte)?.toHaveBeenCalledWith('created_at', expect.any(String));
    expect(builder?.eq)?.toHaveBeenCalledWith('city_id', cityId);
    expect(builder?.order)?.toHaveBeenCalledWith('price', { ascending: true, nullsFirst: false });
    expect(builder?.range)?.toHaveBeenCalledWith(10, 19);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeGetAllBuilder({ data: [{ id: 'ad-1' }], count: 1, error: null });
    supabase?.from?.mockImplementation(() => builder);

    const result = await adService?.getAll({ communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('adService.getAll');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.count)?.toBe(1);
    expect(result?.error)?.toBeNull();
  });

  it('sin communityCityId (parámetro omitido → default null): mismo comportamiento que pasarlo explícito', async () => {
    const builder = makeGetAllBuilder({ data: [], count: 0, error: null });
    supabase?.from?.mockImplementation(() => builder);

    await adService?.getAll();

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
  });

  it('fallback por error 42703 (listing_type inexistente): repite sin ese filtro, aplica el filtro de ciudad exactamente una vez en ese camino, y conserva orden/paginación', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    let callCount = 0;
    const failingBuilder = makeGetAllBuilder({ data: null, count: 0, error: { code: '42703', message: 'column does not exist' } });
    const fallbackBuilder = makeGetAllBuilder({ data: [{ id: 'ad-2' }], count: 1, error: null });
    supabase?.from?.mockImplementation(() => {
      callCount += 1;
      return callCount === 1 ? failingBuilder : fallbackBuilder;
    });

    const result = await adService?.getAll({ listingType: 'clasificados', communityCityId: cityId });

    expect(failingBuilder?.neq)?.toHaveBeenCalledWith('listing_type', 'oficio');
    expect(fallbackBuilder?.neq)?.not?.toHaveBeenCalled();

    const failingCityCalls = failingBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    const fallbackCityCalls = fallbackBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(failingCityCalls)?.toHaveLength(1);
    expect(fallbackCityCalls)?.toHaveLength(1);

    expect(fallbackBuilder?.order)?.toHaveBeenCalledWith('featured', { ascending: false });
    expect(fallbackBuilder?.range)?.toHaveBeenCalledWith(0, 11);
    expect(result?.data)?.toEqual([{ id: 'ad-2' }]);
    expect(result?.count)?.toBe(1);
    expect(result?.error)?.toBeNull();
  });

  it('errores no-42703 se devuelven controlados, sin lanzar excepción', async () => {
    const builder = makeGetAllBuilder({ data: null, count: 0, error: { code: '500', message: 'fail' } });
    supabase?.from?.mockImplementation(() => builder);

    const result = await adService?.getAll({ communityCityId: null });

    expect(result?.data)?.toEqual([]);
    expect(result?.count)?.toBe(0);
    expect(result?.error)?.toEqual({ code: '500', message: 'fail' });
  });
});

describe('adService.getByCategory — filtrado por city_id (avisos similares)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  function makeGetByCategoryBuilder(result) {
    const builder = {};
    ['select', 'eq', 'neq', 'order', 'limit']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  it('con communityCityId válido, filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetByCategoryBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('classified_ads');
      return builder;
    });

    await adService?.getByCategory('hogar', 'ad-1', 4, cityId);

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('conserva ad_status, category_key, exclusión del aviso actual, orden y límite junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetByCategoryBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await adService?.getByCategory('hogar', 'ad-1', 4, cityId);

    expect(builder?.eq)?.toHaveBeenCalledWith('ad_status', 'active');
    expect(builder?.eq)?.toHaveBeenCalledWith('category_key', 'hogar');
    expect(builder?.neq)?.toHaveBeenCalledWith('id', 'ad-1');
    expect(builder?.order)?.toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder?.limit)?.toHaveBeenCalledWith(4);
  });

  it('con communityCityId null (u omitido): sin filtro territorial, emite el warning centralizado', async () => {
    const builder = makeGetByCategoryBuilder({ data: [{ id: 'ad-2' }], error: null });
    supabase?.from?.mockImplementation(() => builder);

    const result = await adService?.getByCategory('hogar', 'ad-1', 4);

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('adService.getByCategory');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.error)?.toBeNull();
  });

  it('un error se devuelve controlado, sin lanzar excepción', async () => {
    const builder = makeGetByCategoryBuilder({ data: null, error: { code: '500', message: 'fail' } });
    supabase?.from?.mockImplementation(() => builder);

    const result = await adService?.getByCategory('hogar', 'ad-1', 4, '8aa2d628-719d-4810-9ee3-8efd230ab000');

    expect(result?.data)?.toEqual([]);
    expect(result?.error)?.toEqual({ code: '500', message: 'fail' });
  });
});
