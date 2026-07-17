-- Repair: make sure cast_poll_vote() is actually callable through PostgREST
--
-- Root-cause audit (2026-07-17): voting was reported as still not working end-to-end after the
-- Encuestas UX redesign, despite the frontend, communityService.castPollVote(), the RPC
-- function, its RLS policies, and its GRANTs all checking out. Confirmed by running the exact
-- migration files this repo ships against a real local Postgres 16 (auth.uid()/roles stubbed to
-- match Supabase's own implementation): a full vote — insert into community_poll_votes,
-- vote_count increment, duplicate-vote upsert, closed-poll rejection, anon rejection at the
-- grant level, RLS read-back — all work exactly as designed. See
-- src/services/communityService.pollVote.integration.test.js for that proof, run against a real
-- database, not mocks.
--
-- That rules out the SQL being wrong. It does not rule out PostgREST simply not knowing this
-- function exists yet: this project has already hit this exact class of bug once before (see
-- 20260717000000_community_posts_city_id.sql's audit — community_polls.status raised "column
-- does not exist" in production despite being correctly defined in the migration, because
-- whatever applied these migrations there didn't go through a flow that refreshes PostgREST's
-- schema cache). If the same thing happened to cast_poll_vote(), calling it from the client
-- fails with something like:
--   {"code":"PGRST202","message":"Could not find the function public.cast_poll_vote(p_option_id,
--   p_poll_id) in the schema cache"}
-- which looks identical to "voting doesn't work" from the UI, with no RLS/permission error
-- involved at all.
--
-- This migration re-asserts the function (byte-for-byte from 20260713000000_community_polls.sql
-- — keep the two in sync if that one ever changes) and its grant, then explicitly tells
-- PostgREST to reload its schema cache. Every statement here is idempotent and safe to run
-- whether or not anything was actually missing.

CREATE OR REPLACE FUNCTION public.cast_poll_vote(p_poll_id UUID, p_option_id UUID)
RETURNS SETOF public.community_poll_options
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_previous_option_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para votar';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_polls
    WHERE id = p_poll_id
      AND status = 'open'::public.community_poll_status
      AND (closes_at IS NULL OR closes_at > now())
    FOR SHARE
  ) THEN
    RAISE EXCEPTION 'La encuesta está cerrada o no existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_poll_options
    WHERE id = p_option_id AND poll_id = p_poll_id
  ) THEN
    RAISE EXCEPTION 'La opción no pertenece a esta encuesta';
  END IF;

  SELECT option_id INTO v_previous_option_id
  FROM public.community_poll_votes
  WHERE poll_id = p_poll_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.community_poll_votes (poll_id, option_id, user_id)
    VALUES (p_poll_id, p_option_id, v_user_id);

    UPDATE public.community_poll_options
    SET vote_count = vote_count + 1
    WHERE id = p_option_id;

  ELSIF v_previous_option_id <> p_option_id THEN
    UPDATE public.community_poll_votes
    SET option_id = p_option_id, updated_at = now()
    WHERE poll_id = p_poll_id AND user_id = v_user_id;

    UPDATE public.community_poll_options SET vote_count = vote_count - 1 WHERE id = v_previous_option_id;
    UPDATE public.community_poll_options SET vote_count = vote_count + 1 WHERE id = p_option_id;
  END IF;
  -- If v_previous_option_id = p_option_id, the user voted the same option again: no-op.

  RETURN QUERY
    SELECT * FROM public.community_poll_options
    WHERE poll_id = p_poll_id
    ORDER BY "position";
END;
$$;

REVOKE ALL ON FUNCTION public.cast_poll_vote(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_poll_vote(UUID, UUID) TO authenticated;

-- The actual fix for "PostgREST doesn't know this function/column/table exists yet": ask it to
-- reload. A harmless no-op if the cache was already current.
NOTIFY pgrst, 'reload schema';
