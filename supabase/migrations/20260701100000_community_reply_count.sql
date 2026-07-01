-- Add reply_count column to community_posts for efficient filtering and display
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS reply_count INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing active replies
UPDATE public.community_posts p
SET reply_count = (
  SELECT COUNT(*)
  FROM public.community_replies r
  WHERE r.post_id = p.id AND r.status = 'active'
);

-- Trigger function to keep reply_count in sync
CREATE OR REPLACE FUNCTION fn_update_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.community_posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.community_posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE public.community_posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
    ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE public.community_posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_reply_count ON public.community_replies;
CREATE TRIGGER trg_post_reply_count
AFTER INSERT OR UPDATE OR DELETE ON public.community_replies
FOR EACH ROW EXECUTE FUNCTION fn_update_post_reply_count();

-- Full-text search index for future unified search
CREATE INDEX IF NOT EXISTS idx_community_posts_fts
ON public.community_posts
USING GIN(to_tsvector('spanish', title || ' ' || COALESCE(body, '')));
