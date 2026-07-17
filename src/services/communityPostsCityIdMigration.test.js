import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Same rationale as communityPollsMigration.test.js: no local Postgres/Supabase instance is
// available here, so these are static assertions on the SQL text guarding the invariants this
// migration depends on (in particular: it must never mint a second id for Coronel).

const migrationPath = path.resolve(
  __dirname,
  '../../supabase/migrations/20260717000000_community_posts_city_id.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

const CORONEL_ID = '8aa2d628-719d-4810-9ee3-8efd230ab000';

describe('community_posts city_id migration (static checks, not executed against a database)', () => {
  it('defines the cities reference table', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.cities/);
  });

  it('seeds Coronel with the exact id already found in production, and never invents a new one', () => {
    const inserts = sql.match(new RegExp(`INSERT INTO public\\.cities[\\s\\S]*?${CORONEL_ID}[\\s\\S]*?;`, 'g'));
    expect(inserts?.length)?.toBe(1);
    expect(sql).toMatch(/ON CONFLICT \(id\) DO NOTHING/);
    // No other UUID literal should ever be inserted as a city in this migration.
    const uuidLiterals = sql.match(/VALUES \('([0-9a-f-]{36})'/gi) || [];
    expect(uuidLiterals?.every(v => v?.includes(CORONEL_ID)))?.toBe(true);
  });

  it('adds city_id to community_posts as a nullable-then-backfilled column (never a bare NOT NULL with no default for existing rows)', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public\.cities\(id\)/);
    expect(sql).toMatch(/UPDATE public\.community_posts\s*\nSET city_id = '8aa2d628-719d-4810-9ee3-8efd230ab000'\s*\nWHERE city_id IS NULL/);
  });

  it('backfill runs before the NOT NULL constraint is applied', () => {
    const backfillIdx = sql.indexOf('WHERE city_id IS NULL');
    const notNullIdx = sql.indexOf('ALTER COLUMN city_id SET NOT NULL');
    expect(backfillIdx)?.toBeGreaterThan(-1);
    expect(notNullIdx)?.toBeGreaterThan(-1);
    expect(backfillIdx)?.toBeLessThan(notNullIdx);
  });

  it('sets a DB-level default of Coronel so direct inserts that skip the app layer are still tagged', () => {
    expect(sql).toMatch(/ALTER COLUMN city_id SET DEFAULT '8aa2d628-719d-4810-9ee3-8efd230ab000'/);
  });

  it('indexes city_id and enables RLS with a public read policy on cities', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_community_posts_city_id ON public\.community_posts\(city_id\)/);
    expect(sql).toMatch(/ALTER TABLE public\.cities ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/cities_public_read/);
  });
});
