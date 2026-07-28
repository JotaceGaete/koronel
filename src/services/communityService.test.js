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

describe('communityService.getPosts — filtrado por city_id (Fase 4 / B5)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  // Encadenable (select/eq/or/order/range) y "thenable" — igual que el
  // query builder real de Supabase, awaitable directamente sin un método
  // terminal explícito. La consulta secundaria de reply_count (tabla
  // community_replies) usa un builder separado más simple, ver
  // makeRepliesBuilder.
  function makePostsBuilder(result) {
    const builder = {};
    ['select', 'eq', 'or', 'order', 'range']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  function makeRepliesBuilder(result) {
    const builder = {};
    ['select', 'in', 'eq']?.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.then = (resolve, reject) => Promise.resolve(result)?.then(resolve, reject);
    return builder;
  }

  function mockPostsAndReplies(postsResult, repliesResult = { data: [], error: null }) {
    const postsBuilder = makePostsBuilder(postsResult);
    const repliesBuilder = makeRepliesBuilder(repliesResult);
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') return postsBuilder;
      if (table === 'community_replies') return repliesBuilder;
      throw new Error(`tabla inesperada en el mock: ${table}`);
    });
    return { postsBuilder, repliesBuilder };
  }

  it('con communityCityId válido, filtra por city_id exactamente una vez, y la consulta de reply_count nunca recibe ese filtro', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const { postsBuilder, repliesBuilder } = mockPostsAndReplies({
      data: [{ id: 'post-1' }],
      count: 1,
      error: null,
    });

    await communityService?.getPosts({ communityCityId: cityId });

    const cityCalls = postsBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);

    const repliesCityCalls = repliesBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(repliesCityCalls)?.toHaveLength(0);
  });

  it('conserva select, status, sector, búsqueda, orden y paginación existentes junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const { postsBuilder } = mockPostsAndReplies({ data: [], count: 0, error: null });

    await communityService?.getPosts({
      sector: 'Centro',
      search: 'agua',
      sort: 'votes',
      page: 2,
      pageSize: 10,
      communityCityId: cityId,
    });

    expect(postsBuilder?.select)?.toHaveBeenCalledWith(
      '*, author:user_profiles(id, full_name, avatar_url)',
      { count: 'exact' }
    );
    expect(postsBuilder?.eq)?.toHaveBeenCalledWith('status', 'active');
    expect(postsBuilder?.eq)?.toHaveBeenCalledWith('sector', 'Centro');
    expect(postsBuilder?.or)?.toHaveBeenCalledWith('title.ilike.%agua%,body.ilike.%agua%');
    expect(postsBuilder?.eq)?.toHaveBeenCalledWith('city_id', cityId);
    expect(postsBuilder?.order)?.toHaveBeenCalledWith('upvote_count', { ascending: false });
    expect(postsBuilder?.range)?.toHaveBeenCalledWith(10, 19);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const { postsBuilder } = mockPostsAndReplies({ data: [{ id: 'post-1' }], count: 1, error: null });

    const result = await communityService?.getPosts({ communityCityId: null });

    const cityCalls = postsBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('communityService.getPosts');
    expect(result?.data)?.toHaveLength(1);
    expect(result?.count)?.toBe(1);
    expect(result?.error)?.toBeNull();
  });

  it('sin communityCityId (parámetro omitido → default null): mismo comportamiento que pasarlo explícito', async () => {
    const { postsBuilder } = mockPostsAndReplies({ data: [], count: 0, error: null });

    await communityService?.getPosts();

    const cityCalls = postsBuilder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
  });

  it('sigue calculando reply_count desde community_replies y lo agrega a cada post (comportamiento intacto)', async () => {
    mockPostsAndReplies(
      { data: [{ id: 'post-1' }, { id: 'post-2' }], count: 2, error: null },
      { data: [{ post_id: 'post-1' }, { post_id: 'post-1' }, { post_id: 'post-2' }], error: null }
    );

    const result = await communityService?.getPosts({ communityCityId: '8aa2d628-719d-4810-9ee3-8efd230ab000' });

    expect(result?.data)?.toEqual([
      { id: 'post-1', reply_count: 2 },
      { id: 'post-2', reply_count: 1 },
    ]);
  });

  it('un error en la consulta principal se devuelve controlado, sin lanzar excepción', async () => {
    mockPostsAndReplies({ data: null, count: 0, error: { code: '500', message: 'fail' } });

    const result = await communityService?.getPosts({ communityCityId: '8aa2d628-719d-4810-9ee3-8efd230ab000' });

    expect(result?.data)?.toEqual([]);
    expect(result?.count)?.toBe(0);
    expect(result?.error)?.toEqual({ code: '500', message: 'fail' });
  });
});
