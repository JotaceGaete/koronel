import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import { businessService } from './businessService';

function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
  };
  return builder;
}

// Para searchSuggestions: encadenable (select/in/or/eq/limit) y "thenable"
// — igual que el query builder real de Supabase, awaitable directamente
// sin un método terminal explícito, para que Promise.all([...]) funcione
// sin importar en qué paso de la cadena se inserte applyCityFilter.
function makeListBuilder(result) {
  const builder = {};
  ['select', 'in', 'or', 'eq', 'limit']?.forEach((method) => {
    builder[method] = vi.fn(() => builder);
  });
  builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('businessService.getById — category embed does not shadow the plain category column', () => {
  it('aliases the categories embed as category_ref, never as category (regression: AdminBusinessForm crashed rendering an object as a child)', async () => {
    let selectArg;
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('businesses');
      return {
        select: vi.fn((arg) => {
          selectArg = arg;
          return makeBuilder({
            data: {
              id: 'biz-1',
              category: 'Pizzería',
              category_id: 'cat-1',
              category_ref: { id: 'cat-1', name: 'Pizzería', name_key: 'restaurantes-pizzeria', parent_id: null },
            },
            error: null,
          });
        }),
      };
    });

    const { data, error } = await businessService?.getById('biz-1');

    expect(error)?.toBeNull();
    expect(selectArg)?.toContain('category_ref:categories(');
    expect(selectArg?.replace('category_ref:categories(', ''))?.not?.toContain('category:categories(');
    expect(typeof data?.category)?.toBe('string');
    expect(data?.category)?.toBe('Pizzería');
    expect(typeof data?.category_ref)?.toBe('object');
  });

  it('1. edita un negocio con todos sus campos presentes', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: {
          id: 'biz-full', name: 'Ferretería Central', category: 'Ferretería', category_id: 'cat-2',
          category_ref: { id: 'cat-2', name: 'Ferretería', name_key: 'ferreteria', parent_id: null },
          address: 'Calle Real 123', phone: '+56911111111', email: 'contacto@ferreteria.cl',
          website: 'https://ferreteria.cl', whatsapp: '+56911111111', description: 'Todo en ferretería',
        },
        error: null,
      })),
    }));

    const { data, error } = await businessService?.getById('biz-full');

    expect(error)?.toBeNull();
    expect(data?.name)?.toBe('Ferretería Central');
    expect(typeof data?.category)?.toBe('string');
    expect(data?.category_ref?.name)?.toBe('Ferretería');
  });

  it('2. edita un negocio con campos opcionales en null, sin lanzar excepción', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: {
          id: 'biz-nulls', name: 'Almacén El Sol', category: 'Almacén', category_id: null,
          category_ref: null, website: null, whatsapp: null, description: null, phone: null,
        },
        error: null,
      })),
    }));

    const { data, error } = await businessService?.getById('biz-nulls');

    expect(error)?.toBeNull();
    expect(data?.category)?.toBe('Almacén'); // el texto plano no se pierde cuando category_ref es null
    expect(data?.category_ref)?.toBeNull();
  });

  it('3. normaliza la relación cuando PostgREST la devuelve como objeto', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: { id: 'biz-obj', category: 'Panadería', category_ref: { id: 'cat-3', name: 'Panadería', parent_id: null } },
        error: null,
      })),
    }));

    const { data } = await businessService?.getById('biz-obj');

    expect(data?.category_ref)?.toEqual({ id: 'cat-3', name: 'Panadería', parent_id: null });
  });

  it('4. normaliza la relación cuando PostgREST la devuelve como array (relación ambigua o cache de esquema desactualizado)', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: { id: 'biz-arr', category: 'Panadería', category_ref: [{ id: 'cat-3', name: 'Panadería', parent_id: null }] },
        error: null,
      })),
    }));

    const { data, error } = await businessService?.getById('biz-arr');

    expect(error)?.toBeNull();
    expect(Array.isArray(data?.category_ref))?.toBe(false);
    expect(data?.category_ref)?.toEqual({ id: 'cat-3', name: 'Panadería', parent_id: null });
  });

  it('4b. un array vacío de la relación se normaliza a null, no a undefined ni a un array vacío', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: { id: 'biz-arr-empty', category: 'Panadería', category_ref: [] },
        error: null,
      })),
    }));

    const { data } = await businessService?.getById('biz-arr-empty');

    expect(data?.category_ref)?.toBeNull();
  });

  it('5. negocio inexistente: single() sin filas devuelve error PGRST116, sin lanzar excepción no controlada', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: null,
        error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      })),
    }));

    const { data, error } = await businessService?.getById('no-existe');

    expect(data)?.toBeNull();
    expect(error?.code)?.toBe('PGRST116');
  });

  it('6. error de consulta genérico (red, permisos) se devuelve como error controlado, no como excepción', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({
        data: null,
        error: { code: '500', message: 'internal error' },
      })),
    }));

    const { data, error } = await businessService?.getById('biz-error');

    expect(data)?.toBeNull();
    expect(error?.code)?.toBe('500');
  });

  it('resuelve la categoría padre desde category_ref.parent_id, nunca desde category.parent_id', async () => {
    let secondCall;
    let callCount = 0;
    supabase?.from?.mockImplementation((table) => {
      callCount += 1;
      if (callCount === 1) {
        expect(table)?.toBe('businesses');
        return {
          select: vi.fn(() => makeBuilder({
            data: { id: 'biz-1', category: 'Pizzería', category_ref: { id: 'cat-1', name: 'Pizzería', parent_id: 'cat-parent' } },
            error: null,
          })),
        };
      }
      secondCall = table;
      expect(table)?.toBe('categories');
      return {
        select: vi.fn(() => makeBuilder({ data: { id: 'cat-parent', name: 'Restaurantes' }, error: null })),
      };
    });

    const { data } = await businessService?.getById('biz-1');

    expect(secondCall)?.toBe('categories');
    expect(data?.category_ref?.parent)?.toEqual({ id: 'cat-parent', name: 'Restaurantes' });
    expect(data?.category)?.toBe('Pizzería');
  });
});

describe('businessService.searchSuggestions — filtrado por city_id (Fase 4)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  function mockBusinessesAndCategories(businessResult, categoryResult) {
    const businessBuilder = makeListBuilder(businessResult);
    const categoryBuilder = makeListBuilder(categoryResult);
    supabase?.from?.mockImplementation((table) => {
      if (table === 'businesses') return businessBuilder;
      if (table === 'categories') return categoryBuilder;
      throw new Error(`tabla inesperada en el mock: ${table}`);
    });
    return { businessBuilder, categoryBuilder };
  }

  it('con communityCityId válido, filtra la rama de negocios por city_id exactamente una vez, y la rama de categorías nunca recibe ese filtro', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const { businessBuilder, categoryBuilder } = mockBusinessesAndCategories(
      { data: [{ id: 'b1', name: 'Negocio Uno' }], error: null },
      { data: [{ id: 'c1', name: 'Categoría Uno', name_key: 'cat-1' }], error: null }
    );

    await businessService?.searchSuggestions('pizza', 6, cityId);

    const businessCityCalls = businessBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(businessCityCalls)?.toHaveLength(1);
    expect(businessCityCalls?.[0])?.toEqual(['city_id', cityId]);

    const categoryCityCalls = categoryBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(categoryCityCalls)?.toHaveLength(0);
    // La única llamada .eq() de categorías sigue siendo is_active, sin tocar.
    expect(categoryBuilder?.eq)?.toHaveBeenCalledWith('is_active', true);
  });

  it('con communityCityId null: la consulta de negocios continúa sin filtro, se emite el warning centralizado, y categorías se sigue consultando con normalidad', async () => {
    const { businessBuilder } = mockBusinessesAndCategories(
      { data: [{ id: 'b1', name: 'Negocio Uno' }], error: null },
      { data: [{ id: 'c1', name: 'Categoría Uno', name_key: 'cat-1' }], error: null }
    );

    const { businesses, categories } = await businessService?.searchSuggestions('pizza', 6, null);

    const businessCityCalls = businessBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(businessCityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('businessService.searchSuggestions');
    expect(businesses)?.toHaveLength(1);
    expect(categories)?.toHaveLength(1);
  });

  it('conserva el comportamiento previo de límite (6 negocios, 5 categorías) y de combinación de resultados', async () => {
    const { businessBuilder, categoryBuilder } = mockBusinessesAndCategories(
      { data: [{ id: 'b1', name: 'Negocio Uno', business_images: [] }], error: null },
      { data: [{ id: 'c1', name: 'Categoría Uno', name_key: 'cat-1' }], error: null }
    );

    const result = await businessService?.searchSuggestions(
      'pizza',
      6,
      '8aa2d628-719d-4810-9ee3-8efd230ab000'
    );

    expect(businessBuilder?.limit)?.toHaveBeenCalledWith(6);
    expect(categoryBuilder?.limit)?.toHaveBeenCalledWith(5);
    expect(result?.businesses)?.toHaveLength(1);
    expect(result?.categories)?.toEqual([{ id: 'c1', name: 'Categoría Uno', name_key: 'cat-1' }]);
    expect(result?.error)?.toBeNull();
  });
});

describe('businessService.getAll — filtrado por city_id (Fase 4)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  // Encadenable (select/in/eq/ilike/gte/order/range) y "thenable" — igual
  // que el query builder real de Supabase, awaitable directamente.
  function makeGetAllBuilder(result) {
    const builder = {};
    ['select', 'in', 'eq', 'ilike', 'gte', 'order', 'range']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  function mockGetAllQuery(result) {
    const builder = makeGetAllBuilder(result);
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('businesses');
      return builder;
    });
    return builder;
  }

  it('con communityCityId válido, filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = mockGetAllQuery({ data: [], count: 0, error: null });

    await businessService?.getAll({ communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = mockGetAllQuery({ data: [{ id: 'b1' }], count: 1, error: null });

    const result = await businessService?.getAll({ communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('businessService.getAll');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.count)?.toBe(1);
    expect(result?.error)?.toBeNull();
  });

  it('sin communityCityId (parámetro omitido → default null): mismo comportamiento que pasarlo explícito', async () => {
    const builder = mockGetAllQuery({ data: [], count: 0, error: null });

    await businessService?.getAll();

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
  });

  it('conserva categoría, búsqueda, rating, openNow, orden y paginación existentes junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = mockGetAllQuery({ data: [], count: 0, error: null });

    await businessService?.getAll({
      category: 'ferreteria',
      search: 'martillo',
      rating: '4',
      openNow: true,
      sort: 'rating',
      page: 2,
      pageSize: 10,
      communityCityId: cityId,
    });

    expect(builder?.in)?.toHaveBeenCalledWith('status', ['published', 'premium']);
    expect(builder?.eq)?.toHaveBeenCalledWith('category_key', 'ferreteria');
    expect(builder?.ilike)?.toHaveBeenCalledWith('name', '%martillo%');
    expect(builder?.gte)?.toHaveBeenCalledWith('rating', 4);
    expect(builder?.eq)?.toHaveBeenCalledWith('is_open', true);
    expect(builder?.eq)?.toHaveBeenCalledWith('city_id', cityId);
    expect(builder?.order)?.toHaveBeenCalledWith('rating', { ascending: false });
    expect(builder?.range)?.toHaveBeenCalledWith(10, 19);
  });

  it('conserva el orden por defecto (featured + rating) y la paginación de página 1 cuando no se especifica sort', async () => {
    const builder = mockGetAllQuery({ data: [], count: 0, error: null });

    await businessService?.getAll({ communityCityId: '8aa2d628-719d-4810-9ee3-8efd230ab000' });

    expect(builder?.order)?.toHaveBeenCalledWith('featured', { ascending: false });
    expect(builder?.order)?.toHaveBeenCalledWith('rating', { ascending: false });
    expect(builder?.range)?.toHaveBeenCalledWith(0, 11);
  });
});

describe('businessService.getFeatured — filtrado por city_id (Fase 4 / B2)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  // Encadenable (select/eq/in/order/limit) y "thenable" — igual que el
  // query builder real de Supabase, awaitable directamente sin un método
  // terminal explícito.
  function makeFeaturedBuilder(result) {
    const builder = {};
    ['select', 'eq', 'in', 'order', 'limit']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  it('acepta la firma por objeto { limit, communityCityId } y filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeFeaturedBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('businesses');
      return builder;
    });

    await businessService?.getFeatured({ limit: 6, communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('conserva select, featured=true, status published/premium, orden por rating y límite existentes junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeFeaturedBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('businesses');
      return builder;
    });

    await businessService?.getFeatured({ limit: 6, communityCityId: cityId });

    expect(builder?.select)?.toHaveBeenCalledWith('*, business_images(storage_path, alt_text, is_primary)');
    expect(builder?.eq)?.toHaveBeenCalledWith('featured', true);
    expect(builder?.in)?.toHaveBeenCalledWith('status', ['published', 'premium']);
    expect(builder?.order)?.toHaveBeenCalledWith('rating', { ascending: false });
    expect(builder?.limit)?.toHaveBeenCalledWith(6);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeFeaturedBuilder({ data: [{ id: 'b1' }], error: null });
    supabase?.from?.mockImplementation(() => builder);

    const result = await businessService?.getFeatured({ limit: 6, communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('businessService.getFeatured');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.error)?.toBeNull();
  });

  it('sin argumentos (todo por defecto): limit=6 y sin filtro de ciudad', async () => {
    const builder = makeFeaturedBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await businessService?.getFeatured();

    expect(builder?.limit)?.toHaveBeenCalledWith(6);
    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
  });
});
