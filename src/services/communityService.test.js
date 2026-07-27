import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import { communityService } from './communityService';

// Encadenable (select/eq/not) y "thenable" — igual que el query builder
// real de Supabase, awaitable directamente sin un método terminal explícito.
function makeMapPostsBuilder(result) {
  const builder = {};
  ['select', 'eq', 'not']?.forEach((method) => {
    builder[method] = vi.fn(() => builder);
  });
  builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
  return builder;
}

describe('communityService.getCommunityPostsForMap — filtrado por city_id (Fase 4 / B6)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  it('acepta la firma por objeto { communityCityId } y filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeMapPostsBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('community_posts');
      return builder;
    });

    await communityService?.getCommunityPostsForMap({ communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('conserva el filtro de status activo y las condiciones de lat/lng no nulas junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makeMapPostsBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await communityService?.getCommunityPostsForMap({ communityCityId: cityId });

    expect(builder?.eq)?.toHaveBeenCalledWith('status', 'active');
    expect(builder?.not)?.toHaveBeenCalledWith('lat', 'is', null);
    expect(builder?.not)?.toHaveBeenCalledWith('lng', 'is', null);
    expect(builder?.eq)?.toHaveBeenCalledWith('city_id', cityId);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makeMapPostsBuilder({
      data: [{ id: 'post-1', lat: -37.03, lng: -73.14 }],
      error: null,
    });
    supabase?.from?.mockImplementation(() => builder);

    const result = await communityService?.getCommunityPostsForMap({ communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('communityService.getCommunityPostsForMap');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.error)?.toBeNull();
  });

  it('sin argumentos (parámetro omitido → default null): mismo comportamiento que pasarlo explícito', async () => {
    const builder = makeMapPostsBuilder({ data: [], error: null });
    supabase?.from?.mockImplementation(() => builder);

    await communityService?.getCommunityPostsForMap();

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
  });
});
