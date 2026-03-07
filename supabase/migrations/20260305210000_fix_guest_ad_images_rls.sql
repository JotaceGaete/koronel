-- Fix guest classified ad image upload RLS policies
-- Root cause: anon role had no INSERT policy on ad_images or storage.objects
-- This prevented guests from uploading images and linking them to their pending ads
-- The classified_ads anon INSERT policy already exists in 20260305200000_classified_ads_spam_protection.sql

-- ============================================================
-- 1. Fix ad_images: allow anon inserts for guest ads (user_id IS NULL)
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_ad_images" ON public.ad_images;
CREATE POLICY "anon_insert_ad_images"
ON public.ad_images
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.classified_ads ca
        WHERE ca.id = ad_id
          AND ca.user_id IS NULL
    )
);

-- ============================================================
-- 2. Fix storage: allow anon uploads to ad-images bucket
-- ============================================================
DROP POLICY IF EXISTS "anon_upload_ad_images" ON storage.objects;
CREATE POLICY "anon_upload_ad_images"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'ad-images');

-- ============================================================
-- 3. Fix classified_ads UPDATE: allow any authenticated user to update guest ads
--    (guest ads have user_id IS NULL; existing owners_update policy requires user_id = auth.uid())
--    This is needed so admin can approve/reject guest ads
-- ============================================================
DROP POLICY IF EXISTS "owners_update_classified_ads" ON public.classified_ads;
CREATE POLICY "owners_update_classified_ads"
ON public.classified_ads
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR user_id IS NULL
)
WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
);

-- ============================================================
-- 4. Allow anon to read their own pending ads (by id) so detail page works
--    The existing anon_read_active_classified_ads only allows reading active ads
--    We extend it to also allow reading pending ads (for verification flow)
-- ============================================================
DROP POLICY IF EXISTS "anon_read_active_classified_ads" ON public.classified_ads;
CREATE POLICY "anon_read_active_classified_ads"
ON public.classified_ads
FOR SELECT
TO anon
USING (ad_status::TEXT IN ('active', 'pending'));
