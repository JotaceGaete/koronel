-- Fase 1: vínculo real Koronel <-> Walinka sin sincronización, billing ni productos.

CREATE TABLE IF NOT EXISTS public.business_walinka_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  koronel_business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  walinka_business_id UUID REFERENCES public.wa_businesses(id) ON DELETE CASCADE,
  connected_at TIMESTAMPTZ,
  connection_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (connection_status IN ('pending', 'connected', 'revoked', 'duplicate_review')),
  source TEXT NOT NULL DEFAULT 'koronel'
    CHECK (source IN ('koronel', 'walinka', 'admin')),
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS business_walinka_links_unique_pair
ON public.business_walinka_links (koronel_business_id, walinka_business_id)
WHERE walinka_business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS business_walinka_links_one_pending_without_catalog
ON public.business_walinka_links (koronel_business_id)
WHERE walinka_business_id IS NULL AND connection_status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS business_walinka_links_one_active_koronel
ON public.business_walinka_links (koronel_business_id)
WHERE connection_status IN ('pending', 'connected');

CREATE UNIQUE INDEX IF NOT EXISTS business_walinka_links_one_active_walinka
ON public.business_walinka_links (walinka_business_id)
WHERE walinka_business_id IS NOT NULL AND connection_status IN ('pending', 'connected');

CREATE INDEX IF NOT EXISTS idx_business_walinka_links_walinka_business_id
ON public.business_walinka_links (walinka_business_id);

CREATE INDEX IF NOT EXISTS idx_business_walinka_links_connected_by
ON public.business_walinka_links (connected_by);

CREATE OR REPLACE FUNCTION public.set_business_walinka_links_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_business_walinka_links_updated_at ON public.business_walinka_links;
CREATE TRIGGER set_business_walinka_links_updated_at
  BEFORE UPDATE ON public.business_walinka_links
  FOR EACH ROW EXECUTE FUNCTION public.set_business_walinka_links_updated_at();

ALTER TABLE public.business_walinka_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_own_business_walinka_links" ON public.business_walinka_links;
CREATE POLICY "owners_read_own_business_walinka_links"
ON public.business_walinka_links
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = koronel_business_id
      AND b.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.wa_businesses wb
    WHERE wb.id = walinka_business_id
      AND wb.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "admin_manage_business_walinka_links" ON public.business_walinka_links;
CREATE POLICY "admin_manage_business_walinka_links"
ON public.business_walinka_links
FOR ALL TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE OR REPLACE FUNCTION public.get_business_walinka_link_status(p_koronel_business_id UUID)
RETURNS TABLE (
  koronel_business_id UUID,
  walinka_business_id UUID,
  connection_status TEXT,
  source TEXT,
  connected_at TIMESTAMPTZ,
  connected_by UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_koronel_business_id
      AND b.owner_id = auth.uid()
      AND COALESCE(b.claimed, false) = true
  ) THEN
    RAISE EXCEPTION 'Only the claimed Koronel business owner can read this link';
  END IF;

  RETURN QUERY
  SELECT
    bwl.koronel_business_id,
    bwl.walinka_business_id,
    bwl.connection_status,
    bwl.source,
    bwl.connected_at,
    bwl.connected_by
  FROM public.business_walinka_links bwl
  WHERE bwl.koronel_business_id = p_koronel_business_id
    AND bwl.connection_status IN ('pending', 'connected')
  ORDER BY
    CASE bwl.connection_status WHEN 'connected' THEN 0 ELSE 1 END,
    bwl.updated_at DESC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_business_walinka_link(
  p_koronel_business_id UUID,
  p_walinka_business_id UUID DEFAULT NULL
)
RETURNS TABLE (
  koronel_business_id UUID,
  walinka_business_id UUID,
  connection_status TEXT,
  source TEXT,
  connected_at TIMESTAMPTZ,
  connected_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_status TEXT := CASE WHEN p_walinka_business_id IS NULL THEN 'pending' ELSE 'connected' END;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_koronel_business_id
      AND b.owner_id = v_user_id
      AND COALESCE(b.claimed, false) = true
  ) THEN
    RAISE EXCEPTION 'Only the claimed Koronel business owner can request this link';
  END IF;

  IF p_walinka_business_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.wa_businesses wb
    WHERE wb.id = p_walinka_business_id
      AND wb.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Only the Walinka business owner can connect this catalog';
  END IF;

  IF p_walinka_business_id IS NOT NULL THEN
    UPDATE public.business_walinka_links bwl
    SET
      walinka_business_id = p_walinka_business_id,
      connection_status = 'connected',
      source = 'koronel',
      connected_at = COALESCE(bwl.connected_at, now()),
      connected_by = v_user_id,
      updated_at = now()
    WHERE bwl.koronel_business_id = p_koronel_business_id
      AND bwl.walinka_business_id IS NULL
      AND bwl.connection_status = 'pending';
  END IF;

  INSERT INTO public.business_walinka_links (
    koronel_business_id,
    walinka_business_id,
    connection_status,
    source,
    connected_at,
    connected_by
  )
  VALUES (
    p_koronel_business_id,
    p_walinka_business_id,
    v_status,
    'koronel',
    CASE WHEN v_status = 'connected' THEN now() ELSE NULL END,
    v_user_id
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.business_walinka_links bwl
  SET
    connection_status = v_status,
    source = 'koronel',
    connected_at = CASE WHEN v_status = 'connected' THEN COALESCE(bwl.connected_at, now()) ELSE bwl.connected_at END,
    connected_by = v_user_id,
    updated_at = now()
  WHERE bwl.koronel_business_id = p_koronel_business_id
    AND (
      (p_walinka_business_id IS NULL AND bwl.walinka_business_id IS NULL)
      OR bwl.walinka_business_id = p_walinka_business_id
    );

  RETURN QUERY
  SELECT
    bwl.koronel_business_id,
    bwl.walinka_business_id,
    bwl.connection_status,
    bwl.source,
    bwl.connected_at,
    bwl.connected_by
  FROM public.business_walinka_links bwl
  WHERE bwl.koronel_business_id = p_koronel_business_id
    AND bwl.connection_status IN ('pending', 'connected')
  ORDER BY
    CASE bwl.connection_status WHEN 'connected' THEN 0 ELSE 1 END,
    bwl.updated_at DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_walinka_link_status(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_business_walinka_link(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_walinka_link_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_business_walinka_link(UUID, UUID) TO authenticated;
