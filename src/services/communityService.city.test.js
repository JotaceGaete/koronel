import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// getActiveCityId() is exercised as a black box here (its own default/env-fallback logic is
// not the point of these tests) — communityService just needs to persist/filter by whatever
// it returns, and never fall back to a hardcoded literal of its own.
const CORONEL_ID = 'city-coronel-test-id';
vi.mock('../config/city', () => ({
  getActiveCityId: () => CORONEL_ID,
}));

import { supabase } from '../lib/supabase';
import { communityService } from './communityService';

// Same minimal Supabase query-builder stand-in used in communityService.polls.test.js.
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

describe('communityService city_id behavior', () => {
  it('createPost() always persists the active city id on a new question (Pregunta)', async () => {
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
      body: 'Se me rompió el auto en el sector Centro.',
      sector: 'Centro',
      userId: 'user-1',
    });

    expect(error)?.toBeNull();
    expect(insertedPayload?.city_id)?.toBe(CORONEL_ID);
    expect(data?.city_id)?.toBe(CORONEL_ID);
  });

  it('createPoll() also persists the active city id, via the same createPost() insert', async () => {
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
    expect(insertedPayload?.city_id)?.toBe(CORONEL_ID);
    expect(data?.city_id)?.toBe(CORONEL_ID);
  });

  it('a post is never created with city_id = null/undefined, even without the caller passing one', async () => {
    let insertedPayload;
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        return {
          insert: vi.fn((payload) => {
            insertedPayload = payload;
            return makeBuilder({ data: { id: 'post-3', ...payload }, error: null });
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    // post-community-question-form never passes a city — createPost() must resolve it itself.
    await communityService?.createPost({ title: 'x', body: 'y', sector: 'Centro', userId: 'user-1' });

    expect(insertedPayload)?.toHaveProperty('city_id');
    expect(insertedPayload?.city_id)?.not.toBeNull();
    expect(insertedPayload?.city_id)?.not.toBeUndefined();
  });

  it('getPosts() (the public /comunidad listing) filters to active posts of the active city only', async () => {
    let postsBuilder;
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        postsBuilder = makeBuilder({
          data: [{ id: 'post-1', city_id: CORONEL_ID, status: 'active' }],
          error: null,
          count: 1,
        });
        return postsBuilder;
      }
      if (table === 'community_replies') return makeBuilder({ data: [], error: null });
      if (table === 'community_polls') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.getPosts();

    expect(error)?.toBeNull();
    expect(postsBuilder?.eq?.mock?.calls)?.toContainEqual(['status', 'active']);
    expect(postsBuilder?.eq?.mock?.calls)?.toContainEqual(['city_id', CORONEL_ID]);
    expect(data?.every(p => p?.city_id === CORONEL_ID))?.toBe(true);
  });
});
