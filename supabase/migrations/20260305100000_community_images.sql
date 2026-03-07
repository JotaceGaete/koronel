-- Community Images Module Migration
-- Table: community_question_images
-- Storage: community_images bucket

-- 1. TABLE
CREATE TABLE IF NOT EXISTS public.community_question_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_community_question_images_question_id
  ON public.community_question_images(question_id);

-- 3. ENABLE RLS
ALTER TABLE public.community_question_images ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES
-- Public can read images for active/approved questions only
DROP POLICY IF EXISTS "community_images_public_read" ON public.community_question_images;
CREATE POLICY "community_images_public_read"
  ON public.community_question_images FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = question_id
        AND cp.status = 'active'::public.community_post_status
    )
  );

-- Authenticated owner can also read their own pending question images
DROP POLICY IF EXISTS "community_images_owner_read" ON public.community_question_images;
CREATE POLICY "community_images_owner_read"
  ON public.community_question_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = question_id
        AND (cp.user_id = auth.uid() OR public.is_admin_user())
    )
  );

-- Only question author or admin can insert images
DROP POLICY IF EXISTS "community_images_owner_insert" ON public.community_question_images;
CREATE POLICY "community_images_owner_insert"
  ON public.community_question_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = question_id
        AND (cp.user_id = auth.uid() OR public.is_admin_user())
    )
  );

-- Only question author or admin can delete images
DROP POLICY IF EXISTS "community_images_owner_delete" ON public.community_question_images;
CREATE POLICY "community_images_owner_delete"
  ON public.community_question_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = question_id
        AND (cp.user_id = auth.uid() OR public.is_admin_user())
    )
  );

-- 5. STORAGE BUCKET: community_images (public bucket for easy display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-images',
  'community-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 6. STORAGE RLS POLICIES
DROP POLICY IF EXISTS "community_images_storage_public_read" ON storage.objects;
CREATE POLICY "community_images_storage_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'community-images');

DROP POLICY IF EXISTS "community_images_storage_auth_upload" ON storage.objects;
CREATE POLICY "community_images_storage_auth_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'community-images');

DROP POLICY IF EXISTS "community_images_storage_owner_delete" ON storage.objects;
CREATE POLICY "community_images_storage_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'community-images' AND owner = auth.uid());
