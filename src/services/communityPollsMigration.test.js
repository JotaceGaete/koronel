import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// There is no local Postgres/Supabase instance available in this environment, so the
// migration cannot be executed and verified end-to-end here. These are static assertions on
// the SQL text that guard the invariants the design explicitly requires, so a future edit to
// the migration can't silently drop one of them (e.g. someone "simplifying" RLS and
// accidentally allowing a direct write to community_poll_votes).

const migrationPath = path.resolve(
  __dirname,
  '../../supabase/migrations/20260713000000_community_polls.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('community_polls migration (static checks, not executed against a database)', () => {
  it('never touches community_posts', () => {
    expect(sql).not.toMatch(/ALTER TABLE\s+public\.community_posts/i);
    expect(sql).not.toMatch(/community_posts[\s\S]{0,40}ADD COLUMN/i);
  });

  it('defines the three satellite tables', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.community_polls/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.community_poll_options/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.community_poll_votes/);
  });

  it('cascades deletes from community_posts down to polls, options and votes', () => {
    expect(sql).toMatch(/post_id UUID NOT NULL UNIQUE REFERENCES public\.community_posts\(id\) ON DELETE CASCADE/);
    expect(sql).toMatch(/poll_id UUID NOT NULL REFERENCES public\.community_polls\(id\) ON DELETE CASCADE/g);
    expect(sql.match(/REFERENCES public\.community_polls\(id\) ON DELETE CASCADE/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('enforces one active vote per (poll, user) so a vote change is an UPDATE, not a second row', () => {
    expect(sql).toMatch(/UNIQUE \(poll_id, user_id\)/);
  });

  it('guarantees an option can only belong to the poll its vote claims via a composite FK', () => {
    expect(sql).toMatch(/UNIQUE \(id, poll_id\)/);
    expect(sql).toMatch(
      /FOREIGN KEY \(option_id, poll_id\) REFERENCES public\.community_poll_options\(id, poll_id\) ON DELETE CASCADE/
    );
  });

  it('enables RLS on all three tables', () => {
    expect(sql).toMatch(/ALTER TABLE public\.community_polls ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE public\.community_poll_options ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE public\.community_poll_votes ENABLE ROW LEVEL SECURITY/);
  });

  it('does not grant any direct insert/update/delete policy on community_poll_votes', () => {
    const votesSection = sql.slice(sql.indexOf('-- 8. RLS POLICIES: community_poll_votes'));
    expect(votesSection).toMatch(/community_poll_votes_public_read/);
    expect(votesSection).not.toMatch(/FOR INSERT/);
    expect(votesSection).not.toMatch(/FOR UPDATE/);
    expect(votesSection).not.toMatch(/FOR DELETE/);
  });

  it('does not grant update or delete policies on community_poll_options (immutable after publish)', () => {
    const optionsSection = sql.slice(
      sql.indexOf('-- 7. RLS POLICIES: community_poll_options'),
      sql.indexOf('-- 8. RLS POLICIES: community_poll_votes')
    );
    expect(optionsSection).toMatch(/FOR INSERT/);
    expect(optionsSection).not.toMatch(/FOR UPDATE/);
    expect(optionsSection).not.toMatch(/FOR DELETE/);
  });

  it('the vote-casting function is SECURITY DEFINER with a locked-down search_path', () => {
    const fnMatch = sql.match(
      /CREATE OR REPLACE FUNCTION public\.cast_poll_vote[\s\S]*?\$\$;/
    )?.[0];
    expect(fnMatch).toBeTruthy();
    expect(fnMatch).toMatch(/SECURITY DEFINER/);
    expect(fnMatch).toMatch(/SET search_path = public, pg_temp/);
  });

  it('the vote-casting function checks both poll status and closes_at server-side', () => {
    const fnMatch = sql.match(
      /CREATE OR REPLACE FUNCTION public\.cast_poll_vote[\s\S]*?\$\$;/
    )?.[0];
    expect(fnMatch).toMatch(/status = 'open'::public\.community_poll_status/);
    expect(fnMatch).toMatch(/closes_at IS NULL OR closes_at > now\(\)/);
  });

  it('restricts EXECUTE on the function to authenticated users only', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.cast_poll_vote\(UUID, UUID\) FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.cast_poll_vote\(UUID, UUID\) TO authenticated/);
  });
});
