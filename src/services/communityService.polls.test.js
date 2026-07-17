import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { supabase } from '../lib/supabase';
import { communityService } from './communityService';

// Minimal stand-in for the Supabase query builder: every chain method returns the same
// object (so `.select().eq().order()` etc. all work regardless of order/count), and the
// object itself is thenable, matching how supabase-js resolves a query when awaited
// directly (with or without a terminal `.single()`/`.maybeSingle()`).
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

describe('communityService.isPollClosed', () => {
  it('returns false for a missing poll', () => {
    expect(communityService?.isPollClosed(null))?.toBe(false);
  });

  it('returns true once status is closed, regardless of closes_at', () => {
    expect(communityService?.isPollClosed({ status: 'closed', closes_at: null }))?.toBe(true);
  });

  it('returns false for an open poll with no closing date', () => {
    expect(communityService?.isPollClosed({ status: 'open', closes_at: null }))?.toBe(false);
  });

  it('returns false for an open poll whose closing date is still in the future', () => {
    const future = new Date(Date.now() + 60_000)?.toISOString();
    expect(communityService?.isPollClosed({ status: 'open', closes_at: future }))?.toBe(false);
  });

  it('returns true for an open poll whose closing date has already passed', () => {
    const past = new Date(Date.now() - 60_000)?.toISOString();
    expect(communityService?.isPollClosed({ status: 'open', closes_at: past }))?.toBe(true);
  });
});

describe('communityService.createPoll', () => {
  const baseArgs = {
    title: '¿Dónde compras frutas y verduras?',
    body: '',
    sector: 'Centro',
    lat: null,
    lng: null,
    userId: 'user-1',
    options: ['Feria', 'Supermercado', 'Verdulería', 'Otro'],
    closesAt: null,
  };

  it('rejects fewer than 2 options without ever calling supabase', async () => {
    const { data, error } = await communityService?.createPoll({ ...baseArgs, options: ['Feria'] });
    expect(data)?.toBeNull();
    expect(error)?.toBeInstanceOf(Error);
    expect(supabase?.from)?.not?.toHaveBeenCalled();
  });

  it('rejects more than 6 options without ever calling supabase', async () => {
    const { data, error } = await communityService?.createPoll({
      ...baseArgs,
      options: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    expect(data)?.toBeNull();
    expect(error)?.toBeInstanceOf(Error);
    expect(supabase?.from)?.not?.toHaveBeenCalled();
  });

  it('ignores blank options when counting toward the 2-6 range', async () => {
    const { data, error } = await communityService?.createPoll({ ...baseArgs, options: ['Feria', '   '] });
    expect(data)?.toBeNull();
    expect(error)?.toBeInstanceOf(Error);
  });

  it('creates the post, the poll and its options, and returns them nested with options ordered by position', async () => {
    const post = { id: 'post-1', title: baseArgs?.title, body: '', sector: 'Centro' };
    const poll = { id: 'poll-1', post_id: 'post-1', closes_at: null, status: 'open' };
    const options = [
      { id: 'opt-2', poll_id: 'poll-1', label: 'Supermercado', position: 1, vote_count: 0 },
      { id: 'opt-1', poll_id: 'poll-1', label: 'Feria', position: 0, vote_count: 0 },
      { id: 'opt-4', poll_id: 'poll-1', label: 'Otro', position: 3, vote_count: 0 },
      { id: 'opt-3', poll_id: 'poll-1', label: 'Verdulería', position: 2, vote_count: 0 },
    ];

    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') return makeBuilder({ data: post, error: null });
      if (table === 'community_polls') return makeBuilder({ data: poll, error: null });
      if (table === 'community_poll_options') return makeBuilder({ data: options, error: null });
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.createPoll(baseArgs);

    expect(error)?.toBeNull();
    expect(data?.id)?.toBe('post-1');
    expect(data?.poll?.id)?.toBe('poll-1');
    expect(data?.poll?.options?.map(o => o?.label))?.toEqual(['Feria', 'Supermercado', 'Verdulería', 'Otro']);
  });

  it('rolls back the post (relying on ON DELETE CASCADE) when the poll insert fails', async () => {
    const post = { id: 'post-1' };
    const deleteEq = vi.fn(() => Promise.resolve({ error: null }));

    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: post, error: null })) })),
          })),
          delete: vi.fn(() => ({ eq: deleteEq })),
        };
      }
      if (table === 'community_polls') return makeBuilder({ data: null, error: new Error('boom') });
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.createPoll(baseArgs);

    expect(data)?.toBeNull();
    expect(error)?.toBeTruthy();
    expect(deleteEq)?.toHaveBeenCalledWith('id', 'post-1');
  });

  it('rolls back the post when the options insert fails', async () => {
    const post = { id: 'post-1' };
    const poll = { id: 'poll-1', post_id: 'post-1' };
    const deleteEq = vi.fn(() => Promise.resolve({ error: null }));

    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: post, error: null })) })),
          })),
          delete: vi.fn(() => ({ eq: deleteEq })),
        };
      }
      if (table === 'community_polls') return makeBuilder({ data: poll, error: null });
      if (table === 'community_poll_options') return makeBuilder({ data: null, error: new Error('boom') });
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.createPoll(baseArgs);

    expect(data)?.toBeNull();
    expect(error)?.toBeTruthy();
    expect(deleteEq)?.toHaveBeenCalledWith('id', 'post-1');
  });
});

describe('communityService.getUserPollVote', () => {
  it('returns null without calling supabase when userId or pollId is missing', async () => {
    const { data, error } = await communityService?.getUserPollVote(null, 'poll-1');
    expect(data)?.toBeNull();
    expect(error)?.toBeNull();
    expect(supabase?.from)?.not?.toHaveBeenCalled();
  });

  it('returns the voted option id for the given user and poll', async () => {
    supabase?.from?.mockImplementation(() => makeBuilder({ data: { option_id: 'opt-2' }, error: null }));
    const { data, error } = await communityService?.getUserPollVote('user-1', 'poll-1');
    expect(error)?.toBeNull();
    expect(data)?.toEqual({ option_id: 'opt-2' });
  });

  it('returns null when the user has not voted (maybeSingle finds nothing)', async () => {
    supabase?.from?.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const { data, error } = await communityService?.getUserPollVote('user-1', 'poll-1');
    expect(error)?.toBeNull();
    expect(data)?.toBeNull();
  });
});

describe('communityService.getUserPollVotesForPosts', () => {
  it('returns an empty list without calling supabase for an empty pollIds list', async () => {
    const { data, error } = await communityService?.getUserPollVotesForPosts('user-1', []);
    expect(data)?.toEqual([]);
    expect(error)?.toBeNull();
    expect(supabase?.from)?.not?.toHaveBeenCalled();
  });

  it('batches votes for several polls into a single query', async () => {
    const rows = [
      { poll_id: 'poll-1', option_id: 'opt-1' },
      { poll_id: 'poll-2', option_id: 'opt-5' },
    ];
    supabase?.from?.mockImplementation(() => makeBuilder({ data: rows, error: null }));
    const { data, error } = await communityService?.getUserPollVotesForPosts('user-1', ['poll-1', 'poll-2']);
    expect(error)?.toBeNull();
    expect(data)?.toEqual(rows);
    expect(supabase?.from)?.toHaveBeenCalledTimes(1);
  });
});

describe('communityService.castPollVote', () => {
  it('calls the cast_poll_vote RPC with the poll and option ids, and sorts the returned options by position', async () => {
    const options = [
      { id: 'opt-2', position: 1, vote_count: 43 },
      { id: 'opt-1', position: 0, vote_count: 85 },
    ];
    supabase.rpc?.mockResolvedValue({ data: options, error: null });

    const { data, error } = await communityService?.castPollVote({ pollId: 'poll-1', optionId: 'opt-1' });

    expect(supabase?.rpc)?.toHaveBeenCalledWith('cast_poll_vote', { p_poll_id: 'poll-1', p_option_id: 'opt-1' });
    expect(error)?.toBeNull();
    expect(data?.map(o => o?.id))?.toEqual(['opt-1', 'opt-2']);
  });

  it('surfaces an error from the RPC (e.g. a closed poll rejected server-side) without throwing', async () => {
    supabase.rpc?.mockResolvedValue({ data: null, error: new Error('La encuesta está cerrada o no existe') });
    const { data, error } = await communityService?.castPollVote({ pollId: 'poll-1', optionId: 'opt-1' });
    expect(data)?.toBeNull();
    expect(error)?.toBeInstanceOf(Error);
  });
});

describe('communityService.adminClosePoll', () => {
  it('updates the poll status to closed', async () => {
    const eqMock = vi.fn(() => Promise.resolve({ error: null }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    supabase?.from?.mockImplementation(() => ({ update: updateMock }));

    const { error } = await communityService?.adminClosePoll('poll-1');

    expect(error)?.toBeNull();
    expect(updateMock)?.toHaveBeenCalledWith({ status: 'closed' });
    expect(eqMock)?.toHaveBeenCalledWith('id', 'poll-1');
  });
});

describe('communityService.getPosts / getPostById poll fetch (independent query, not embedded)', () => {
  it('getPosts fetches polls in their own query and sorts each poll\'s options by position', async () => {
    const rows = [{ id: 'post-1' }, { id: 'post-2' }];
    const polls = [
      {
        id: 'poll-1',
        post_id: 'post-1',
        options: [
          { id: 'opt-2', position: 1 },
          { id: 'opt-1', position: 0 },
        ],
      },
    ];

    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') return makeBuilder({ data: rows, error: null, count: 2 });
      if (table === 'community_replies') return makeBuilder({ data: [], error: null });
      if (table === 'community_polls') return makeBuilder({ data: polls, error: null });
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.getPosts();

    expect(error)?.toBeNull();
    expect(supabase?.from)?.toHaveBeenCalledWith('community_posts');
    expect(supabase?.from)?.toHaveBeenCalledWith('community_polls');
    expect(data?.[0]?.poll?.options?.map(o => o?.id))?.toEqual(['opt-1', 'opt-2']);
    expect(data?.[1]?.poll)?.toBeNull();
  });

  it('getPosts still returns every post (with poll: null) when the community_polls query fails', async () => {
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') return makeBuilder({ data: [{ id: 'post-1' }], error: null, count: 1 });
      if (table === 'community_replies') return makeBuilder({ data: [], error: null });
      if (table === 'community_polls') {
        return makeBuilder({ data: null, error: new Error('column community_polls_1.status does not exist') });
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.getPosts();

    expect(error)?.toBeNull();
    expect(data)?.toHaveLength(1);
    expect(data?.[0]?.poll)?.toBeNull();
  });

  it('getPostById returns poll: null untouched for a Pregunta, and sorted options for an Encuesta', async () => {
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') return makeBuilder({ data: { id: 'post-1' }, error: null });
      if (table === 'community_polls') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table ${table}`);
    });
    const { data, error } = await communityService?.getPostById('post-1');
    expect(error)?.toBeNull();
    expect(data?.poll)?.toBeNull();
  });
});

describe('communityService.adminGetPosts (posts and polls fetched independently)', () => {
  const pendingQuestion = { id: 'post-1', title: '¿Alguien conoce un buen mecánico?', status: 'pending' };
  const pendingPollPost = { id: 'post-2', title: '¿Dónde compras frutas y verduras?', status: 'pending' };
  const activePost = { id: 'post-3', title: '¿Cuál es la mejor cafetería?', status: 'active' };
  const pollRow = { id: 'poll-1', post_id: 'post-2', status: 'open', closes_at: null };

  it('returns pending questions, pending polls (merged from the second query) and active posts together', async () => {
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        return makeBuilder({ data: [pendingQuestion, pendingPollPost, activePost], error: null });
      }
      if (table === 'community_polls') return makeBuilder({ data: [pollRow], error: null });
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.adminGetPosts();

    expect(error)?.toBeNull();
    expect(data)?.toHaveLength(3);
    expect(data?.find(p => p?.id === 'post-1')?.poll)?.toBeNull();
    expect(data?.find(p => p?.id === 'post-2')?.poll)?.toEqual(pollRow);
    expect(data?.find(p => p?.id === 'post-3')?.status)?.toBe('active');
  });

  it('still returns every post (with poll: null) when the community_polls query fails, instead of failing the whole panel', async () => {
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') {
        return makeBuilder({ data: [pendingQuestion, pendingPollPost, activePost], error: null });
      }
      if (table === 'community_polls') {
        return makeBuilder({ data: null, error: new Error('column community_polls_1.status does not exist') });
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.adminGetPosts();

    expect(error)?.toBeNull();
    expect(data)?.toHaveLength(3);
    expect(data?.every(p => p?.poll === null))?.toBe(true);
  });

  it('fails the whole request only when community_posts itself errors', async () => {
    supabase?.from?.mockImplementation((table) => {
      if (table === 'community_posts') return makeBuilder({ data: null, error: new Error('boom') });
      throw new Error(`unexpected table ${table}`);
    });

    const { data, error } = await communityService?.adminGetPosts();

    expect(error)?.toBeTruthy();
    expect(data)?.toEqual([]);
  });
});
