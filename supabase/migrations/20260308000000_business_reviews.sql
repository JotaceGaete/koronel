-- Business Reviews Migration
-- Tables: business_reviews
-- Features: one review per user per business, daily limit (5/day), owner replies, edit own review

-- ============================================================
-- 1. BUSINESS REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    owner_reply TEXT,
    owner_replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_business_reviews_business_id ON public.business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_user_id ON public.business_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_created_at ON public.business_reviews(created_at DESC);

-- One review per user per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_reviews_unique_user_business
    ON public.business_reviews(business_id, user_id);

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

-- Function: check daily review limit (max 5 per user per day)
CREATE OR REPLACE FUNCTION public.check_daily_review_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.business_reviews
    WHERE user_id = p_user_id
      AND created_at >= CURRENT_DATE
      AND created_at < CURRENT_DATE + INTERVAL '1 day';
    RETURN COALESCE(v_count, 0) < 5;
END;
$$;

-- Function: recalculate business rating after review insert/update/delete
CREATE OR REPLACE FUNCTION public.update_business_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id UUID;
    v_avg_rating NUMERIC(3,1);
    v_count INTEGER;
BEGIN
    -- Determine which business_id to update
    IF TG_OP = 'DELETE' THEN
        v_business_id := OLD.business_id;
    ELSE
        v_business_id := NEW.business_id;
    END IF;

    SELECT
        ROUND(AVG(rating)::NUMERIC, 1),
        COUNT(*)
    INTO v_avg_rating, v_count
    FROM public.business_reviews
    WHERE business_id = v_business_id;

    UPDATE public.businesses
    SET
        rating = COALESCE(v_avg_rating, 0),
        review_count = COALESCE(v_count, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_business_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function: set updated_at on review update
CREATE OR REPLACE FUNCTION public.set_review_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- ============================================================
-- 4. ENABLE RLS
-- ============================================================
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- Anyone can read reviews
DROP POLICY IF EXISTS "public_read_business_reviews" ON public.business_reviews;
CREATE POLICY "public_read_business_reviews"
    ON public.business_reviews
    FOR SELECT
    TO public
    USING (true);

-- Authenticated users can insert their own reviews
DROP POLICY IF EXISTS "users_insert_own_business_reviews" ON public.business_reviews;
CREATE POLICY "users_insert_own_business_reviews"
    ON public.business_reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own review (comment/rating only, not owner_reply)
DROP POLICY IF EXISTS "users_update_own_business_reviews" ON public.business_reviews;
CREATE POLICY "users_update_own_business_reviews"
    ON public.business_reviews
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own review
DROP POLICY IF EXISTS "users_delete_own_business_reviews" ON public.business_reviews;
CREATE POLICY "users_delete_own_business_reviews"
    ON public.business_reviews
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Business owners can update owner_reply on reviews for their business
DROP POLICY IF EXISTS "owners_reply_business_reviews" ON public.business_reviews;
CREATE POLICY "owners_reply_business_reviews"
    ON public.business_reviews
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = business_reviews.business_id
              AND b.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = business_reviews.business_id
              AND b.owner_id = auth.uid()
        )
    );

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Trigger: update business rating on review change
DROP TRIGGER IF EXISTS trg_update_business_rating_insert ON public.business_reviews;
CREATE TRIGGER trg_update_business_rating_insert
    AFTER INSERT ON public.business_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_business_rating();

DROP TRIGGER IF EXISTS trg_update_business_rating_update ON public.business_reviews;
CREATE TRIGGER trg_update_business_rating_update
    AFTER UPDATE ON public.business_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_business_rating();

DROP TRIGGER IF EXISTS trg_update_business_rating_delete ON public.business_reviews;
CREATE TRIGGER trg_update_business_rating_delete
    AFTER DELETE ON public.business_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_business_rating();

-- Trigger: auto-set updated_at
DROP TRIGGER IF EXISTS trg_set_review_updated_at ON public.business_reviews;
CREATE TRIGGER trg_set_review_updated_at
    BEFORE UPDATE ON public.business_reviews
    FOR EACH ROW EXECUTE FUNCTION public.set_review_updated_at();
