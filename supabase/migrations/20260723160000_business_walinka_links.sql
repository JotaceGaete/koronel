-- PR-K1: vínculo Koronel <-> Walinka (tabla puente + RPCs).
--
-- Alcance aprobado para esta primera versión: solo 3 transiciones reales,
-- ninguna otra:
--   sin vínculo -> conectar catálogo propio verificado -> connected
--   connected -> revocar -> revoked
--   revoked -> reconectar -> nueva fila connected
-- Sin "pending", sin "duplicate_review" como fila persistida. Un conflicto
-- de propiedad es un error de la RPC (no se inserta nada), no un estado.
--
-- Depende de que PR-W1 (jotacegaete/saas) ya esté desplegado en el
-- proyecto Supabase compartido: get_business_walinka_link_status llama a
-- public.get_walinka_catalog_public_info(), que vive del lado Walinka.
-- Confirmado desplegado y verificado antes de escribir este archivo.

-- ============================================================
-- 1. Tabla
-- ============================================================

CREATE TABLE IF NOT EXISTS public.business_walinka_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  koronel_business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  walinka_business_id   UUID NOT NULL REFERENCES public.wa_businesses(id) ON DELETE CASCADE,
  connection_status     TEXT NOT NULL CHECK (connection_status IN ('connected', 'revoked')),
  source                TEXT NOT NULL DEFAULT 'koronel' CHECK (source IN ('koronel', 'admin')),
  connected_at          TIMESTAMPTZ,
  connected_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at            TIMESTAMPTZ,
  revoked_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relación activa 1:1: un negocio Koronel solo puede tener UNA fila
-- 'connected' a la vez, y un catálogo Walinka solo puede estar
-- activamente vinculado a UN negocio Koronel a la vez. Las filas
-- 'revoked' quedan fuera de estos índices a propósito, para permitir
-- reconectar el mismo par después de revocar.
CREATE UNIQUE INDEX IF NOT EXISTS business_walinka_links_one_active_koronel
ON public.business_walinka_links (koronel_business_id)
WHERE connection_status = 'connected';

CREATE UNIQUE INDEX IF NOT EXISTS business_walinka_links_one_active_walinka
ON public.business_walinka_links (walinka_business_id)
WHERE connection_status = 'connected';

CREATE INDEX IF NOT EXISTS idx_business_walinka_links_walinka_business_id
ON public.business_walinka_links (walinka_business_id);

CREATE INDEX IF NOT EXISTS idx_business_walinka_links_connected_by
ON public.business_walinka_links (connected_by);

-- ============================================================
-- 2. Trigger updated_at
-- ============================================================

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

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.business_walinka_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_own_business_walinka_links" ON public.business_walinka_links;
CREATE POLICY "owners_read_own_business_walinka_links"
ON public.business_walinka_links
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = koronel_business_id AND b.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.wa_businesses wb
    WHERE wb.id = walinka_business_id AND wb.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "admin_manage_business_walinka_links" ON public.business_walinka_links;
CREATE POLICY "admin_manage_business_walinka_links"
ON public.business_walinka_links
FOR ALL TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Ningún otro rol puede escribir directamente: toda escritura pasa por las
-- RPCs de abajo, que validan propiedad en ambos lados antes de tocar la
-- tabla.

-- ============================================================
-- 4. request_business_walinka_link
-- ============================================================

CREATE OR REPLACE FUNCTION public.request_business_walinka_link(
  p_koronel_business_id UUID,
  p_walinka_business_id UUID
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_conflicting_koronel_business_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'WALINKA_AUTH_REQUIRED';
  END IF;

  IF p_walinka_business_id IS NULL THEN
    RAISE EXCEPTION 'WALINKA_CATALOG_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_koronel_business_id
      AND b.owner_id = v_user_id
      AND COALESCE(b.claimed, false) = true
  ) THEN
    RAISE EXCEPTION 'KORONEL_BUSINESS_NOT_CLAIMED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.wa_businesses wb
    WHERE wb.id = p_walinka_business_id AND wb.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'WALINKA_CATALOG_NOT_OWNED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.wa_businesses wb
    WHERE wb.id = p_walinka_business_id AND COALESCE(wb.is_active, false) = true
  ) THEN
    RAISE EXCEPTION 'WALINKA_CATALOG_INACTIVE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_walinka_links bwl
    WHERE bwl.koronel_business_id = p_koronel_business_id
      AND bwl.connection_status = 'connected'
  ) THEN
    RAISE EXCEPTION 'WALINKA_LINK_ALREADY_ACTIVE';
  END IF;

  -- ¿Ese catálogo Walinka ya está activamente vinculado a OTRO negocio
  -- Koronel? La propiedad Walinka de p_walinka_business_id ya se probó
  -- arriba (es del usuario actual) — lo que falta distinguir es si el
  -- OTRO negocio Koronel involucrado también es del usuario actual (no es
  -- un conflicto real, solo tiene que elegir uno) o de otra persona (sí es
  -- un conflicto real entre propietarios distintos).
  SELECT bwl.koronel_business_id INTO v_conflicting_koronel_business_id
  FROM public.business_walinka_links bwl
  WHERE bwl.walinka_business_id = p_walinka_business_id
    AND bwl.connection_status = 'connected'
  LIMIT 1;

  IF v_conflicting_koronel_business_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = v_conflicting_koronel_business_id AND b.owner_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'WALINKA_CATALOG_LINKED_TO_ANOTHER_OWN_BUSINESS';
    ELSE
      -- No se revela a qué negocio ni a qué dueño está vinculado.
      RAISE EXCEPTION 'WALINKA_OWNERSHIP_CONFLICT';
    END IF;
  END IF;

  RETURN QUERY
  INSERT INTO public.business_walinka_links (
    koronel_business_id, walinka_business_id, connection_status, source, connected_at, connected_by
  )
  VALUES (
    p_koronel_business_id, p_walinka_business_id, 'connected', 'koronel', now(), v_user_id
  )
  RETURNING business_walinka_links.koronel_business_id, business_walinka_links.walinka_business_id,
            business_walinka_links.connection_status, business_walinka_links.source,
            business_walinka_links.connected_at, business_walinka_links.connected_by;
END;
$$;

REVOKE ALL ON FUNCTION public.request_business_walinka_link(UUID, UUID) FROM PUBLIC;
-- REVOKE ALL FROM PUBLIC no alcanza a un GRANT otorgado directamente a un
-- rol específico (p. ej. por una regla de ALTER DEFAULT PRIVILEGES del
-- proyecto) — este REVOKE explícito es necesario incluso en una
-- instalación nueva sin ese historial; es un no-op inofensivo si anon
-- nunca tuvo el permiso.
REVOKE EXECUTE ON FUNCTION public.request_business_walinka_link(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_business_walinka_link(UUID, UUID) TO authenticated;

-- ============================================================
-- 5. revoke_business_walinka_link
-- ============================================================

CREATE OR REPLACE FUNCTION public.revoke_business_walinka_link(p_koronel_business_id UUID)
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row_count INT;
  v_koronel_business_id UUID;
  v_walinka_business_id UUID;
  v_connection_status TEXT;
  v_source TEXT;
  v_connected_at TIMESTAMPTZ;
  v_connected_by UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'WALINKA_AUTH_REQUIRED';
  END IF;

  IF NOT public.is_admin_user() AND NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_koronel_business_id AND b.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'WALINKA_NOT_AUTHORIZED';
  END IF;

  UPDATE public.business_walinka_links bwl
  SET connection_status = 'revoked', revoked_at = now(), revoked_by = v_user_id, updated_at = now()
  WHERE bwl.koronel_business_id = p_koronel_business_id
    AND bwl.connection_status = 'connected'
  RETURNING bwl.koronel_business_id, bwl.walinka_business_id, bwl.connection_status,
            bwl.source, bwl.connected_at, bwl.connected_by
  INTO v_koronel_business_id, v_walinka_business_id, v_connection_status, v_source, v_connected_at, v_connected_by;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count = 0 THEN
    RAISE EXCEPTION 'WALINKA_LINK_NOT_FOUND';
  END IF;

  RETURN QUERY SELECT v_koronel_business_id, v_walinka_business_id, v_connection_status, v_source, v_connected_at, v_connected_by;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_business_walinka_link(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revoke_business_walinka_link(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_business_walinka_link(UUID) TO authenticated;

-- ============================================================
-- 6. get_business_walinka_link_status
-- ============================================================
--
-- Enriquecida con public.get_walinka_catalog_public_info() (Walinka,
-- PR-W1 — ya desplegada y verificada). Se llama a la RPC pública
-- sancionada, nunca a wa_resolve_catalog_url() directamente, aunque esta
-- función corra como su dueño (con privilegios suficientes para hacerlo):
-- es una decisión de gobierno, no solo una restricción técnica.
--
-- Alias de columnas walinka_* elegidos para calzar exactamente con lo que
-- PR-K2 (src/services/walinkaLinkService.js, normalizeLink()) ya asume:
-- walinka_name, walinka_logo_url, walinka_is_active, walinka_public_url,
-- walinka_uses_custom_domain. No hace falta tocar PR-K2.

CREATE OR REPLACE FUNCTION public.get_business_walinka_link_status(p_koronel_business_id UUID)
RETURNS TABLE (
  koronel_business_id UUID,
  walinka_business_id UUID,
  connection_status TEXT,
  source TEXT,
  connected_at TIMESTAMPTZ,
  connected_by UUID,
  walinka_name TEXT,
  walinka_logo_url TEXT,
  walinka_is_active BOOLEAN,
  walinka_public_url TEXT,
  walinka_uses_custom_domain BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'WALINKA_AUTH_REQUIRED';
  END IF;

  IF NOT public.is_admin_user() AND NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_koronel_business_id AND b.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'WALINKA_NOT_AUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT
    bwl.koronel_business_id, bwl.walinka_business_id, bwl.connection_status,
    bwl.source, bwl.connected_at, bwl.connected_by,
    wpi.name, wpi.logo_url, wpi.is_active, wpi.public_url, wpi.uses_custom_domain
  FROM public.business_walinka_links bwl
  LEFT JOIN public.get_walinka_catalog_public_info(bwl.walinka_business_id) wpi ON true
  WHERE bwl.koronel_business_id = p_koronel_business_id
    AND bwl.connection_status = 'connected';
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_walinka_link_status(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_business_walinka_link_status(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_business_walinka_link_status(UUID) TO authenticated;
