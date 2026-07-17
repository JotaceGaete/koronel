import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// Real integration test against an actual Postgres instance — no mocks, no vitest DOM. This
// applies the exact migration files this repo ships (read from supabase/migrations/, not a
// copy), plus a minimal stub of the parts of a real Supabase project cast_poll_vote() and its
// RLS policies actually depend on (the auth schema, auth.users, auth.uid(), and the
// anon/authenticated roles — reproduced from Supabase's own public implementation of
// auth.uid()). It then casts a real vote through the real RPC, as the `authenticated` role with
// auth.uid() set exactly the way PostgREST sets it per-request from a caller's JWT, and checks
// the actual rows Postgres ends up with.
//
// This is deliberately not run through supabase-js/PostgREST: there is no PostgREST binary
// available in this environment, so this cannot catch a stale-PostgREST-schema-cache class of
// bug (see the audit write-up for that risk) — but it does conclusively prove or disprove
// whether the SQL itself (the migration, the function, the RLS policies, the grants) is correct,
// which is the one thing "the mocks pass" can never tell you.
//
// Skips (not fails) if it can't reach a local Postgres — set TEST_DATABASE_URL to point at one
// (defaults to postgresql://postgres:postgres@127.0.0.1:5432/postgres).

const ADMIN_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
const TEST_DB_NAME = `communityservice_pollvote_it_${Date.now()}`;

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
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
  LANGUAGE sql STABLE
  AS $$
    SELECT
      COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), ''),
        (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      )::uuid
  $$;
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated NOLOGIN;
    END IF;
  END $$;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
  CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    email TEXT
  );
  CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT
  );
`;

let dbAvailable = false;
let client; // connected to the ephemeral test database

async function asUser(userId, fn) {
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE authenticated');
  await client.query(
    `SELECT set_config('request.jwt.claims', $1, true)`,
    [JSON.stringify({ sub: userId, role: 'authenticated' })]
  );
  try {
    return await fn();
  } finally {
    await client.query('COMMIT');
  }
}

async function asAnon(fn) {
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE anon');
  await client.query(`SELECT set_config('request.jwt.claims', '', true)`);
  try {
    return await fn();
  } finally {
    await client.query('ROLLBACK');
  }
}

const AUTHOR_ID = '11111111-1111-1111-1111-111111111111';
const VOTER_ID = '22222222-2222-2222-2222-222222222222';
const OTHER_VOTER_ID = '33333333-3333-3333-3333-333333333333';

beforeAll(async () => {
  const admin = new pg.Client({ connectionString: ADMIN_DATABASE_URL });
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
    await admin.end();
  } catch (e) {
    console.warn(
      `communityService.pollVote.integration.test.js: no se pudo conectar a Postgres en ${ADMIN_DATABASE_URL} (${e?.message}). Se omiten estas pruebas — no hay verificación real de integración sin una instancia local.`
    );
    try { await admin.end(); } catch { /* already closed */ }
    return;
  }

  const url = new URL(ADMIN_DATABASE_URL);
  url.pathname = `/${TEST_DB_NAME}`;
  client = new pg.Client({ connectionString: url.toString() });
  await client.connect();

  await client.query(SUPABASE_STUB_SQL);
  // The exact, real migration files this repo ships — not a rewritten copy.
  await client.query(readMigration('20260305_community_qa.sql'));
  await client.query(readMigration('20260713000000_community_polls.sql'));
  await client.query(readMigration('20260717000000_community_posts_city_id.sql'));
  await client.query(readMigration('20260717010000_community_posts_category_key.sql'));

  await client.query(
    `INSERT INTO auth.users (id) VALUES ($1), ($2), ($3)`,
    [AUTHOR_ID, VOTER_ID, OTHER_VOTER_ID]
  );
  await client.query(
    `INSERT INTO public.user_profiles (id, full_name) VALUES ($1, 'Autor'), ($2, 'Votante'), ($3, 'Otro Votante')`,
    [AUTHOR_ID, VOTER_ID, OTHER_VOTER_ID]
  );

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

// Fresh post + poll + 2 options per test, so votes/counts never leak between tests.
async function seedPoll() {
  const postId = crypto.randomUUID();
  const pollId = crypto.randomUUID();
  const opt1 = crypto.randomUUID();
  const opt2 = crypto.randomUUID();
  await client.query(
    `INSERT INTO public.community_posts (id, title, body, sector, user_id, status)
     VALUES ($1, '¿Quién gana Argentina o España?', '', 'Centro', $2, 'active')`,
    [postId, AUTHOR_ID]
  );
  await client.query(
    `INSERT INTO public.community_polls (id, post_id) VALUES ($1, $2)`,
    [pollId, postId]
  );
  await client.query(
    `INSERT INTO public.community_poll_options (id, poll_id, label, position) VALUES
       ($1, $3, 'Argentina', 0), ($2, $3, 'España', 1)`,
    [opt1, opt2, pollId]
  );
  return { postId, pollId, opt1, opt2 };
}

describe('cast_poll_vote() — real Postgres integration (not mocked)', () => {
  it('1-2. community_polls and community_poll_options are correctly seeded for the post', async () => {
    if (!dbAvailable) return;
    const { postId, pollId } = await seedPoll();

    const poll = await client.query('SELECT * FROM public.community_polls WHERE post_id = $1', [postId]);
    expect(poll.rows)?.toHaveLength(1);
    expect(poll.rows?.[0]?.id)?.toBe(pollId);

    const options = await client.query('SELECT * FROM public.community_poll_options WHERE poll_id = $1', [pollId]);
    expect(options.rows?.length)?.toBeGreaterThanOrEqual(2);
  });

  it('5-8. voting as an authenticated user inserts community_poll_votes and increments vote_count', async () => {
    if (!dbAvailable) return;
    const { pollId, opt1 } = await seedPoll();

    const result = await asUser(VOTER_ID, () =>
      client.query('SELECT * FROM public.cast_poll_vote($1, $2)', [pollId, opt1])
    );
    expect(result.rows?.find(o => o.id === opt1)?.vote_count)?.toBe(1);

    const voteRow = await client.query(
      'SELECT * FROM public.community_poll_votes WHERE poll_id = $1 AND user_id = $2',
      [pollId, VOTER_ID]
    );
    expect(voteRow.rows)?.toHaveLength(1);
    expect(voteRow.rows?.[0]?.option_id)?.toBe(opt1);
  });

  it('impide un segundo voto duplicado del mismo usuario: la fila se actualiza (upsert), nunca se duplica', async () => {
    if (!dbAvailable) return;
    const { pollId, opt1, opt2 } = await seedPoll();

    await asUser(VOTER_ID, () => client.query('SELECT * FROM public.cast_poll_vote($1, $2)', [pollId, opt1]));
    await asUser(VOTER_ID, () => client.query('SELECT * FROM public.cast_poll_vote($1, $2)', [pollId, opt2]));

    const votes = await client.query(
      'SELECT * FROM public.community_poll_votes WHERE poll_id = $1 AND user_id = $2',
      [pollId, VOTER_ID]
    );
    expect(votes.rows)?.toHaveLength(1); // still one row, not two
    expect(votes.rows?.[0]?.option_id)?.toBe(opt2);

    const options = await client.query(
      'SELECT id, vote_count FROM public.community_poll_options WHERE poll_id = $1', [pollId]
    );
    expect(options.rows?.find(o => o.id === opt1)?.vote_count)?.toBe(0); // moved off opt1
    expect(options.rows?.find(o => o.id === opt2)?.vote_count)?.toBe(1); // onto opt2
  });

  it('two different users voting for the same option both count, independently', async () => {
    if (!dbAvailable) return;
    const { pollId, opt1 } = await seedPoll();

    await asUser(VOTER_ID, () => client.query('SELECT * FROM public.cast_poll_vote($1, $2)', [pollId, opt1]));
    await asUser(OTHER_VOTER_ID, () => client.query('SELECT * FROM public.cast_poll_vote($1, $2)', [pollId, opt1]));

    const options = await client.query(
      'SELECT id, vote_count FROM public.community_poll_options WHERE poll_id = $1', [pollId]
    );
    expect(options.rows?.find(o => o.id === opt1)?.vote_count)?.toBe(2);
  });

  it('rejects a guest (anon role, no session) at the grant level — never even reaches the function body', async () => {
    if (!dbAvailable) return;
    const { pollId, opt1 } = await seedPoll();

    // This is what a real logged-out visitor looks like to PostgREST: no JWT at all, so it
    // authenticates the request as `anon`, which was never GRANTed EXECUTE on this function.
    await expect(
      asAnon(() => client.query('SELECT * FROM public.cast_poll_vote($1, $2)', [pollId, opt1]))
    )?.rejects?.toThrow(/permission denied for function cast_poll_vote/);
  });

  it('rejects an authenticated session with no resolvable auth.uid() with the function\'s own guard', async () => {
    if (!dbAvailable) return;
    const { pollId, opt1 } = await seedPoll();

    // Distinct from the anon case above: the `authenticated` role IS granted EXECUTE, so this
    // exercises cast_poll_vote()'s own `IF v_user_id IS NULL` guard rather than the grant.
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE authenticated');
    await expect(
      client.query('SELECT * FROM public.cast_poll_vote($1, $2)', [pollId, opt1])
    )?.rejects?.toThrow(/Debes iniciar sesión para votar/);
    await client.query('ROLLBACK');
  });

  it('5. rejects voting on a closed poll with the real Postgres error', async () => {
    if (!dbAvailable) return;
    const { pollId, opt1 } = await seedPoll();
    await client.query(`UPDATE public.community_polls SET status = 'closed' WHERE id = $1`, [pollId]);

    await expect(
      asUser(VOTER_ID, () => client.query('SELECT * FROM public.cast_poll_vote($1, $2)', [pollId, opt1]))
    )?.rejects?.toThrow(/La encuesta está cerrada o no existe/);
  });

  it('6. RLS on community_poll_votes: only SELECT is possible directly, no INSERT/UPDATE bypassing the RPC', async () => {
    if (!dbAvailable) return;
    const { pollId, opt1 } = await seedPoll();

    await expect(
      asUser(VOTER_ID, () => client.query(
        'INSERT INTO public.community_poll_votes (poll_id, option_id, user_id) VALUES ($1, $2, $3)',
        [pollId, opt1, VOTER_ID]
      ))
    )?.rejects?.toThrow(/permission denied|new row violates row-level security/i);
  });

  it('9. after voting, community_poll_votes is readable back (public SELECT policy) — this is what "reload shows the user\'s vote" relies on', async () => {
    if (!dbAvailable) return;
    const { pollId, opt1 } = await seedPoll();
    await asUser(VOTER_ID, () => client.query('SELECT * FROM public.cast_poll_vote($1, $2)', [pollId, opt1]));

    const readBack = await asAnon(() => client.query(
      'SELECT option_id FROM public.community_poll_votes WHERE poll_id = $1 AND user_id = $2',
      [pollId, VOTER_ID]
    ));
    expect(readBack.rows?.[0]?.option_id)?.toBe(opt1);
  });

  it('grants: only the authenticated role can EXECUTE cast_poll_vote, not anon/PUBLIC', async () => {
    if (!dbAvailable) return;
    const grants = await client.query(
      `SELECT grantee FROM information_schema.routine_privileges
       WHERE routine_name = 'cast_poll_vote' AND privilege_type = 'EXECUTE'`
    );
    const grantees = grants.rows?.map(r => r.grantee);
    expect(grantees)?.toContain('authenticated');
    expect(grantees)?.not?.toContain('anon');
    expect(grantees)?.not?.toContain('PUBLIC');
  });
});
