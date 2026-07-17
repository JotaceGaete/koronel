-- community_posts.category_key: stable taxonomy keys for Community posts (Fase 1: Categorías)
--
-- Plain TEXT column — not an enum, not a lookup table. Same pattern already used by
-- classified_ads.category_key / businesses.category_key in this schema (see
-- 20260304161514_coronellocal_schema.sql): a stable key, validated in the application layer
-- (communityService.COMMUNITY_CATEGORIES is the single source of truth), no DB-level CHECK
-- enumerating the current keys.
--
-- Deliberately not an enum: adding a category later would need an ALTER TYPE ... ADD VALUE
-- migration every time (and in Postgres < 12 that value can't even be used in the same
-- transaction that adds it). Deliberately not a categories table: the taxonomy is small and
-- fixed with no extra attributes (icon/color/counts) this module needs, and this codebase just
-- spent two rounds hardening Community specifically against fragile cross-table embeds — adding
-- a new one for 6 static keys would be the wrong direction. A plain column lets a future
-- category be added by editing one JS array, with no migration at all.
--
-- Backfill: every existing post gets 'general' (the DEFAULT below), except existing Encuestas
-- (identified by already having a community_polls row), which get 'polls' — matching the
-- auto-assignment createPoll() applies going forward. Idempotent: re-running only touches rows
-- still at the just-applied default, so it never overwrites a category an admin set afterwards.

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS category_key TEXT NOT NULL DEFAULT 'general';

UPDATE public.community_posts cp
SET category_key = 'polls'
WHERE category_key = 'general'
  AND EXISTS (SELECT 1 FROM public.community_polls p WHERE p.post_id = cp.id);

CREATE INDEX IF NOT EXISTS idx_community_posts_category_key ON public.community_posts(category_key);
