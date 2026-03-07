-- Classified Ads Spam Protection Migration
-- Adds: pending status, ip_address, guest_email, verified_at, daily post tracking
-- Creates: pending_ad_submissions for guest users awaiting email verification

-- ============================================================
-- 1. EXTEND ad_status ENUM to include 'pending'
-- Must be done outside a transaction block so it commits immediately
-- ============================================================
ALTER TYPE public.ad_status ADD VALUE IF NOT EXISTS 'pending';

-- ============================================================
-- 2. ADD COLUMNS TO classified_ads
-- ============================================================
ALTER TABLE public.classified_ads
    ADD COLUMN IF NOT EXISTS ip_address TEXT,
    ADD COLUMN IF NOT EXISTS guest_email TEXT,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- ============================================================
-- 3. CREATE daily_post_tracking TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_post_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('user_id', 'ip', 'email')),
    post_date DATE NOT NULL DEFAULT CURRENT_DATE,
    post_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_post_tracking_unique
    ON public.daily_post_tracking (identifier, identifier_type, post_date);

CREATE INDEX IF NOT EXISTS idx_daily_post_tracking_date
    ON public.daily_post_tracking (post_date);

-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- Function to check daily post limit (max 3 per day per identifier)
CREATE OR REPLACE FUNCTION public.check_daily_post_limit(
    p_identifier TEXT,
    p_identifier_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COALESCE(post_count, 0) INTO v_count
    FROM public.daily_post_tracking
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND post_date = CURRENT_DATE;
    
    RETURN COALESCE(v_count, 0) < 3;
END;
$$;

-- Function to increment daily post count
CREATE OR REPLACE FUNCTION public.increment_daily_post_count(
    p_identifier TEXT,
    p_identifier_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.daily_post_tracking (identifier, identifier_type, post_date, post_count)
    VALUES (p_identifier, p_identifier_type, CURRENT_DATE, 1)
    ON CONFLICT (identifier, identifier_type, post_date)
    DO UPDATE SET
        post_count = public.daily_post_tracking.post_count + 1,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- Function to verify ad by token
CREATE OR REPLACE FUNCTION public.verify_ad_by_token(
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ad_id UUID;
    v_current_status TEXT;
BEGIN
    SELECT id, ad_status::TEXT INTO v_ad_id, v_current_status
    FROM public.classified_ads
    WHERE verification_token = p_token
      AND ad_status::TEXT = 'pending'
    LIMIT 1;
    
    IF v_ad_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Token invalido o aviso ya verificado');
    END IF;
    
    UPDATE public.classified_ads
    SET
        ad_status = 'active'::public.ad_status,
        verified_at = CURRENT_TIMESTAMP,
        verification_token = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_ad_id;
    
    RETURN jsonb_build_object('success', true, 'ad_id', v_ad_id::TEXT);
END;
$$;

-- ============================================================
-- 5. ENABLE RLS
-- ============================================================
ALTER TABLE public.daily_post_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- daily_post_tracking: only service role can manage
DROP POLICY IF EXISTS "service_manage_daily_post_tracking" ON public.daily_post_tracking;
CREATE POLICY "service_manage_daily_post_tracking"
ON public.daily_post_tracking FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Allow anon to insert classified_ads (guest submissions)
DROP POLICY IF EXISTS "anon_insert_classified_ads" ON public.classified_ads;
CREATE POLICY "anon_insert_classified_ads"
ON public.classified_ads FOR INSERT TO anon
WITH CHECK (ad_status::TEXT = 'pending' AND user_id IS NULL);

-- Allow anon to read active ads
DROP POLICY IF EXISTS "anon_read_active_classified_ads" ON public.classified_ads;
CREATE POLICY "anon_read_active_classified_ads"
ON public.classified_ads FOR SELECT TO anon
USING (ad_status::TEXT = 'active');

-- ============================================================
-- 7. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_classified_ads_verification_token
    ON public.classified_ads (verification_token)
    WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_classified_ads_guest_email
    ON public.classified_ads (guest_email)
    WHERE guest_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_classified_ads_ip_address
    ON public.classified_ads (ip_address)
    WHERE ip_address IS NOT NULL;
