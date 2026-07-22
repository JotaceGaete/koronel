import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import {
  publicServicesService,
  PUBLIC_SERVICE_CATEGORIES,
  getPublicServiceCategoryLabel,
} from './publicServicesService';

function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PUBLIC_SERVICE_CATEGORIES / getPublicServiceCategoryLabel', () => {
  it('has exactly the four categories requested for this module', () => {
    expect(PUBLIC_SERVICE_CATEGORIES?.map(c => c?.key))?.toEqual([
      'instituciones_publicas', 'salud', 'emergencias', 'atencion_ciudadana',
    ]);
  });

  it('maps each key to its display label', () => {
    expect(getPublicServiceCategoryLabel('salud'))?.toBe('Salud');
    expect(getPublicServiceCategoryLabel('emergencias'))?.toBe('Emergencias');
  });
});

describe('publicServicesService.getAll', () => {
  it('reads exclusively from public_services — never touches businesses or classified_ads', async () => {
    let queriedTable;
    supabase?.from?.mockImplementation((table) => {
      queriedTable = table;
      return makeBuilder({ data: [{ id: 'svc-1', name: 'Municipalidad de Coronel' }], error: null });
    });

    const { data, error } = await publicServicesService?.getAll();

    expect(error)?.toBeNull();
    expect(queriedTable)?.toBe('public_services');
    expect(supabase?.from)?.not?.toHaveBeenCalledWith('businesses');
    expect(supabase?.from)?.not?.toHaveBeenCalledWith('classified_ads');
    expect(data)?.toHaveLength(1);
  });

  it('filters by category_key from the query when a valid category is given', async () => {
    let builder;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: [], error: null });
      return builder;
    });

    await publicServicesService?.getAll({ categoryKey: 'salud' });

    expect(builder?.eq?.mock?.calls)?.toContainEqual(['category_key', 'salud']);
  });

  it('ignores an invalid category key instead of sending it to the database', async () => {
    let builder;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: [], error: null });
      return builder;
    });

    await publicServicesService?.getAll({ categoryKey: 'not-a-real-category' });

    expect(builder?.eq?.mock?.calls?.some(call => call?.[0] === 'category_key'))?.toBe(false);
  });

  it('returns an empty list (not a throw) when the query errors, e.g. table not migrated yet', async () => {
    supabase?.from?.mockImplementation(() => makeBuilder({ data: null, error: new Error('relation does not exist') }));

    const { data, error } = await publicServicesService?.getAll();

    expect(error)?.toBeTruthy();
    expect(data)?.toEqual([]);
  });
});

describe('publicServicesService.getById', () => {
  it('fetches a single published service by id', async () => {
    let builder;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: { id: 'svc-1', name: 'Hospital San José de Coronel' }, error: null });
      return builder;
    });

    const { data, error } = await publicServicesService?.getById('svc-1');

    expect(error)?.toBeNull();
    expect(data?.id)?.toBe('svc-1');
    expect(builder?.eq?.mock?.calls)?.toContainEqual(['id', 'svc-1']);
  });
});

describe('publicServicesService.submitReport', () => {
  it('rejects an empty message before hitting the database', async () => {
    const { data, error } = await publicServicesService?.submitReport({ serviceId: 'svc-1', message: '   ' });

    expect(data)?.toBeNull();
    expect(error)?.toBeTruthy();
    expect(supabase?.from)?.not?.toHaveBeenCalled();
  });

  it('inserts into public_service_reports, never into public_services itself', async () => {
    let queriedTable;
    let insertedPayload;
    supabase?.from?.mockImplementation((table) => {
      queriedTable = table;
      return {
        insert: vi.fn((payload) => {
          insertedPayload = payload;
          return makeBuilder({ data: { id: 'report-1', ...payload }, error: null });
        }),
      };
    });

    const { error } = await publicServicesService?.submitReport({
      serviceId: 'svc-1',
      name: 'Vecino',
      email: 'vecino@example.com',
      message: 'El teléfono cambió',
    });

    expect(error)?.toBeNull();
    expect(queriedTable)?.toBe('public_service_reports');
    expect(insertedPayload?.service_id)?.toBe('svc-1');
    expect(insertedPayload?.message)?.toBe('El teléfono cambió');
  });
});
