import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: mockRpc },
}));

import { supabase } from '../lib/supabase';
import { jobService } from './jobService';

describe('jobService.getPublished — filtrado por city_id (Fase 4 / B4)', () => {
  let warnSpy;

  beforeEach(() => {
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  // Encadenable (select/eq/or/order/range) y "thenable" — igual que el
  // query builder real de Supabase, awaitable directamente sin un método
  // terminal explícito.
  function makeGetPublishedBuilder(result) {
    const builder = {};
    ['select', 'eq', 'or', 'order', 'range']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  it('con communityCityId válido, filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetPublishedBuilder({ data: [], count: 0, error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('jobs');
      return builder;
    });

    await jobService?.getPublished({ communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('conserva select, status, búsqueda, categoría, modalidad, tipo, orden y paginación existentes junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetPublishedBuilder({ data: [], count: 0, error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('jobs');
      return builder;
    });

    await jobService?.getPublished({
      search: 'diseñador',
      category: 'Tecnología',
      modality: 'Remoto',
      type: 'Full-time',
      page: 2,
      pageSize: 10,
      communityCityId: cityId,
    });

    expect(builder?.select)?.toHaveBeenCalledWith('*', { count: 'exact' });
    expect(builder?.eq)?.toHaveBeenCalledWith('status', 'published');
    expect(builder?.or)?.toHaveBeenCalledWith('title.ilike.%diseñador%,company.ilike.%diseñador%,location.ilike.%diseñador%');
    expect(builder?.eq)?.toHaveBeenCalledWith('category', 'Tecnología');
    expect(builder?.eq)?.toHaveBeenCalledWith('modality', 'Remoto');
    expect(builder?.eq)?.toHaveBeenCalledWith('type', 'Full-time');
    expect(builder?.eq)?.toHaveBeenCalledWith('city_id', cityId);
    expect(builder?.order)?.toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder?.range)?.toHaveBeenCalledWith(10, 19);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeGetPublishedBuilder({ data: [{ id: 'job-1' }], count: 1, error: null });
    supabase?.from?.mockImplementation(() => builder);

    const result = await jobService?.getPublished({ communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('jobService.getPublished');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.count)?.toBe(1);
    expect(result?.error)?.toBeNull();
  });

  it('sin communityCityId (parámetro omitido → default null): mismo comportamiento que pasarlo explícito', async () => {
    const builder = makeGetPublishedBuilder({ data: [], count: 0, error: null });
    supabase?.from?.mockImplementation(() => builder);

    await jobService?.getPublished();

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
  });

  it('sigue llamando a checkExpiry (rpc check_job_expiry) antes de consultar, sin relación con el filtro de ciudad', async () => {
    const builder = makeGetPublishedBuilder({ data: [], count: 0, error: null });
    supabase?.from?.mockImplementation(() => builder);

    await jobService?.getPublished({ communityCityId: '8aa2d628-719d-4810-9ee3-8efd230ab000' });

    expect(mockRpc)?.toHaveBeenCalledWith('check_job_expiry');
  });
});

describe('jobService.getLatest — filtrado por city_id (Fase 4 / B4)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  // Encadenable (select/eq/order/limit) y "thenable".
  function makeGetLatestBuilder(result) {
    const builder = {};
    ['select', 'eq', 'order', 'limit']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  it('acepta la firma por objeto { limit, communityCityId } y filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetLatestBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('jobs');
      return builder;
    });

    await jobService?.getLatest({ limit: 4, communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('conserva select, status, orden y límite existentes junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeGetLatestBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await jobService?.getLatest({ limit: 4, communityCityId: cityId });

    expect(builder?.select)?.toHaveBeenCalledWith('*');
    expect(builder?.eq)?.toHaveBeenCalledWith('status', 'published');
    expect(builder?.order)?.toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder?.limit)?.toHaveBeenCalledWith(4);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeGetLatestBuilder({ data: [{ id: 'job-1' }], error: null });
    supabase?.from?.mockImplementation(() => builder);

    const result = await jobService?.getLatest({ limit: 4, communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('jobService.getLatest');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.error)?.toBeNull();
  });

  it('sin argumentos (todo por defecto): limit=4 y sin filtro de ciudad', async () => {
    const builder = makeGetLatestBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await jobService?.getLatest();

    expect(builder?.limit)?.toHaveBeenCalledWith(4);
    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
  });

  it('firma por objeto con limit=6 y communityCityId: usa límite 6 y filtra por esa ciudad', async () => {
    const builder = makeGetLatestBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await jobService?.getLatest({ limit: 6, communityCityId: 'city-a' });

    expect(builder?.limit)?.toHaveBeenCalledWith(6);
    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', 'city-a']);
  });
});
