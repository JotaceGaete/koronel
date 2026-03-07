-- Classified Ad Messages Migration
-- Allows users to send messages to ad owners and reply

-- ============================================================
-- 1. MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ad_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES public.classified_ads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.ad_messages(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ad_messages_ad_id ON public.ad_messages(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_messages_sender_id ON public.ad_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ad_messages_receiver_id ON public.ad_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_ad_messages_parent_id ON public.ad_messages(parent_id);

-- ============================================================
-- 3. ENABLE RLS
-- ============================================================
ALTER TABLE public.ad_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- Users can view messages where they are sender or receiver
DROP POLICY IF EXISTS "users_view_own_ad_messages" ON public.ad_messages;
CREATE POLICY "users_view_own_ad_messages"
ON public.ad_messages
FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Users can send messages (insert) as sender
DROP POLICY IF EXISTS "users_send_ad_messages" ON public.ad_messages;
CREATE POLICY "users_send_ad_messages"
ON public.ad_messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Users can mark messages as read if they are the receiver
DROP POLICY IF EXISTS "users_update_own_ad_messages" ON public.ad_messages;
CREATE POLICY "users_update_own_ad_messages"
ON public.ad_messages
FOR UPDATE
TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

-- Users can delete their own sent messages
DROP POLICY IF EXISTS "users_delete_own_ad_messages" ON public.ad_messages;
CREATE POLICY "users_delete_own_ad_messages"
ON public.ad_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());
