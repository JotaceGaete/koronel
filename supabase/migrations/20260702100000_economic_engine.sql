-- ═══════════════════════════════════════════════════════════════════════════════
-- Motor Económico — Fase 1
-- Tablas: wallets, wallet_transactions, credit_rules, credit_packages,
--         credit_consumptions, plan_credit_benefits
-- Depende de: accounts, products (Capa Account)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. wallets ───────────────────────────────────────────────────────────────
-- Una wallet por account. Tres bolsas separadas: purchased, plan, bonus.
-- balance_total es columna generada — nunca se escribe directamente.

CREATE TABLE IF NOT EXISTS public.wallets (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,

  -- Tres bolsas de créditos
  balance_purchased   integer     NOT NULL DEFAULT 0 CHECK (balance_purchased   >= 0),
  balance_plan        integer     NOT NULL DEFAULT 0 CHECK (balance_plan        >= 0),
  balance_bonus       integer     NOT NULL DEFAULT 0 CHECK (balance_bonus       >= 0),

  -- Reservas por bolsa (créditos comprometidos en operaciones en vuelo)
  reserved_purchased  integer     NOT NULL DEFAULT 0 CHECK (reserved_purchased  >= 0),
  reserved_plan       integer     NOT NULL DEFAULT 0 CHECK (reserved_plan       >= 0),
  reserved_bonus      integer     NOT NULL DEFAULT 0 CHECK (reserved_bonus      >= 0),

  -- Totales derivados (calculados, para queries rápidas)
  balance_total       integer     GENERATED ALWAYS AS
                        (balance_purchased + balance_plan + balance_bonus) STORED,
  reserved_total      integer     GENERATED ALWAYS AS
                        (reserved_purchased + reserved_plan + reserved_bonus) STORED,

  -- Analítica histórica
  lifetime_earned     integer     NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_spent      integer     NOT NULL DEFAULT 0 CHECK (lifetime_spent  >= 0),

  -- Último crédito mensual del plan (para cron de recarga)
  plan_credits_at     timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (account_id)
);

CREATE INDEX IF NOT EXISTS idx_wallets_account_id ON public.wallets(account_id);

DROP TRIGGER IF EXISTS set_wallets_updated_at ON public.wallets;
CREATE TRIGGER set_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 2. wallet_transactions ───────────────────────────────────────────────────
-- Libro mayor inmutable. Nunca se actualiza ni se borra.
-- Todo cambio de saldo genera una fila aquí.

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id        uuid        NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,

  -- Qué bolsa se movió
  credit_type      text        NOT NULL CHECK (credit_type IN ('purchased', 'plan', 'bonus')),

  -- Tipo de operación (interno)
  type             text        NOT NULL CHECK (type IN (
                     'credit_purchase',   -- compra de paquete
                     'plan_benefit',      -- créditos mensuales del plan
                     'bonus_grant',       -- créditos promocionales / regalo
                     'gamification',      -- créditos por acción del usuario
                     'reserve',           -- reserva para operación en vuelo
                     'release',           -- liberación de reserva (op. cancelada)
                     'consume',           -- consumo real (op. completada)
                     'refund',            -- reembolso
                     'expiry',            -- vencimiento de créditos bonus
                     'adjustment'         -- corrección manual (solo admin)
                   )),

  -- Movimiento: positivo = entrada, negativo = salida
  amount           integer     NOT NULL,

  -- Snapshot del saldo total antes y después del movimiento
  balance_before   integer     NOT NULL,
  balance_after    integer     NOT NULL,

  -- Texto legible para el usuario (nunca términos técnicos)
  display_label    text        NOT NULL,

  -- FK polimórfica al objeto que generó el movimiento
  reference_type   text,       -- 'credit_package' | 'commercial_action' | 'plan' | etc.
  reference_id     uuid,

  -- Consumo relacionado (para reserve/release/consume)
  consumption_id   uuid,

  -- Vencimiento (solo para bonus)
  expires_at       timestamptz,

  -- Previene duplicados en reintentos de red
  idempotency_key  text        UNIQUE,

  metadata         jsonb       NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id   ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_ref         ON public.wallet_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_idempotency ON public.wallet_transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_consumption ON public.wallet_transactions(consumption_id);


-- ─── 3. credit_rules ──────────────────────────────────────────────────────────
-- Motor de precios configurable. Sin hardcodear costos en el código.
-- product_id FK hacia products — integridad referencial real.

CREATE TABLE IF NOT EXISTS public.credit_rules (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  action_key    text        NOT NULL UNIQUE,
  credits_cost  integer     NOT NULL CHECK (credits_cost > 0),
  display_label text        NOT NULL,   -- texto en historial: "Correo enviado"
  description   text,                  -- texto en UI: "Difunde tu promoción por email"
  category      text        NOT NULL CHECK (category IN ('reach', 'ai', 'featured', 'analytics')),
  is_active     boolean     NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_rules_product_id ON public.credit_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_credit_rules_action_key ON public.credit_rules(action_key);

DROP TRIGGER IF EXISTS set_credit_rules_updated_at ON public.credit_rules;
CREATE TRIGGER set_credit_rules_updated_at
  BEFORE UPDATE ON public.credit_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed de reglas iniciales
INSERT INTO public.credit_rules (product_id, action_key, credits_cost, display_label, description, category)
SELECT p.id, r.action_key, r.credits_cost, r.display_label, r.description, r.category
FROM public.products p
JOIN (VALUES
  ('koronel', 'PROMOTION_BOOST',     1, 'Promoción impulsada',          'Impulsa tu promoción para mayor visibilidad',     'reach'),
  ('koronel', 'PROMOTION_EMAIL',     2, 'Correo enviado',               'Difunde tu promoción por email a clientes',        'reach'),
  ('koronel', 'PROMOTION_PUSH',      2, 'Notificación push enviada',    'Envía notificación push a tus seguidores',         'reach'),
  ('koronel', 'PROMOTION_WHATSAPP',  4, 'WhatsApp enviado',             'Difunde tu promoción por WhatsApp',                'reach'),
  ('koronel', 'FEATURED_HOME_7D',    5, 'Destacado en inicio — 7 días', 'Aparece en el banner principal por 7 días',        'featured'),
  ('koronel', 'FEATURED_HOME_30D',  15, 'Destacado en inicio — 30 días','Aparece en el banner principal por 30 días',       'featured'),
  ('koronel', 'FEATURED_MAP',        3, 'Destacado en mapa',            'Aparece con pin destacado en el mapa interactivo', 'featured'),
  ('koronel', 'CLASSIFIED_FEATURED', 3, 'Clasificado destacado',        'Destaca tu aviso en la sección de clasificados',   'featured'),
  ('koronel', 'EVENT_FEATURED',      4, 'Evento destacado',             'Destaca tu evento en la portada',                  'featured'),
  ('koronel', 'ANALYTICS_EXPORT',    1, 'Reporte exportado',            'Exporta tus estadísticas en formato descargable',  'analytics'),
  ('ia',      'AI_TEXT_GENERATE',    1, 'Texto generado con IA',        'Genera texto para tu promoción con inteligencia artificial', 'ai'),
  ('ia',      'AI_IMAGE_GENERATE',   2, 'Imagen generada con IA',       'Genera una imagen para tu promoción con IA',       'ai'),
  ('ia',      'AI_ADVISOR_SESSION',  5, 'Sesión con asesor IA',         'Consulta personalizada con el asesor de negocios IA', 'ai'),
  ('walinka', 'WALINKA_SEND',        3, 'Envío por Walinka',            'Envía mensajes a clientes a través de Walinka',    'reach')
) AS r(product_key, action_key, credits_cost, display_label, description, category)
  ON p.key = r.product_key
ON CONFLICT (action_key) DO NOTHING;


-- ─── 4. credit_packages ───────────────────────────────────────────────────────
-- Paquetes de compra. Se venden como soluciones, no como cantidades.

CREATE TABLE IF NOT EXISTS public.credit_packages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  tagline        text,
  credits        integer     NOT NULL CHECK (credits > 0),
  bonus_credits  integer     NOT NULL DEFAULT 0 CHECK (bonus_credits >= 0),
  price_clp      integer     NOT NULL CHECK (price_clp > 0),
  is_active      boolean     NOT NULL DEFAULT true,
  is_featured    boolean     NOT NULL DEFAULT false,
  sort_order     integer     NOT NULL DEFAULT 0,
  valid_until    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.credit_packages (name, tagline, credits, bonus_credits, price_clp, is_featured, sort_order) VALUES
  ('Pack Inicio',
   'Para dar el primer paso. Impulsá una promoción y empezá a aparecer.',
   50, 0, 4990, false, 1),
  ('Pack Impulso',
   'Para cuando querés resultados rápidos. Correos, WhatsApp y destacados.',
   100, 10, 9990, true, 2),
  ('Pack Crecimiento',
   'Para crecer en serio. Un mes completo de visibilidad máxima.',
   230, 20, 19990, false, 3),
  ('Pack Expansión',
   'Para negocios que ya crecen y quieren dominar su categoría.',
   550, 50, 44990, false, 4)
ON CONFLICT DO NOTHING;


-- ─── 5. credit_consumptions ───────────────────────────────────────────────────
-- Ciclo de vida de cada intento de consumo: reserved → consumed | released.
-- Garantiza que nunca se pierden créditos por errores.

CREATE TABLE IF NOT EXISTS public.credit_consumptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       uuid        NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  rule_id         uuid        NOT NULL REFERENCES public.credit_rules(id) ON DELETE RESTRICT,

  -- Snapshot del costo en el momento de la reserva (inmutable)
  action_key      text        NOT NULL,
  credits_cost    integer     NOT NULL,
  credit_type     text        NOT NULL CHECK (credit_type IN ('purchased', 'plan', 'bonus')),

  status          text        NOT NULL DEFAULT 'reserved'
                              CHECK (status IN ('reserved', 'consumed', 'released', 'refunded')),

  -- Objeto que motivó el consumo
  reference_type  text,
  reference_id    uuid,

  -- Timestamps del ciclo de vida
  reserved_at     timestamptz NOT NULL DEFAULT now(),
  consumed_at     timestamptz,
  released_at     timestamptz,

  failure_reason  text,
  idempotency_key text        UNIQUE,
  metadata        jsonb       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_consumptions_wallet_id  ON public.credit_consumptions(wallet_id, status);
CREATE INDEX IF NOT EXISTS idx_consumptions_ref        ON public.credit_consumptions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_consumptions_idempotency ON public.credit_consumptions(idempotency_key);


-- ─── 6. plan_credit_benefits ──────────────────────────────────────────────────
-- Define cuántos créditos entrega cada plan por período.

CREATE TABLE IF NOT EXISTS public.plan_credit_benefits (
  plan_tier   text    PRIMARY KEY CHECK (plan_tier IN ('free', 'starter', 'pro', 'business')),
  credits     integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  rollover    boolean NOT NULL DEFAULT false,
  reset_day   integer NOT NULL DEFAULT 1 CHECK (reset_day BETWEEN 1 AND 28)
);

INSERT INTO public.plan_credit_benefits (plan_tier, credits, rollover) VALUES
  ('free',     0,   false),
  ('starter',  20,  false),
  ('pro',      150, false),
  ('business', 600, true)
ON CONFLICT (plan_tier) DO NOTHING;


-- ─── 7. Habilitar RLS ─────────────────────────────────────────────────────────

ALTER TABLE public.wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_consumptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_credit_benefits ENABLE ROW LEVEL SECURITY;


-- ─── 8. Policies — wallets ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members_read_own_wallet" ON public.wallets;
CREATE POLICY "members_read_own_wallet"
  ON public.wallets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = wallets.account_id
        AND am.user_id = auth.uid()
    )
  );

-- Escritura solo via service_role (walletService usa funciones SQL con SECURITY DEFINER)
-- No se expone UPDATE/INSERT/DELETE directo a usuarios autenticados.


-- ─── 9. Policies — wallet_transactions ───────────────────────────────────────

DROP POLICY IF EXISTS "members_read_own_transactions" ON public.wallet_transactions;
CREATE POLICY "members_read_own_transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets w
      JOIN public.account_members am ON am.account_id = w.account_id
      WHERE w.id = wallet_transactions.wallet_id
        AND am.user_id = auth.uid()
    )
  );


-- ─── 10. Policies — credit_rules (lectura pública de reglas activas) ──────────

DROP POLICY IF EXISTS "public_read_credit_rules" ON public.credit_rules;
CREATE POLICY "public_read_credit_rules"
  ON public.credit_rules FOR SELECT TO public
  USING (is_active = true);


-- ─── 11. Policies — credit_packages (lectura pública de paquetes activos) ─────

DROP POLICY IF EXISTS "public_read_credit_packages" ON public.credit_packages;
CREATE POLICY "public_read_credit_packages"
  ON public.credit_packages FOR SELECT TO public
  USING (is_active = true);


-- ─── 12. Policies — credit_consumptions ──────────────────────────────────────

DROP POLICY IF EXISTS "members_read_own_consumptions" ON public.credit_consumptions;
CREATE POLICY "members_read_own_consumptions"
  ON public.credit_consumptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets w
      JOIN public.account_members am ON am.account_id = w.account_id
      WHERE w.id = credit_consumptions.wallet_id
        AND am.user_id = auth.uid()
    )
  );


-- ─── 13. Policies — plan_credit_benefits (lectura pública) ───────────────────

DROP POLICY IF EXISTS "public_read_plan_benefits" ON public.plan_credit_benefits;
CREATE POLICY "public_read_plan_benefits"
  ON public.plan_credit_benefits FOR SELECT TO public
  USING (true);


-- ─── 14. Funciones SQL del Motor Económico ────────────────────────────────────
-- SECURITY DEFINER: se ejecutan con privilegios del dueño (service role).
-- Los clientes nunca escriben directamente en wallets ni wallet_transactions.


-- fn_wallet_credit: acredita créditos a una wallet (compra, plan, bonus, gamificación)
CREATE OR REPLACE FUNCTION public.fn_wallet_credit(
  p_account_id     uuid,
  p_credit_type    text,     -- 'purchased' | 'plan' | 'bonus'
  p_amount         integer,
  p_display_label  text,
  p_type           text,     -- 'credit_purchase' | 'plan_benefit' | 'bonus_grant' | 'gamification'
  p_reference_type text      DEFAULT NULL,
  p_reference_id   uuid      DEFAULT NULL,
  p_expires_at     timestamptz DEFAULT NULL,
  p_idempotency_key text     DEFAULT NULL,
  p_metadata       jsonb     DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet        public.wallets;
  v_balance_before integer;
  v_balance_after  integer;
  v_tx_id          uuid;
BEGIN
  -- Validaciones básicas
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount must be positive');
  END IF;
  IF p_credit_type NOT IN ('purchased', 'plan', 'bonus') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid credit_type');
  END IF;

  -- Idempotencia: si ya existe esta key, retornar el tx existente
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_tx_id FROM public.wallet_transactions
    WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_tx_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'idempotent', true, 'transaction_id', v_tx_id);
    END IF;
  END IF;

  -- Bloquear wallet para escritura
  SELECT * INTO v_wallet FROM public.wallets
  WHERE account_id = p_account_id FOR UPDATE;

  IF v_wallet.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet not found');
  END IF;

  v_balance_before := v_wallet.balance_total;

  -- Actualizar la bolsa correcta
  UPDATE public.wallets SET
    balance_purchased  = CASE WHEN p_credit_type = 'purchased' THEN balance_purchased + p_amount ELSE balance_purchased END,
    balance_plan       = CASE WHEN p_credit_type = 'plan'      THEN balance_plan      + p_amount ELSE balance_plan      END,
    balance_bonus      = CASE WHEN p_credit_type = 'bonus'     THEN balance_bonus     + p_amount ELSE balance_bonus     END,
    lifetime_earned    = lifetime_earned + p_amount,
    plan_credits_at    = CASE WHEN p_type = 'plan_benefit' THEN now() ELSE plan_credits_at END
  WHERE id = v_wallet.id
  RETURNING balance_total INTO v_balance_after;

  -- Registrar en el libro mayor
  INSERT INTO public.wallet_transactions (
    wallet_id, credit_type, type, amount,
    balance_before, balance_after, display_label,
    reference_type, reference_id, expires_at,
    idempotency_key, metadata
  ) VALUES (
    v_wallet.id, p_credit_type, p_type, p_amount,
    v_balance_before, v_balance_after, p_display_label,
    p_reference_type, p_reference_id, p_expires_at,
    p_idempotency_key, p_metadata
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('ok', true, 'transaction_id', v_tx_id, 'balance', v_balance_after);
END;
$$;


-- fn_wallet_reserve: reserva créditos para una operación en vuelo
CREATE OR REPLACE FUNCTION public.fn_wallet_reserve(
  p_account_id      uuid,
  p_action_key      text,
  p_reference_type  text      DEFAULT NULL,
  p_reference_id    uuid      DEFAULT NULL,
  p_idempotency_key text      DEFAULT NULL,
  p_metadata        jsonb     DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet         public.wallets;
  v_rule           public.credit_rules;
  v_consumption_id uuid;
  v_credit_type    text;
  v_avail_plan     integer;
  v_avail_bonus    integer;
  v_avail_purch    integer;
  v_balance_before integer;
  v_tx_id          uuid;
BEGIN
  -- Idempotencia
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_consumption_id FROM public.credit_consumptions
    WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_consumption_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'idempotent', true, 'consumption_id', v_consumption_id);
    END IF;
  END IF;

  -- Obtener la regla
  SELECT * INTO v_rule FROM public.credit_rules
  WHERE action_key = p_action_key AND is_active = true LIMIT 1;

  IF v_rule.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rule not found or inactive');
  END IF;

  -- Bloquear wallet
  SELECT * INTO v_wallet FROM public.wallets
  WHERE account_id = p_account_id FOR UPDATE;

  IF v_wallet.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet not found');
  END IF;

  -- Disponible por bolsa (balance - reserved)
  v_avail_plan  := v_wallet.balance_plan      - v_wallet.reserved_plan;
  v_avail_bonus := v_wallet.balance_bonus     - v_wallet.reserved_bonus;
  v_avail_purch := v_wallet.balance_purchased - v_wallet.reserved_purchased;

  -- Orden de consumo: plan → bonus → purchased
  IF v_avail_plan >= v_rule.credits_cost THEN
    v_credit_type := 'plan';
  ELSIF v_avail_bonus >= v_rule.credits_cost THEN
    v_credit_type := 'bonus';
  ELSIF v_avail_purch >= v_rule.credits_cost THEN
    v_credit_type := 'purchased';
  ELSE
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_balance',
      'available', v_avail_plan + v_avail_bonus + v_avail_purch,
      'required', v_rule.credits_cost
    );
  END IF;

  v_balance_before := v_wallet.balance_total;

  -- Reservar en la bolsa elegida
  UPDATE public.wallets SET
    reserved_plan       = CASE WHEN v_credit_type = 'plan'      THEN reserved_plan      + v_rule.credits_cost ELSE reserved_plan      END,
    reserved_bonus      = CASE WHEN v_credit_type = 'bonus'     THEN reserved_bonus     + v_rule.credits_cost ELSE reserved_bonus     END,
    reserved_purchased  = CASE WHEN v_credit_type = 'purchased' THEN reserved_purchased + v_rule.credits_cost ELSE reserved_purchased END
  WHERE id = v_wallet.id;

  -- Crear registro de consumo
  INSERT INTO public.credit_consumptions (
    wallet_id, rule_id, action_key, credits_cost, credit_type,
    status, reference_type, reference_id, idempotency_key, metadata
  ) VALUES (
    v_wallet.id, v_rule.id, p_action_key, v_rule.credits_cost, v_credit_type,
    'reserved', p_reference_type, p_reference_id, p_idempotency_key, p_metadata
  ) RETURNING id INTO v_consumption_id;

  -- Registrar en libro mayor (la reserva no cambia balance_total, amount = 0 semántico)
  INSERT INTO public.wallet_transactions (
    wallet_id, credit_type, type, amount,
    balance_before, balance_after, display_label,
    consumption_id, reference_type, reference_id, metadata
  ) VALUES (
    v_wallet.id, v_credit_type, 'reserve', 0,
    v_balance_before, v_balance_before,
    'Reserva: ' || v_rule.display_label,
    v_consumption_id, p_reference_type, p_reference_id, p_metadata
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'ok', true,
    'consumption_id', v_consumption_id,
    'credits_cost', v_rule.credits_cost,
    'credit_type', v_credit_type
  );
END;
$$;


-- fn_wallet_confirm: confirma un consumo reservado (descuenta del balance real)
CREATE OR REPLACE FUNCTION public.fn_wallet_confirm(
  p_consumption_id uuid,
  p_display_label  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumption public.credit_consumptions;
  v_wallet      public.wallets;
  v_label       text;
  v_balance_before integer;
  v_balance_after  integer;
  v_tx_id          uuid;
BEGIN
  SELECT * INTO v_consumption FROM public.credit_consumptions
  WHERE id = p_consumption_id FOR UPDATE;

  IF v_consumption.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'consumption not found');
  END IF;
  IF v_consumption.status != 'reserved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'consumption not in reserved state', 'status', v_consumption.status);
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE id = v_consumption.wallet_id FOR UPDATE;

  v_balance_before := v_wallet.balance_total;
  v_label := COALESCE(p_display_label, (SELECT display_label FROM public.credit_rules WHERE id = v_consumption.rule_id));

  -- Descontar del balance y liberar la reserva simultáneamente
  UPDATE public.wallets SET
    balance_plan       = CASE WHEN v_consumption.credit_type = 'plan'      THEN balance_plan      - v_consumption.credits_cost ELSE balance_plan      END,
    balance_bonus      = CASE WHEN v_consumption.credit_type = 'bonus'     THEN balance_bonus     - v_consumption.credits_cost ELSE balance_bonus     END,
    balance_purchased  = CASE WHEN v_consumption.credit_type = 'purchased' THEN balance_purchased - v_consumption.credits_cost ELSE balance_purchased END,
    reserved_plan      = CASE WHEN v_consumption.credit_type = 'plan'      THEN reserved_plan      - v_consumption.credits_cost ELSE reserved_plan      END,
    reserved_bonus     = CASE WHEN v_consumption.credit_type = 'bonus'     THEN reserved_bonus     - v_consumption.credits_cost ELSE reserved_bonus     END,
    reserved_purchased = CASE WHEN v_consumption.credit_type = 'purchased' THEN reserved_purchased - v_consumption.credits_cost ELSE reserved_purchased END,
    lifetime_spent     = lifetime_spent + v_consumption.credits_cost
  WHERE id = v_wallet.id
  RETURNING balance_total INTO v_balance_after;

  -- Marcar consumo como completado
  UPDATE public.credit_consumptions SET
    status = 'consumed', consumed_at = now()
  WHERE id = p_consumption_id;

  -- Registrar en libro mayor
  INSERT INTO public.wallet_transactions (
    wallet_id, credit_type, type, amount,
    balance_before, balance_after, display_label,
    consumption_id, reference_type, reference_id
  ) VALUES (
    v_wallet.id, v_consumption.credit_type, 'consume', -v_consumption.credits_cost,
    v_balance_before, v_balance_after, v_label,
    p_consumption_id, v_consumption.reference_type, v_consumption.reference_id
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('ok', true, 'transaction_id', v_tx_id, 'balance', v_balance_after);
END;
$$;


-- fn_wallet_release: libera una reserva (operación cancelada o fallida)
CREATE OR REPLACE FUNCTION public.fn_wallet_release(
  p_consumption_id uuid,
  p_failure_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumption public.credit_consumptions;
  v_wallet      public.wallets;
  v_tx_id       uuid;
BEGIN
  SELECT * INTO v_consumption FROM public.credit_consumptions
  WHERE id = p_consumption_id FOR UPDATE;

  IF v_consumption.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'consumption not found');
  END IF;
  IF v_consumption.status != 'reserved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'consumption not in reserved state', 'status', v_consumption.status);
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE id = v_consumption.wallet_id FOR UPDATE;

  -- Liberar reserva (balance no cambia, solo reserved baja)
  UPDATE public.wallets SET
    reserved_plan      = CASE WHEN v_consumption.credit_type = 'plan'      THEN reserved_plan      - v_consumption.credits_cost ELSE reserved_plan      END,
    reserved_bonus     = CASE WHEN v_consumption.credit_type = 'bonus'     THEN reserved_bonus     - v_consumption.credits_cost ELSE reserved_bonus     END,
    reserved_purchased = CASE WHEN v_consumption.credit_type = 'purchased' THEN reserved_purchased - v_consumption.credits_cost ELSE reserved_purchased END
  WHERE id = v_wallet.id;

  -- Marcar consumo como liberado
  UPDATE public.credit_consumptions SET
    status = 'released', released_at = now(), failure_reason = p_failure_reason
  WHERE id = p_consumption_id;

  -- Registrar en libro mayor
  INSERT INTO public.wallet_transactions (
    wallet_id, credit_type, type, amount,
    balance_before, balance_after, display_label,
    consumption_id, reference_type, reference_id
  ) VALUES (
    v_wallet.id, v_consumption.credit_type, 'release', 0,
    v_wallet.balance_total, v_wallet.balance_total,
    'Liberación: ' || COALESCE(p_failure_reason, 'operación cancelada'),
    p_consumption_id, v_consumption.reference_type, v_consumption.reference_id
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('ok', true, 'transaction_id', v_tx_id);
END;
$$;


-- ─── 15. Migración de datos: wallets para accounts existentes ─────────────────
-- Crea una wallet vacía para cada account que todavía no tiene una.

INSERT INTO public.wallets (account_id)
SELECT id FROM public.accounts
WHERE id NOT IN (SELECT account_id FROM public.wallets)
ON CONFLICT (account_id) DO NOTHING;
