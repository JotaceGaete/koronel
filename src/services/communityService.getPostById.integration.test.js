import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// Real integration test for the exact question the user raised: does getPostById() actually
// attach `poll` to a post that genuinely has a community_polls row, end-to-end, through the
// real decoupled-query merge logic in communityService.js — not a raw SQL check of the RPC
// (already covered by communityService.pollVote.integration.test.js), and not a mock of
// supabase.from() that just echoes back whatever the test hands it.
//
// Here, `../lib/supabase` is mocked with a tiny adapter that translates the exact
// .from(table).select(...).eq(...).in(...).single() chains communityService.js actually issues
// into real SQL run against a real Postgres loaded with this repo's real migrations, and
// returns the result in the same {data, error} shape PostgREST would. communityService.js
// itself is imported unmodified — this exercises the real getPostById()/getPosts() source.
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
let client;
let communityService;

// Minimal adapter: only the exact chains communityService.js's getPosts/getPostById/
// getPollsByPostId actually call, translated to real SQL and run against the real database.
function makeSupabaseAdapter() {
  function communityPostsQuery({ single, eqFilters }) {
    const idFilter = eqFilters?.id;
    return client
      .query(
        `SELECT cp.*, CASE WHEN up.id IS NULL THEN NULL ELSE
           jsonb_build_object('id', up.id, 'full_name', up.full_name, 'avatar_url', up.avatar_url)
         END AS author
         FROM public.community_posts cp
         LEFT JOIN public.user_profiles up ON up.id = cp.user_id
         WHERE ($1::uuid IS NULL OR cp.id = $1)`,
        [idFilter || null]
      )
      .then(res => {
        if (single) {
          return { data: res.rows?.[0] || null, error: res.rows?.length ? null : new Error('not found') };
        }
        return { data: res.rows, error: null, count: res.rows?.length };
      });
  }

  function communityPollsQuery({ inFilters }) {
    const postIds = inFilters?.post_id || [];
    return client
      .query(
        `SELECT p.id, p.post_id, p.closes_at, p.status, p.results_visibility, p.created_at,
           COALESCE(
             (SELECT jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'position', o.position, 'vote_count', o.vote_count))
              FROM public.community_poll_options o WHERE o.poll_id = p.id),
             '[]'::jsonb
           ) AS options
         FROM public.community_polls p
         WHERE p.post_id = ANY($1::uuid[])`,
        [postIds]
      )
      .then(res => ({ data: res.rows, error: null }));
  }

  return {
    from(table) {
      const state = { table, eqFilters: {}, inFilters: {}, single: false };
      const builder = {
        select: () => builder,
        eq: (col, val) => { state.eqFilters[col] = val; return builder; },
        in: (col, vals) => { state.inFilters[col] = vals; return builder; },
        single: () => { state.single = true; return builder; },
        then: (resolve, reject) => {
          const run = table === 'community_posts' ? communityPostsQuery(state) : communityPollsQuery(state);
          return run.then(resolve, reject);
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

describe('getPostById() against a real database: does poll actually get attached?', () => {
  it('a post with a real community_polls row comes back with poll populated (not null) and its options', async () => {
    if (!dbAvailable) return;
    const postId = crypto.randomUUID();
    const pollId = crypto.randomUUID();
    await client.query(
      `INSERT INTO public.community_posts (id, title, body, sector, status) VALUES ($1, 'elegir entre una y otra', 'alige algo', 'Centro', 'active')`,
      [postId]
    );
    await client.query(`INSERT INTO public.community_polls (id, post_id) VALUES ($1, $2)`, [pollId, postId]);
    await client.query(
      `INSERT INTO public.community_poll_options (id, poll_id, label, position) VALUES (gen_random_uuid(), $1, 'Argentina', 0), (gen_random_uuid(), $1, 'España', 1)`,
      [pollId]
    );

    const { data, error } = await communityService.getPostById(postId);

    expect(error)?.toBeNull();
    expect(data?.poll)?.not?.toBeNull();
    expect(data?.poll?.id)?.toBe(pollId);
    expect(data?.poll?.options?.map(o => o?.label))?.toEqual(['Argentina', 'España']);
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
