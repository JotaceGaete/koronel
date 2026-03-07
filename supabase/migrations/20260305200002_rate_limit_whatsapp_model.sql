-- Rate Limit Update: WhatsApp Verification Model
-- Guest IP: 10/day | Authenticated user: 20/day | Premium/Claimed owner: unlimited
-- Cooldown: 1 ad per 60 seconds per IP

-- ============================================================
-- 1. ADD last_post_at TO daily_post_tracking FOR COOLDOWN
-- ============================================================
ALTER TABLE public.daily_post_tracking
    ADD COLUMN IF NOT EXISTS last_post_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- 2. REPLACE check_daily_post_limit WITH MULTI-TIER FUNCTION
-- Accepts optional p_user_id so it can check premium status
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_daily_post_limit(
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_user_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_is_premium BOOLEAN := FALSE;
    v_is_claimed_owner BOOLEAN := FALSE;
    v_daily_limit INTEGER;
BEGIN
    -- Check if user is premium (business with status = 'premium' and valid premium_until)
    IF p_user_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.owner_id = p_user_id::UUID
              AND b.status = 'premium'
              AND (b.premium_until IS NULL OR b.premium_until > NOW())
        ) INTO v_is_premium;

        -- Check if user is an approved claimed business owner
        IF NOT v_is_premium THEN
            SELECT EXISTS (
                SELECT 1 FROM public.business_claims bc
                WHERE bc.user_id = p_user_id::UUID
                  AND bc.claim_status = 'approved'::public.claim_status
            ) INTO v_is_claimed_owner;
        END IF;
    END IF;

    -- Premium or claimed owners have unlimited posting
    IF v_is_premium OR v_is_claimed_owner THEN
        RETURN TRUE;
    END IF;

    -- Determine daily limit based on identifier type
    IF p_identifier_type = 'ip' THEN
        v_daily_limit := 10;   -- Guest: 10 ads per IP per day
    ELSIF p_identifier_type = 'user_id' THEN
        v_daily_limit := 20;   -- Authenticated: 20 ads per user per day
    ELSE
        v_daily_limit := 10;   -- email fallback (guest)
    END IF;

    SELECT COALESCE(post_count, 0) INTO v_count
    FROM public.daily_post_tracking
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND post_date = CURRENT_DATE;

    RETURN COALESCE(v_count, 0) < v_daily_limit;
END;
$$;

-- ============================================================
-- 3. COOLDOWN CHECK FUNCTION (1 ad per 60 seconds per IP)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_post_cooldown(
    p_ip TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_post_at TIMESTAMPTZ;
BEGIN
    SELECT last_post_at INTO v_last_post_at
    FROM public.daily_post_tracking
    WHERE identifier = p_ip
      AND identifier_type = 'ip'
      AND post_date = CURRENT_DATE;

    -- No previous post today → cooldown OK
    IF v_last_post_at IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Allow if at least 60 seconds have passed
    RETURN EXTRACT(EPOCH FROM (NOW() - v_last_post_at)) >= 60;
END;
$$;

-- ============================================================
-- 4. UPDATE increment_daily_post_count TO RECORD last_post_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_daily_post_count(
    p_identifier TEXT,
    p_identifier_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.daily_post_tracking (identifier, identifier_type, post_date, post_count, last_post_at)
    VALUES (p_identifier, p_identifier_type, CURRENT_DATE, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (identifier, identifier_type, post_date)
    DO UPDATE SET
        post_count = public.daily_post_tracking.post_count + 1,
        last_post_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- ============================================================
-- 5. RLS: allow anon to call the new functions via rpc
-- (functions are SECURITY DEFINER so they run as owner)
-- daily_post_tracking: also allow anon to read for cooldown check
-- ============================================================
DROP POLICY IF EXISTS "anon_read_daily_post_tracking" ON public.daily_post_tracking;
CREATE POLICY "anon_read_daily_post_tracking"
ON public.daily_post_tracking FOR SELECT TO anon
USING (true);

DROP POLICY IF EXISTS "anon_insert_daily_post_tracking" ON public.daily_post_tracking;
CREATE POLICY "anon_insert_daily_post_tracking"
ON public.daily_post_tracking FOR INSERT TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_daily_post_tracking" ON public.daily_post_tracking;
CREATE POLICY "anon_update_daily_post_tracking"
ON public.daily_post_tracking FOR UPDATE TO anon
USING (true) WITH CHECK (true);
