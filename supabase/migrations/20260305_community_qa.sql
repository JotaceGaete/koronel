-- Community Q&A Module Migration
-- Tables: community_posts, community_replies, community_votes, suggested_businesses

-- 1. ENUM TYPES
DROP TYPE IF EXISTS public.community_post_status CASCADE;
CREATE TYPE public.community_post_status AS ENUM ('pending', 'active', 'rejected');

DROP TYPE IF EXISTS public.community_reply_status CASCADE;
CREATE TYPE public.community_reply_status AS ENUM ('active', 'hidden');

DROP TYPE IF EXISTS public.community_vote_target CASCADE;
CREATE TYPE public.community_vote_target AS ENUM ('post', 'reply');

DROP TYPE IF EXISTS public.suggested_business_status CASCADE;
CREATE TYPE public.suggested_business_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. TABLES
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sector TEXT NOT NULL,
  lat FLOAT8,
  lng FLOAT8,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status public.community_post_status NOT NULL DEFAULT 'pending'::public.community_post_status,
  upvote_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.community_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  linked_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  status public.community_reply_status NOT NULL DEFAULT 'active'::public.community_reply_status,
  upvote_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.community_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  target_type public.community_vote_target NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.suggested_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID REFERENCES public.community_replies(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  suggested_by UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status public.suggested_business_status NOT NULL DEFAULT 'pending'::public.suggested_business_status,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON public.community_posts(status);
CREATE INDEX IF NOT EXISTS idx_community_posts_sector ON public.community_posts(sector);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_replies_post_id ON public.community_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_community_replies_user_id ON public.community_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_community_votes_user_target ON public.community_votes(user_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_suggested_businesses_status ON public.suggested_businesses(status);

-- Unique constraint for votes
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_votes_unique
  ON public.community_votes(user_id, target_type, target_id);

-- 4. ADMIN HELPER FUNCTION (for RLS)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
$$;

-- 5. ENABLE RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_businesses ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES: community_posts
DROP POLICY IF EXISTS "community_posts_public_read" ON public.community_posts;
CREATE POLICY "community_posts_public_read"
  ON public.community_posts FOR SELECT
  TO public
  USING (status = 'active'::public.community_post_status);

DROP POLICY IF EXISTS "community_posts_admin_read" ON public.community_posts;
CREATE POLICY "community_posts_admin_read"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "community_posts_owner_read" ON public.community_posts;
CREATE POLICY "community_posts_owner_read"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "community_posts_auth_insert" ON public.community_posts;
CREATE POLICY "community_posts_auth_insert"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "community_posts_owner_update" ON public.community_posts;
CREATE POLICY "community_posts_owner_update"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "community_posts_owner_delete" ON public.community_posts;
CREATE POLICY "community_posts_owner_delete"
  ON public.community_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user());

-- 7. RLS POLICIES: community_replies
DROP POLICY IF EXISTS "community_replies_public_read" ON public.community_replies;
CREATE POLICY "community_replies_public_read"
  ON public.community_replies FOR SELECT
  TO public
  USING (status = 'active'::public.community_reply_status);

DROP POLICY IF EXISTS "community_replies_admin_read" ON public.community_replies;
CREATE POLICY "community_replies_admin_read"
  ON public.community_replies FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "community_replies_auth_insert" ON public.community_replies;
CREATE POLICY "community_replies_auth_insert"
  ON public.community_replies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "community_replies_owner_update" ON public.community_replies;
CREATE POLICY "community_replies_owner_update"
  ON public.community_replies FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "community_replies_owner_delete" ON public.community_replies;
CREATE POLICY "community_replies_owner_delete"
  ON public.community_replies FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user());

-- 8. RLS POLICIES: community_votes
DROP POLICY IF EXISTS "community_votes_public_read" ON public.community_votes;
CREATE POLICY "community_votes_public_read"
  ON public.community_votes FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "community_votes_auth_insert" ON public.community_votes;
CREATE POLICY "community_votes_auth_insert"
  ON public.community_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "community_votes_owner_delete" ON public.community_votes;
CREATE POLICY "community_votes_owner_delete"
  ON public.community_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 9. RLS POLICIES: suggested_businesses
DROP POLICY IF EXISTS "suggested_businesses_auth_insert" ON public.suggested_businesses;
CREATE POLICY "suggested_businesses_auth_insert"
  ON public.suggested_businesses FOR INSERT
  TO authenticated
  WITH CHECK (suggested_by = auth.uid());

DROP POLICY IF EXISTS "suggested_businesses_owner_read" ON public.suggested_businesses;
CREATE POLICY "suggested_businesses_owner_read"
  ON public.suggested_businesses FOR SELECT
  TO authenticated
  USING (suggested_by = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "suggested_businesses_admin_update" ON public.suggested_businesses;
CREATE POLICY "suggested_businesses_admin_update"
  ON public.suggested_businesses FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "suggested_businesses_admin_delete" ON public.suggested_businesses;
CREATE POLICY "suggested_businesses_admin_delete"
  ON public.suggested_businesses FOR DELETE
  TO authenticated
  USING (public.is_admin_user());
