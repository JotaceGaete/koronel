-- Add email_notifications preference to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
