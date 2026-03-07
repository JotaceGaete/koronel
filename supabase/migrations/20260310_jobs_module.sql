-- Jobs Module Migration
-- Tables: jobs, job_applications
-- Storage: job-images bucket

-- 1. ENUM Types
DROP TYPE IF EXISTS public.job_status CASCADE;
CREATE TYPE public.job_status AS ENUM ('pending', 'published', 'expired');

DROP TYPE IF EXISTS public.job_application_status CASCADE;
CREATE TYPE public.job_application_status AS ENUM ('pending', 'reviewed', 'rejected');

-- 2. Jobs Table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  category TEXT NOT NULL DEFAULT 'Otro',
  modality TEXT NOT NULL DEFAULT 'Presencial',
  type TEXT NOT NULL DEFAULT 'Full-time',
  location TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  email_contact TEXT NOT NULL,
  whatsapp_contact TEXT,
  logo_url TEXT,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  status public.job_status NOT NULL DEFAULT 'pending'::public.job_status,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Job Applications Table
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  cv_url TEXT,
  carta_presentacion TEXT,
  status public.job_application_status NOT NULL DEFAULT 'pending'::public.job_application_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_slug ON public.jobs(slug);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);

-- 5. Auto-expiry function
CREATE OR REPLACE FUNCTION public.check_job_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.jobs
  SET status = 'expired'::public.job_status
  WHERE status = 'published'::public.job_status
    AND expires_at < now();
END;
$$;

-- 6. Admin check function
CREATE OR REPLACE FUNCTION public.is_admin_jobs()
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
  );
$$;

-- 7. Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for jobs
DROP POLICY IF EXISTS "jobs_public_read_published" ON public.jobs;
CREATE POLICY "jobs_public_read_published"
  ON public.jobs FOR SELECT
  TO public
  USING (status = 'published'::public.job_status);

DROP POLICY IF EXISTS "jobs_owner_read_own" ON public.jobs;
CREATE POLICY "jobs_owner_read_own"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "jobs_admin_read_all" ON public.jobs;
CREATE POLICY "jobs_admin_read_all"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (public.is_admin_jobs());

DROP POLICY IF EXISTS "jobs_auth_insert" ON public.jobs;
CREATE POLICY "jobs_auth_insert"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "jobs_owner_update" ON public.jobs;
CREATE POLICY "jobs_owner_update"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_jobs())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_jobs());

DROP POLICY IF EXISTS "jobs_owner_delete" ON public.jobs;
CREATE POLICY "jobs_owner_delete"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_jobs());

-- 9. RLS Policies for job_applications
DROP POLICY IF EXISTS "job_applications_public_insert" ON public.job_applications;
CREATE POLICY "job_applications_public_insert"
  ON public.job_applications FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "job_applications_owner_read" ON public.job_applications;
CREATE POLICY "job_applications_owner_read"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (
    public.is_admin_jobs()
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "job_applications_owner_update" ON public.job_applications;
CREATE POLICY "job_applications_owner_update"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_jobs()
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin_jobs()
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- 10. Storage bucket for job-images (insert if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-images',
  'job-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for job-images
DROP POLICY IF EXISTS "job_images_public_read" ON storage.objects;
CREATE POLICY "job_images_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'job-images');

DROP POLICY IF EXISTS "job_images_auth_upload" ON storage.objects;
CREATE POLICY "job_images_auth_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'job-images');

DROP POLICY IF EXISTS "job_images_auth_delete" ON storage.objects;
CREATE POLICY "job_images_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-images' AND (storage.foldername(name))[1] = auth.uid()::text);
