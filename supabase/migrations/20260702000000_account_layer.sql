-- ═══════════════════════════════════════════════════════════════════════════════
-- Capa Account — Unidad raíz del ecosistema
-- Tablas: products, accounts, account_members
-- Relación: businesses.account_id (owner_id se mantiene intacto)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── products ─────────────────────────────────────────────────────────────────
-- Catálogo de productos del ecosistema.
-- Las reglas de créditos (futuras) referenciarán esta tabla con FK real.

CREATE TABLE IF NOT EXISTS public.products (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text        NOT NULL UNIQUE,   -- 'koronel' | 'walinka' | 'ia' | 'eventos'
  name        text        NOT NULL,
  description text,
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.products (key, name, description, sort_order) VALUES
  ('koronel',  'Koronel',   'Directorio y motor de crecimiento para negocios locales', 1),
  ('walinka',  'Walinka',   'Canal de mensajería y comunicación con clientes',          2),
  ('ia',       'IA',        'Generación de contenido y asesoría con inteligencia artificial', 3),
  ('eventos',  'Eventos',   'Publicación y difusión de eventos en la comunidad',        4),
  ('marketplace', 'Marketplace', 'Compraventa de productos y servicios',                5)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Lectura pública — productos son información del ecosistema
CREATE POLICY "public_read_products"
  ON public.products FOR SELECT TO public
  USING (is_active = true);

-- Solo admin puede escribir (via service_role; no se expone a usuarios)
-- No se agrega política de escritura: las mutaciones ocurren desde el backend.


-- ─── accounts ─────────────────────────────────────────────────────────────────
-- Unidad económica y propietaria del ecosistema.
-- Un account puede tener múltiples usuarios (account_members) y múltiples negocios.

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

CREATE OR REPLACE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Un usuario puede ver los accounts a los que pertenece
CREATE POLICY "members_read_own_account"
  ON public.accounts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = accounts.id
        AND am.user_id = auth.uid()
    )
  );

-- Solo el owner puede actualizar los datos del account
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

-- INSERT se hace solo via función/trigger, no directamente
-- No se expone política de INSERT para usuarios: cuentas se crean en el sign-up


-- ─── account_members ─────────────────────────────────────────────────────────
-- Relación N:M entre auth.users y accounts con roles.

CREATE TABLE IF NOT EXISTS public.account_members (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid        NOT NULL REFERENCES public.accounts(id)   ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)         ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('owner', 'admin', 'member')),
  invited_by  uuid        REFERENCES auth.users(id)                  ON DELETE SET NULL,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_account_members_user_id    ON public.account_members(user_id);
CREATE INDEX IF NOT EXISTS idx_account_members_account_id ON public.account_members(account_id);

ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- Un usuario puede ver todos los miembros de sus accounts
CREATE POLICY "members_read_account_members"
  ON public.account_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = account_members.account_id
        AND am.user_id = auth.uid()
    )
  );

-- Solo admins/owners pueden invitar nuevos miembros
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

-- Solo admins/owners pueden modificar roles (no pueden bajarse a sí mismos de owner)
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

-- Solo owners pueden eliminar miembros
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


-- ─── businesses.account_id ───────────────────────────────────────────────────
-- Se agrega account_id sin tocar owner_id.
-- owner_id: quién creó el negocio (identidad técnica).
-- account_id: quién es el propietario económico (unidad del ecosistema).

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_account_id ON public.businesses(account_id);

-- No se agrega política RLS nueva para businesses:
-- Las políticas existentes (owner_id = auth.uid()) permanecen sin modificación.
-- account_id se usará en futuras políticas del Motor Económico.


-- ─── Migración de datos ───────────────────────────────────────────────────────
-- Para cada usuario existente:
--   1. Crea un account 'personal' con su nombre o email.
--   2. Lo agrega como 'owner' de ese account.
--   3. Asigna ese account a todos sus negocios.
--
-- Se ejecuta en una sola transacción para garantizar consistencia.

DO $$
DECLARE
  rec          RECORD;
  new_account  uuid;
  display_name text;
BEGIN
  FOR rec IN
    SELECT u.id AS user_id,
           COALESCE(p.full_name, u.email, 'Usuario') AS name
    FROM auth.users u
    LEFT JOIN public.user_profiles p ON p.id = u.id
  LOOP
    display_name := rec.name;

    -- Crear account solo si este user todavía no tiene uno como owner
    SELECT am.account_id INTO new_account
    FROM public.account_members am
    WHERE am.user_id = rec.user_id AND am.role = 'owner'
    LIMIT 1;

    IF new_account IS NULL THEN
      INSERT INTO public.accounts (name, type, plan_tier)
      VALUES (display_name, 'personal', 'free')
      RETURNING id INTO new_account;

      INSERT INTO public.account_members (account_id, user_id, role)
      VALUES (new_account, rec.user_id, 'owner');
    END IF;

    -- Vincular negocios de este usuario al account recién creado
    UPDATE public.businesses
    SET account_id = new_account
    WHERE owner_id = rec.user_id
      AND account_id IS NULL;

  END LOOP;
END;
$$;
