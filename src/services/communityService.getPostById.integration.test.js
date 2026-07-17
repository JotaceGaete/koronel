import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// Real integration test for the exact question the user raised: does getPostById() actually
// attach `poll` (and `poll.options`) to a post that genuinely has a community_polls row,
// end-to-end, through the real query/merge logic in communityService.js — not a raw SQL check
// of the RPC (already covered by communityService.pollVote.integration.test.js), and not a mock
// of supabase.from() that just echoes back whatever the test hands it.
//
// `../lib/supabase` is mocked with a tiny adapter that translates the exact three independent
// .from(table).select(...) chains communityService.js actually issues (community_posts,
// community_polls, community_poll_options — never a nested embed of one inside another) into
// real SQL run against a real Postgres loaded with this repo's real migrations, executed AS THE
// anon Postgres role with RLS genuinely enforced (not bypassed), matching exactly what an
// unauthenticated visitor's request looks like through PostgREST. communityService.js itself is
// imported unmodified.
//
// Skips (not fails) if it can't reach a local Postgres — see TEST_DATABASE_URL.

const ADMIN_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
const TEST_DB_NAME = `communityservice_getpostbyid_it_${Date.now()}`;
const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
const readMigration = (file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8');

const SUPABASE_STUB_SQL = `
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    raw_app_meta_data JSONB DEFAULT '{}'::jsonb
  );
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  END $$;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
  CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name TEXT, avatar_url TEXT, email TEXT
  );
  CREATE TABLE IF NOT EXISTS public.businesses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT);
`;

let dbAvailable = false;
let client; // runs every query as the anon role, RLS enforced — a real logged-out visitor
let communityService;

async function asAnonQuery(sql, params) {
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE anon');
  try {
    return await client.query(sql, params);
  } finally {
    await client.query('COMMIT');
  }
}

// Minimal adapter: the exact three independent chains communityService.js's
// getPosts/getPostById/getPollsByPostId call — community_posts, community_polls (plain
// columns), community_poll_options (its own query, never embedded inside community_polls).
function makeSupabaseAdapter() {
  function communityPostsQuery({ single, eqFilters }) {
    const idFilter = eqFilters?.id;
    return asAnonQuery(
      `SELECT cp.*, CASE WHEN up.id IS NULL THEN NULL ELSE
         jsonb_build_object('id', up.id, 'full_name', up.full_name, 'avatar_url', up.avatar_url)
       END AS author
       FROM public.community_posts cp
       LEFT JOIN public.user_profiles up ON up.id = cp.user_id
       WHERE ($1::uuid IS NULL OR cp.id = $1)`,
      [idFilter || null]
    ).then(res => {
      if (single) {
        return { data: res.rows?.[0] || null, error: res.rows?.length ? null : new Error('not found') };
      }
      return { data: res.rows, error: null, count: res.rows?.length };
    });
  }

  function communityPollsQuery({ inFilters }) {
    const postIds = inFilters?.post_id || [];
    return asAnonQuery(
      `SELECT id, post_id, closes_at, status, results_visibility, created_at
       FROM public.community_polls WHERE post_id = ANY($1::uuid[])`,
      [postIds]
    ).then(res => ({ data: res.rows, error: null }));
  }

  function communityPollOptionsQuery({ inFilters }) {
    const pollIds = inFilters?.poll_id || [];
    return asAnonQuery(
      `SELECT * FROM public.community_poll_options WHERE poll_id = ANY($1::uuid[]) ORDER BY position`,
      [pollIds]
    ).then(res => ({ data: res.rows, error: null }));
  }

  const QUERY_BY_TABLE = {
    community_posts: communityPostsQuery,
    community_polls: communityPollsQuery,
    community_poll_options: communityPollOptionsQuery,
  };

  return {
    from(table) {
      const state = { table, eqFilters: {}, inFilters: {}, single: false };
      const builder = {
        select: () => builder,
        eq: (col, val) => { state.eqFilters[col] = val; return builder; },
        in: (col, vals) => { state.inFilters[col] = vals; return builder; },
        order: () => builder,
        single: () => { state.single = true; return builder; },
        then: (resolve, reject) => {
          const run = QUERY_BY_TABLE[table];
          if (!run) throw new Error(`adapter: unhandled table ${table}`);
          return run(state).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

beforeAll(async () => {
  const admin = new pg.Client({ connectionString: ADMIN_DATABASE_URL });
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
    await admin.end();
  } catch (e) {
    console.warn(
      `communityService.getPostById.integration.test.js: no se pudo conectar a Postgres en ${ADMIN_DATABASE_URL} (${e?.message}). Se omiten estas pruebas.`
    );
    try { await admin.end(); } catch { /* already closed */ }
    return;
  }

  const url = new URL(ADMIN_DATABASE_URL);
  url.pathname = `/${TEST_DB_NAME}`;
  client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  await client.query(SUPABASE_STUB_SQL);
  await client.query(readMigration('20260305_community_qa.sql'));
  await client.query(readMigration('20260713000000_community_polls.sql'));
  await client.query(readMigration('20260717000000_community_posts_city_id.sql'));
  await client.query(readMigration('20260717010000_community_posts_category_key.sql'));

  vi.doMock('../lib/supabase', () => ({ supabase: makeSupabaseAdapter() }));
  vi.doMock('../config/city', () => ({ getActiveCityId: () => null }));
  ({ communityService } = await import('./communityService'));

  dbAvailable = true;
}, 60000);

afterAll(async () => {
  if (!dbAvailable) return;
  await client?.end();
  const admin = new pg.Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
  await admin.end();
});

async function seedActivePoll({ title = 'elegir entre una y otra', body = 'alige algo', labels = ['gana el blanco', 'gana el negro'] } = {}) {
  const postId = crypto.randomUUID();
  const pollId = crypto.randomUUID();
  await client.query(
    `INSERT INTO public.community_posts (id, title, body, sector, status) VALUES ($1, $2, $3, 'Centro', 'active')`,
    [postId, title, body]
  );
  await client.query(`INSERT INTO public.community_polls (id, post_id) VALUES ($1, $2)`, [pollId, postId]);
  await client.query(
    `INSERT INTO public.community_poll_options (id, poll_id, label, position) VALUES (gen_random_uuid(), $1, $2, 0), (gen_random_uuid(), $1, $3, 1)`,
    [pollId, labels?.[0], labels?.[1]]
  );
  return { postId, pollId };
}

describe('getPostById() against a real database, as an anonymous (logged-out) visitor: does poll actually get attached?', () => {
  it('a post with a real community_polls row and real options comes back with poll AND poll.options populated for a guest with no session', async () => {
    if (!dbAvailable) return;
    const { postId, pollId } = await seedActivePoll();

    const { data, error } = await communityService.getPostById(postId);

    expect(error)?.toBeNull();
    expect(data?.poll)?.not?.toBeNull();
    expect(data?.poll?.id)?.toBe(pollId);
    expect(data?.poll?.options?.map(o => o?.label))?.toEqual(['gana el blanco', 'gana el negro']);
  });

  it('a plain Pregunta with no community_polls row correctly comes back with poll: null (this is not a bug — it is a Pregunta)', async () => {
    if (!dbAvailable) return;
    const postId = crypto.randomUUID();
    await client.query(
      `INSERT INTO public.community_posts (id, title, body, sector, status) VALUES ($1, 'elegir entre una y otra', 'alige algo', 'Centro', 'active')`,
      [postId]
    );

    const { data, error } = await communityService.getPostById(postId);

    expect(error)?.toBeNull();
    expect(data?.poll)?.toBeNull();
  });
});
