import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Same rationale as the other *Migration.test.js files in this directory: no local
// Postgres/Supabase instance is available inside the normal vitest run, so these are static
// assertions on the SQL text. This migration was additionally executed by hand against a real
// local Postgres 16 (pre-existing posts + one with a community_polls row), run twice to confirm
// idempotency — see the commit description for that verification's output.

const migrationPath = path.resolve(
  __dirname,
  '../../supabase/migrations/20260717010000_community_posts_category_key.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('community_posts category_key migration (static checks, not executed against a database)', () => {
  it('adds category_key as a plain TEXT column, not an enum', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS category_key TEXT NOT NULL DEFAULT 'general'/);
    expect(sql).not.toMatch(/CREATE TYPE.*category/i);
  });

  it('never creates a categories lookup table — the taxonomy lives in JS, not the DB', () => {
    expect(sql).not.toMatch(/CREATE TABLE/i);
  });

  it('does not add a CHECK constraint enumerating the current keys (future categories need no migration)', () => {
    expect(sql).not.toMatch(/CHECK\s*\(/i);
  });

  it('backfills existing Encuestas (posts with a community_polls row) to "polls", not "general"', () => {
    expect(sql).toMatch(/SET category_key = 'polls'/);
    expect(sql).toMatch(/EXISTS \(SELECT 1 FROM public\.community_polls p WHERE p\.post_id = cp\.id\)/);
  });

  it('is idempotent: the polls backfill only touches rows still at the just-applied default', () => {
    expect(sql).toMatch(/WHERE category_key = 'general'/);
  });

  it('indexes category_key for the public listing filter', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_community_posts_category_key ON public\.community_posts\(category_key\)/);
  });
});
