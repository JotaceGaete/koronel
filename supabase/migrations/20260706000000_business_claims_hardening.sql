-- Harden the existing "reclamar negocio" flow (public.business_claims):
--   1. Add review/audit fields (evidence_notes, reviewed_by, reviewed_at, admin_notes, updated_at)
--   2. Prevent duplicate pending claims per (business, user)
--   3. Move approve/reject to SECURITY DEFINER RPCs so ownership transfer never
--      happens via a raw frontend UPDATE, and is atomic (claim + business in one tx).
--   4. Tighten RLS: admins may only READ business_claims directly; state changes
--      must go through the RPCs below.

-- ============================================================
-- 1. NEW COLUMNS
-- ============================================================
ALTER TABLE public.business_claims
  ADD COLUMN IF NOT EXISTS evidence_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

COMMENT ON COLUMN public.business_claims.evidence_notes IS 'Evidence/context supplied by the requester (link, RUT, etc).';
COMMENT ON COLUMN public.business_claims.reviewed_by IS 'Admin (user_profiles.id) who approved/rejected the claim.';
COMMENT ON COLUMN public.business_claims.admin_notes IS 'Private note from the admin, e.g. rejection reason.';

DROP TRIGGER IF EXISTS set_business_claims_updated_at ON public.business_claims;
CREATE TRIGGER set_business_claims_updated_at
    BEFORE UPDATE ON public.business_claims
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. AVOID DUPLICATE PENDING CLAIMS
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_claims_pending_per_user
ON public.business_claims (business_id, user_id)
WHERE claim_status = 'pending';

-- ============================================================
-- 3. SECURE APPROVE / REJECT RPCS
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_business_claim(p_claim_id UUID, p_admin_notes TEXT DEFAULT NULL)
RETURNS public.business_claims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim public.business_claims;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede aprobar solicitudes de reclamo';
  END IF;

  SELECT * INTO v_claim FROM public.business_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud de reclamo no encontrada';
  END IF;
  IF v_claim.claim_status <> 'pending' THEN
    RAISE EXCEPTION 'Esta solicitud ya fue revisada';
  END IF;
  IF v_claim.user_id IS NULL THEN
    RAISE EXCEPTION 'La solicitud no tiene un usuario asociado';
  END IF;

  UPDATE public.businesses
  SET owner_id = v_claim.user_id,
      claimed = true,
      verified = true
  WHERE id = v_claim.business_id;

  UPDATE public.business_claims
  SET claim_status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = CURRENT_TIMESTAMP,
      admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_claim_id
  RETURNING * INTO v_claim;

  -- Defensive: auto-reject any other still-pending claim for the same business.
  UPDATE public.business_claims
  SET claim_status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = CURRENT_TIMESTAMP,
      admin_notes = COALESCE(admin_notes, 'Negocio ya fue reclamado por otro usuario')
  WHERE business_id = v_claim.business_id
    AND id <> p_claim_id
    AND claim_status = 'pending';

  RETURN v_claim;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_business_claim(p_claim_id UUID, p_admin_notes TEXT DEFAULT NULL)
RETURNS public.business_claims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim public.business_claims;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede rechazar solicitudes de reclamo';
  END IF;

  SELECT * INTO v_claim FROM public.business_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud de reclamo no encontrada';
  END IF;
  IF v_claim.claim_status <> 'pending' THEN
    RAISE EXCEPTION 'Esta solicitud ya fue revisada';
  END IF;

  UPDATE public.business_claims
  SET claim_status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = CURRENT_TIMESTAMP,
      admin_notes = p_admin_notes
  WHERE id = p_claim_id
  RETURNING * INTO v_claim;

  RETURN v_claim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_business_claim(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_business_claim(UUID, TEXT) TO authenticated;

-- ============================================================
-- 4. RLS: admins get READ only on business_claims; writes go through the RPCs
--    above (SECURITY DEFINER, executed as table owner => not subject to RLS).
-- ============================================================
DROP POLICY IF EXISTS "admin_manage_business_claims" ON public.business_claims;

DROP POLICY IF EXISTS "admin_read_business_claims" ON public.business_claims;
CREATE POLICY "admin_read_business_claims"
ON public.business_claims FOR SELECT TO authenticated
USING (public.is_admin());

-- Requesters may only ever see/insert their own claims (unchanged, re-asserted
-- here for clarity since this migration touches the table's policy set).
DROP POLICY IF EXISTS "authenticated_insert_claims" ON public.business_claims;
CREATE POLICY "authenticated_insert_claims"
ON public.business_claims FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owners_read_own_claims" ON public.business_claims;
CREATE POLICY "owners_read_own_claims"
ON public.business_claims FOR SELECT TO authenticated
USING (user_id = auth.uid());
