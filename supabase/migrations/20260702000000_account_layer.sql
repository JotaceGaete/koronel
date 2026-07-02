-- ═══════════════════════════════════════════════════════════════════════════════
-- Capa Account — Unidad raíz del ecosistema
-- Orden: tablas → RLS enable → policies → relaciones → migración de datos
-- Re-ejecutable: usa IF NOT EXISTS y DROP POLICY IF EXISTS
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 0. Función updated_at (defensiva) ───────────────────────────────────────
-- Se crea solo si no existe ninguna variante en el proyecto.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ─── 1. products ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  description text,
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.products (key, name, description, sort_order) VALUES
  ('koronel',     'Koronel',     'Directorio y motor de crecimiento para negocios locales',       1),
  ('walinka',     'Walinka',     'Canal de mensajería y comunicación con clientes',                2),
  ('ia',          'IA',          'Generación de contenido y asesoría con inteligencia artificial', 3),
  ('eventos',     'Eventos',     'Publicación y difusión de eventos en la comunidad',              4),
  ('marketplace', 'Marketplace', 'Compraventa de productos y servicios',                           5)
ON CONFLICT (key) DO NOTHING;


-- ─── 2. accounts ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.accounts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  type        text        NOT NULL DEFAULT 'personal'
                          CHECK (type IN ('personal', 'company', 'agency')),
  plan_tier   text        NOT NULL DEFAULT 'free'
                          CHECK (plan_tier IN ('free', 'starter', 'pro', 'business')),
  plan_since  timestamptz,
  plan_until  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_plan_tier ON public.accounts(plan_tier);

DROP TRIGGER IF EXISTS set_accounts_updated_at ON public.accounts;
CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 3. account_members ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.account_members (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid        NOT NULL REFERENCES public.accounts(id)  ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('owner', 'admin', 'member')),
  invited_by  uuid        REFERENCES auth.users(id)                 ON DELETE SET NULL,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_account_members_user_id    ON public.account_members(user_id);
CREATE INDEX IF NOT EXISTS idx_account_members_account_id ON public.account_members(account_id);


-- ─── 4. businesses.account_id ─────────────────────────────────────────────────
-- owner_id se mantiene intacto. RLS existentes no se tocan.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS account_id uuid
  REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_account_id ON public.businesses(account_id);


-- ─── 5. Habilitar RLS ─────────────────────────────────────────────────────────

ALTER TABLE public.products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;


-- ─── 6. Policies — products ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products"
  ON public.products FOR SELECT TO public
  USING (is_active = true);


-- ─── 7. Policies — accounts ───────────────────────────────────────────────────
-- Las subqueries a account_members son seguras aquí porque la tabla ya existe.

DROP POLICY IF EXISTS "members_read_own_account" ON public.accounts;
CREATE POLICY "members_read_own_account"
  ON public.accounts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = accounts.id
        AND am.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_update_account" ON public.accounts;
CREATE POLICY "owner_update_account"
  ON public.accounts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = accounts.id
        AND am.user_id = auth.uid()
        AND am.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = accounts.id
        AND am.user_id = auth.uid()
        AND am.role = 'owner'
    )
  );


-- ─── 8. Policies — account_members ───────────────────────────────────────────

DROP POLICY IF EXISTS "members_read_account_members" ON public.account_members;
CREATE POLICY "members_read_account_members"
  ON public.account_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = account_members.account_id
        AND am.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admins_insert_account_members" ON public.account_members;
CREATE POLICY "admins_insert_account_members"
  ON public.account_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = account_members.account_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "admins_update_account_members" ON public.account_members;
CREATE POLICY "admins_update_account_members"
  ON public.account_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = account_members.account_id
        AND am.user_id = auth.uid()
        AND am.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "owners_delete_account_members" ON public.account_members;
CREATE POLICY "owners_delete_account_members"
  ON public.account_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = account_members.account_id
        AND am.user_id = auth.uid()
        AND am.role = 'owner'
    )
  );


-- ─── 9. Migración de datos ────────────────────────────────────────────────────
-- Por cada usuario existente: crea account → registra como owner → vincula negocios.
-- Idempotente: no duplica si ya existe el account para ese usuario.

DO $$
DECLARE
  rec         RECORD;
  acct_id     uuid;
  uname       text;
BEGIN
  FOR rec IN
    SELECT u.id AS user_id,
           COALESCE(p.full_name, u.email, 'Usuario') AS display_name
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.id = u.id
  LOOP
    uname := rec.display_name;

    -- Buscar si ya existe un account donde este usuario es owner
    SELECT am.account_id INTO acct_id
    FROM public.account_members am
    WHERE am.user_id = rec.user_id
      AND am.role = 'owner'
    LIMIT 1;

    -- Si no existe, crear account y registrar como owner
    IF acct_id IS NULL THEN
      INSERT INTO public.accounts (name, type, plan_tier)
      VALUES (uname, 'personal', 'free')
      RETURNING id INTO acct_id;

      INSERT INTO public.account_members (account_id, user_id, role)
      VALUES (acct_id, rec.user_id, 'owner');
    END IF;

    -- Vincular negocios de este usuario al account (solo los que aún no tienen)
    UPDATE public.businesses
    SET account_id = acct_id
    WHERE owner_id = rec.user_id
      AND account_id IS NULL;

  END LOOP;
END;
$$;
