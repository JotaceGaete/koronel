-- Community Polls Module Migration
-- Satellite tables for encuestas: community_polls, community_poll_options, community_poll_votes
--
-- community_posts is NOT modified. A publication is a poll if and only if a row exists in
-- community_polls referencing it via post_id. Everything else (moderation pipeline, comments
-- via community_replies, "me interesa" upvotes via community_votes, cover images) is reused
-- as-is and stays completely separate from poll option voting defined here.

-- 1. ENUM TYPES
DROP TYPE IF EXISTS public.community_poll_status CASCADE;
CREATE TYPE public.community_poll_status AS ENUM ('open', 'closed');

DROP TYPE IF EXISTS public.poll_results_visibility CASCADE;
CREATE TYPE public.poll_results_visibility AS ENUM ('always', 'after_vote', 'on_close');

-- 2. TABLES

-- One row per poll publication, 1:1 with community_posts.
CREATE TABLE IF NOT EXISTS public.community_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES public.community_posts(id) ON DELETE CASCADE,
  closes_at TIMESTAMPTZ,
  status public.community_poll_status NOT NULL DEFAULT 'open'::public.community_poll_status,
  results_visibility public.poll_results_visibility NOT NULL DEFAULT 'after_vote'::public.poll_results_visibility,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2 to 6 options per poll (cardinality enforced by the service layer, not the DB).
-- UNIQUE (id, poll_id) exists solely to support the composite FK from community_poll_votes,
-- guaranteeing at the database level that a vote can never reference an option from a
-- different poll than the one it claims to belong to.
CREATE TABLE IF NOT EXISTS public.community_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(btrim(label)) > 0),
  "position" SMALLINT NOT NULL CHECK ("position" >= 0),
  vote_count INT NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (poll_id, "position"),
  UNIQUE (id, poll_id)
);

-- One vote per (poll, user). Changing a vote is an UPDATE of option_id on this same row,
-- never a delete+insert, which is what makes "cambiar el voto" a single atomic operation.
-- This is a deliberate change of shape from community_votes (which stores on/off rows per
-- target and is left completely untouched by this migration).
CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (poll_id, user_id),
  FOREIGN KEY (option_id, poll_id) REFERENCES public.community_poll_options(id, poll_id) ON DELETE CASCADE
);

-- 3. INDEXES
-- (post_id, (poll_id, "position"), (id, poll_id) and (poll_id, user_id) are already indexed
-- via their UNIQUE constraints above; only the remaining FK/lookup columns need explicit ones.)
CREATE INDEX IF NOT EXISTS idx_community_poll_votes_option_id ON public.community_poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_community_poll_votes_user_id ON public.community_poll_votes(user_id);

-- 4. VOTE CASTING FUNCTION
-- The only way to write to community_poll_votes (see RLS in section 7 below: there is no
-- INSERT/UPDATE policy on that table for regular users). Runs as a single implicit
-- transaction, so the vote upsert and the vote_count adjustments on community_poll_options
-- either all happen or none do.
--
-- Locking strategy:
--   - FOR SHARE on the poll row: lets many different users vote concurrently on the same
--     poll without blocking each other, while still blocking against (and being blocked by)
--     a concurrent "cerrar encuesta" UPDATE from an admin/author.
--   - FOR UPDATE on the user's own vote row: only ever contends with that same user issuing
--     a second concurrent vote request (e.g. a double click), which is inherently low
--     contention.
-- closes_at is re-checked here against now() on the server, so an expired poll rejects votes
-- even if the client never refreshed its own idea of the poll's state.
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

-- 5. ENABLE RLS
ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES: community_polls
DROP POLICY IF EXISTS "community_polls_public_read" ON public.community_polls;
CREATE POLICY "community_polls_public_read"
  ON public.community_polls FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = post_id AND cp.status = 'active'::public.community_post_status
    )
  );

DROP POLICY IF EXISTS "community_polls_owner_read" ON public.community_polls;
CREATE POLICY "community_polls_owner_read"
  ON public.community_polls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = post_id AND (cp.user_id = auth.uid() OR public.is_admin_user())
    )
  );

DROP POLICY IF EXISTS "community_polls_owner_insert" ON public.community_polls;
CREATE POLICY "community_polls_owner_insert"
  ON public.community_polls FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = post_id AND cp.user_id = auth.uid()
    )
  );

-- Update is only ever used to close a poll (status -> 'closed'); no DELETE policy exists,
-- polls are only ever removed via ON DELETE CASCADE when their parent post is deleted.
DROP POLICY IF EXISTS "community_polls_owner_update" ON public.community_polls;
CREATE POLICY "community_polls_owner_update"
  ON public.community_polls FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = post_id AND (cp.user_id = auth.uid() OR public.is_admin_user())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = post_id AND (cp.user_id = auth.uid() OR public.is_admin_user())
    )
  );

-- 7. RLS POLICIES: community_poll_options
-- Read-only after creation in V1: there is no UPDATE/DELETE policy, options are immutable
-- once a poll is published. They only disappear via ON DELETE CASCADE from community_polls.
DROP POLICY IF EXISTS "community_poll_options_public_read" ON public.community_poll_options;
CREATE POLICY "community_poll_options_public_read"
  ON public.community_poll_options FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_polls p
      JOIN public.community_posts cp ON cp.id = p.post_id
      WHERE p.id = community_poll_options.poll_id
        AND cp.status = 'active'::public.community_post_status
    )
  );

DROP POLICY IF EXISTS "community_poll_options_owner_read" ON public.community_poll_options;
CREATE POLICY "community_poll_options_owner_read"
  ON public.community_poll_options FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_polls p
      JOIN public.community_posts cp ON cp.id = p.post_id
      WHERE p.id = community_poll_options.poll_id
        AND (cp.user_id = auth.uid() OR public.is_admin_user())
    )
  );

DROP POLICY IF EXISTS "community_poll_options_owner_insert" ON public.community_poll_options;
CREATE POLICY "community_poll_options_owner_insert"
  ON public.community_poll_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.community_polls p
      JOIN public.community_posts cp ON cp.id = p.post_id
      WHERE p.id = community_poll_options.poll_id
        AND cp.user_id = auth.uid()
    )
  );

-- 8. RLS POLICIES: community_poll_votes
-- Deliberately: SELECT only. There is NO insert/update/delete policy for authenticated or
-- public roles on this table. The only supported write path is public.cast_poll_vote(),
-- which runs SECURITY DEFINER and therefore bypasses RLS entirely while enforcing the
-- open/closes_at/ownership rules itself. This guarantees that a vote cannot be written by
-- any client that skips the RPC (buggy frontend, direct REST call, etc.).
DROP POLICY IF EXISTS "community_poll_votes_public_read" ON public.community_poll_votes;
CREATE POLICY "community_poll_votes_public_read"
  ON public.community_poll_votes FOR SELECT
  TO public
  USING (true);
