-- Media files metadata (R2 storage). No Supabase Storage.
-- url = public URL (e.g. https://multimedia.koronel.cl/...)
-- storage_key = key in bucket
CREATE TABLE IF NOT EXISTS public.media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_files_owner_id ON public.media_files(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_files_entity ON public.media_files(entity_type, entity_id);

ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- Public read (for displaying images)
CREATE POLICY "media_files_public_read"
  ON public.media_files FOR SELECT TO public
  USING (true);

-- Authenticated users can insert their own (owner_id = auth.uid())
CREATE POLICY "media_files_owner_insert"
  ON public.media_files FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Owners can delete their own
CREATE POLICY "media_files_owner_delete"
  ON public.media_files FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Admin full access (if is_admin_user exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin_user') THEN
    EXECUTE 'CREATE POLICY "media_files_admin_all" ON public.media_files FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user())';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
