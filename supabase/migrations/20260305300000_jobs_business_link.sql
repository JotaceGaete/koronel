-- Add optional business_id FK to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_business_id ON public.jobs(business_id);
