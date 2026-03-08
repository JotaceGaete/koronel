-- Tabla public.media_files para /api/upload/confirm (R2 + PostgREST).
-- Idempotente: seguro si 20260321000000_media_files_r2 ya se aplicó.
CREATE TABLE IF NOT EXISTS public.media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN public.media_files.url IS 'Public URL of the file (e.g. https://multimedia.koronel.cl/...)';
COMMENT ON COLUMN public.media_files.size IS 'File size in bytes';

CREATE INDEX IF NOT EXISTS idx_media_files_owner_id ON public.media_files(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_files_entity ON public.media_files(entity_type, entity_id);

ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_files_public_read" ON public.media_files;
CREATE POLICY "media_files_public_read"
  ON public.media_files FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "media_files_owner_insert" ON public.media_files;
CREATE POLICY "media_files_owner_insert"
  ON public.media_files FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "media_files_owner_delete" ON public.media_files;
CREATE POLICY "media_files_owner_delete"
  ON public.media_files FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);
