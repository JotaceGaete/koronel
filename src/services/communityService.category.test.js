import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../config/city', () => ({
  getActiveCityId: () => 'city-coronel-test-id',
}));

import { supabase } from '../lib/supabase';
import { communityService, COMMUNITY_CATEGORIES, getCategoryLabel } from './communityService';

// Same minimal Supabase query-builder stand-in used across the other communityService test
// files.
function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    or: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('COMMUNITY_CATEGORIES / getCategoryLabel', () => {
  it('has exactly the six Fase 1 categories with stable keys', () => {
    expect(COMMUNITY_CATEGORIES?.map(c => c?.key))?.toEqual([
      'services', 'recommendations', 'security', 'community', 'general', 'polls',
    ]);
  });

  it('maps each key to its full display label', () => {
    expect(getCategoryLabel('services'))?.toBe('Servicios y datos');
    expect(getCategoryLabel('recommendations'))?.toBe('Recomendaciones');
    expect(getCategoryLabel('security'))?.toBe('Seguridad');
    expect(getCategoryLabel('community'))?.toBe('Barrio y comunidad');
    expect(getCategoryLabel('general'))?.toBe('Consultas generales');
    expect(getCategoryLabel('polls'))?.toBe('Encuestas');
  });

  it('falls back to the "general" label for an unknown/missing key (old posts with no category)', () => {
    expect(getCategoryLabel(undefined))?.toBe('Consultas generales');
    expect(getCategoryLabel(null))?.toBe('Consultas generales');
    expect(getCategoryLabel('not-a-real-category'))?.toBe('Consultas generales');
  });
});

describe('communityService.createPost persists category_key', () => {
  it('persists the chosen, valid category key', async () => {
    let insertedPayload;
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        return {
          insert: vi.fn((payload) => {
            insertedPayload = payload;
            return makeBuilder({ data: { id: 'post-1', ...payload }, error: null });
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.createPost({
      title: '¿Alguien conoce un buen mecánico?',
      body: 'Se me rompió el auto.',
      sector: 'Centro',
      userId: 'user-1',
      categoryKey: 'services',
    });

    expect(error)?.toBeNull();
    expect(insertedPayload?.category_key)?.toBe('services');
    expect(data?.category_key)?.toBe('services');
  });

  it('falls back to "general" when no category is given (old client, compatibility)', async () => {
    let insertedPayload;
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        return {
          insert: vi.fn((payload) => {
            insertedPayload = payload;
            return makeBuilder({ data: { id: 'post-1', ...payload }, error: null });
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    await communityService?.createPost({ title: 'x', body: 'y', sector: 'Centro', userId: 'user-1' });

    expect(insertedPayload?.category_key)?.toBe('general');
  });

  it('falls back to "general" rather than persisting an unrecognized/garbage category key', async () => {
    let insertedPayload;
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        return {
          insert: vi.fn((payload) => {
            insertedPayload = payload;
            return makeBuilder({ data: { id: 'post-1', ...payload }, error: null });
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    await communityService?.createPost({
      title: 'x', body: 'y', sector: 'Centro', userId: 'user-1', categoryKey: 'not-a-real-category',
    });

    expect(insertedPayload?.category_key)?.toBe('general');
  });
});

describe('communityService.createPoll always assigns the "polls" category', () => {
  it('ignores any topical category and always persists category_key: "polls"', async () => {
    let insertedPayload;
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        return {
          insert: vi.fn((payload) => {
            insertedPayload = payload;
            return makeBuilder({ data: { id: 'post-1', ...payload }, error: null });
          }),
        };
      }
      if (table === 'community_polls') {
        return makeBuilder({ data: { id: 'poll-1', post_id: 'post-1', status: 'open', closes_at: null }, error: null });
      }
      if (table === 'community_poll_options') {
        return makeBuilder({
          data: [
            { id: 'opt-1', poll_id: 'poll-1', label: 'Feria', position: 0, vote_count: 0 },
            { id: 'opt-2', poll_id: 'poll-1', label: 'Supermercado', position: 1, vote_count: 0 },
          ],
          error: null,
        });
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.createPoll({
      title: '¿Dónde compras frutas y verduras?',
      body: '',
      sector: 'Centro',
      userId: 'user-1',
      options: ['Feria', 'Supermercado'],
      closesAt: null,
    });

    expect(error)?.toBeNull();
    expect(insertedPayload?.category_key)?.toBe('polls');
    expect(data?.category_key)?.toBe('polls');
  });
});

describe('communityService.getPosts filters by category_key from the query, not in React', () => {
  it('adds .eq("category_key", ...) to the query when a specific category is requested', async () => {
    let postsBuilder;
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        postsBuilder = makeBuilder({ data: [{ id: 'post-1', category_key: 'security' }], error: null, count: 1 });
        return postsBuilder;
      }
      if (table === 'community_replies') return makeBuilder({ data: [], error: null });
      if (table === 'community_polls') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.getPosts({ categoryKey: 'security' });

    expect(error)?.toBeNull();
    expect(postsBuilder?.eq?.mock?.calls)?.toContainEqual(['category_key', 'security']);
    expect(data?.every(p => p?.category_key === 'security'))?.toBe(true);
  });

  it('does not filter by category_key when "all" (or nothing) is requested', async () => {
    let postsBuilder;
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        postsBuilder = makeBuilder({ data: [{ id: 'post-1' }, { id: 'post-2' }], error: null, count: 2 });
        return postsBuilder;
      }
      if (table === 'community_replies') return makeBuilder({ data: [], error: null });
      if (table === 'community_polls') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.getPosts({ categoryKey: 'all' });

    expect(error)?.toBeNull();
    expect(postsBuilder?.eq?.mock?.calls?.some(call => call?.[0] === 'category_key'))?.toBe(false);
    expect(data)?.toHaveLength(2);
  });
});

describe('communityService.adminGetPosts compatibility with category_key', () => {
  it('still returns posts (select("*") already includes category_key, no query change needed)', async () => {
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        return makeBuilder({
          data: [
            { id: 'post-1', title: 'Vieja sin categoría', category_key: 'general' },
            { id: 'post-2', title: 'Nueva con categoría', category_key: 'security' },
          ],
          error: null,
        });
      }
      if (table === 'community_polls') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.adminGetPosts();

    expect(error)?.toBeNull();
    expect(data?.find(p => p?.id === 'post-1')?.category_key)?.toBe('general');
    expect(data?.find(p => p?.id === 'post-2')?.category_key)?.toBe('security');
  });
});
