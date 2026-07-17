import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// There is no local Postgres/Supabase instance available inside the normal vitest run, so these
// are static assertions on the SQL text. The migration was additionally executed by hand against
// a real local Postgres 16 in two scenarios (community_cities pre-existing with a production-like
// shape, and community_cities absent on a fresh database), each run twice to confirm idempotency
// — see the PR/commit description for that verification's output. These tests instead guard the
// specific invariants that verification depends on, so a future edit can't silently reintroduce
// the original bug (a parallel `cities` table) or break idempotency.

const migrationPath = path.resolve(
  __dirname,
  '../../supabase/migrations/20260717000000_community_posts_city_id.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

const CORONEL_ID = '8aa2d628-719d-4810-9ee3-8efd230ab000';

describe('community_posts city_id migration (static checks, not executed against a database)', () => {
  it('never creates a parallel `cities` table — only ever touches the real community_cities', () => {
    // Strip comment lines first: the migration's prose legitimately mentions the removed
    // `public.cities` table (explaining why it was replaced), which must not trip this check.
    const codeOnly = sql
      ?.split('\n')
      ?.filter(line => !line?.trim()?.startsWith('--'))
      ?.join('\n');
    expect(codeOnly).not.toMatch(/CREATE TABLE\s+(IF NOT EXISTS\s+)?public\.cities\b/i);
    expect(codeOnly).not.toMatch(/\bpublic\.cities\b/);
    expect(codeOnly).not.toMatch(/REFERENCES public\.cities\(/);
  });

  it('only creates community_cities conditionally, and with just the one column it depends on (id)', () => {
    const createBlock = sql.match(/CREATE TABLE public\.community_cities \(([\s\S]*?)\);/)?.[1];
    expect(createBlock).toBeTruthy();
    expect(createBlock).toMatch(/id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    // No invented name/slug/is_default/etc. in the CREATE TABLE itself — those are only ever
    // written conditionally, later, after checking information_schema.
    expect(createBlock?.split(',')?.length)?.toBe(1);
  });

  it('checks information_schema.columns before writing to name/slug, instead of assuming they exist', () => {
    expect(sql).toMatch(/information_schema\.columns[\s\S]*?column_name = 'name'/);
    expect(sql).toMatch(/information_schema\.columns[\s\S]*?column_name = 'slug'/);
  });

  it('refuses to guess a value for an unrecognized required column, rather than inventing one', () => {
    expect(sql).toMatch(/is_nullable = 'NO' AND column_default IS NULL/);
    expect(sql).toMatch(/column_name NOT IN \('id', 'name', 'slug'\)/);
    expect(sql).toMatch(/RAISE NOTICE '.*skipping the Coronel seed/i);
  });

  it('checks that community_cities.id is actually a valid FK target before referencing it', () => {
    expect(sql).toMatch(/constraint_type IN \('PRIMARY KEY', 'UNIQUE'\)/);
    expect(sql).toMatch(/RAISE EXCEPTION/);
  });

  it('seeds/upserts Coronel by the exact id already used in production, never a freshly generated one', () => {
    expect(sql.match(new RegExp(CORONEL_ID, 'g'))?.length)?.toBeGreaterThanOrEqual(3);
    expect(sql).toMatch(/WHERE id = coronel_id/);
  });

  it('is idempotent: every structural statement guards itself (IF NOT EXISTS / IF EXISTS / DROP POLICY IF EXISTS)', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS city_id/);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_community_posts_city_id/);
    const dropPolicyIdx = sql.indexOf('DROP POLICY IF EXISTS "community_cities_public_read"');
    const createPolicyIdx = sql.indexOf('CREATE POLICY "community_cities_public_read"');
    expect(dropPolicyIdx)?.toBeGreaterThan(-1);
    expect(createPolicyIdx)?.toBeGreaterThan(-1);
    expect(dropPolicyIdx)?.toBeLessThan(createPolicyIdx);
  });

  it('backfill runs before the NOT NULL constraint is applied on community_posts.city_id', () => {
    const backfillIdx = sql.indexOf('WHERE city_id IS NULL');
    const notNullIdx = sql.indexOf('ALTER COLUMN city_id SET NOT NULL');
    expect(backfillIdx)?.toBeGreaterThan(-1);
    expect(notNullIdx)?.toBeGreaterThan(-1);
    expect(backfillIdx)?.toBeLessThan(notNullIdx);
  });

  it('the city_id foreign key targets community_cities, not the removed cities table', () => {
    expect(sql).toMatch(/city_id UUID REFERENCES public\.community_cities\(id\)/);
  });

  it('indexes city_id and enables RLS with a public read policy on community_cities', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_community_posts_city_id ON public\.community_posts\(city_id\)/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/community_cities_public_read/);
  });
});
