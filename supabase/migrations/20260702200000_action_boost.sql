-- ═══════════════════════════════════════════════════════════════════════════════
-- Boost de acciones comerciales
-- Agrega columnas para rastrear el estado de impulso y su consumo de créditos.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.commercial_actions
  ADD COLUMN IF NOT EXISTS boosted_at           timestamptz,
  ADD COLUMN IF NOT EXISTS boost_consumption_id uuid
    REFERENCES public.credit_consumptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_actions_boosted
  ON public.commercial_actions(boosted_at)
  WHERE boosted_at IS NOT NULL;

COMMENT ON COLUMN public.commercial_actions.boosted_at IS
  'Timestamp cuando se impulsó la acción. NULL = no impulsada.';

COMMENT ON COLUMN public.commercial_actions.boost_consumption_id IS
  'FK al consumo de créditos que financió el impulso. Permite auditoría y reembolso.';
