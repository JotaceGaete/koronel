-- Réplica mínima (solo para pruebas locales) del estado de producción de coronel-portal
-- al 2026-11-23: columnas, políticas y funciones relevantes de businesses, user_profiles,
-- business_claims y business_reviews. NO ejecutar en Supabase.
-- Réplica mínima del estado de producción (2026-11-23) de coronel-portal
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END $$;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE TABLE auth.users (id uuid primary key, email text, raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ select current_setting('request.jwt.claims', true)::jsonb->>'role' $$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.user_profiles (id uuid primary key references auth.users(id) on delete cascade, email text unique, full_name text, phone text, location text, avatar_url text, created_at timestamptz default now(), updated_at timestamptz default now(), role text default 'user', email_notifications boolean);
CREATE TABLE public.businesses (
 id uuid primary key default gen_random_uuid(), owner_id uuid references public.user_profiles(id) on delete set null, name text not null, category text not null, category_key text, description text, address text, phone text, email text, website text, rating numeric default 0, review_count integer default 0, is_open boolean default true, featured boolean default false, verified boolean default false, latitude numeric, longitude numeric, opening_hours jsonb, profile_visits integer default 0, contacts_count integer default 0, created_at timestamptz default CURRENT_TIMESTAMP, updated_at timestamptz default CURRENT_TIMESTAMP, lat double precision, lng double precision, status text default 'pending', premium_until timestamptz, whatsapp text, redes_sociales text, rejection_reason text, category_id uuid, logo_url text, social_links jsonb default '[]', address_text text, claimed boolean default false, admin_notes text, google_place_id text, tags text[] default '{}', walinka_catalog_url text, walinka_business_slug text, walinka_enabled boolean not null default false, account_id uuid, city_id uuid);
CREATE TYPE public.claim_status AS ENUM ('pending','approved','rejected');
CREATE TABLE public.business_claims (id uuid primary key default gen_random_uuid(), business_id uuid references public.businesses(id) on delete cascade, user_id uuid, claimant_name text, claim_status public.claim_status default 'pending', reviewed_by uuid, reviewed_at timestamptz, admin_notes text, updated_at timestamptz);
CREATE TABLE public.business_reviews (id uuid primary key default gen_random_uuid(), business_id uuid references public.businesses(id) on delete cascade, user_id uuid, rating int, comment text, owner_reply text, created_at timestamptz default now(), updated_at timestamptz);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$ SELECT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth.uid() AND au.raw_app_meta_data->>'role' = 'admin') $$;
CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$ SELECT public.is_admin() $$;
CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER set_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE FUNCTION public.approve_business_claim(p_claim_id uuid, p_admin_notes text DEFAULT NULL) RETURNS public.business_claims LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_claim public.business_claims;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo un administrador puede aprobar solicitudes de reclamo'; END IF;
  SELECT * INTO v_claim FROM public.business_claims WHERE id = p_claim_id FOR UPDATE;
  IF v_claim.claim_status <> 'pending' THEN RAISE EXCEPTION 'Esta solicitud ya fue revisada'; END IF;
  UPDATE public.businesses SET owner_id = v_claim.user_id, claimed = true, verified = true WHERE id = v_claim.business_id;
  UPDATE public.business_claims SET claim_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = COALESCE(p_admin_notes, admin_notes) WHERE id = p_claim_id RETURNING * INTO v_claim;
  RETURN v_claim;
END; $$;
CREATE FUNCTION public.check_premium_expiry() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN UPDATE public.businesses SET status = 'published' WHERE status = 'premium' AND premium_until IS NOT NULL AND premium_until < now(); END; $$;
CREATE FUNCTION public.update_business_rating() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v uuid; a numeric; c int;
BEGIN
  v := CASE WHEN TG_OP='DELETE' THEN OLD.business_id ELSE NEW.business_id END;
  SELECT round(avg(rating)::numeric,1), count(*) INTO a, c FROM public.business_reviews WHERE business_id = v;
  UPDATE public.businesses SET rating = coalesce(a,0), review_count = coalesce(c,0), updated_at = now() WHERE id = v;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_update_business_rating_insert AFTER INSERT ON public.business_reviews FOR EACH ROW EXECUTE FUNCTION public.update_business_rating();
CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.user_profiles (id, email, full_name) VALUES (NEW.id, NEW.email, split_part(NEW.email,'@',1)) ON CONFLICT (id) DO NOTHING; RETURN NEW; END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published businesses" ON public.businesses FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY admin_all_businesses ON public.businesses FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());
CREATE POLICY admin_manage_businesses ON public.businesses FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY authenticated_insert_businesses ON public.businesses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY owner_insert_businesses ON public.businesses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY owner_read_own_businesses ON public.businesses FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY owner_update_businesses ON public.businesses FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY owners_delete_businesses ON public.businesses FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY owners_update_businesses ON public.businesses FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY public_read_businesses ON public.businesses FOR SELECT TO public USING (true);
CREATE POLICY public_read_published_businesses ON public.businesses FOR SELECT TO public USING (status = ANY (ARRAY['published','premium']));

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_user_profiles ON public.user_profiles FOR SELECT TO public USING (true);
CREATE POLICY users_insert_own_user_profiles ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY users_update_own_user_profiles ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read_business_claims ON public.business_claims FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY authenticated_insert_claims ON public.business_claims FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY owners_read_own_claims ON public.business_claims FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_business_reviews ON public.business_reviews FOR SELECT USING (true);
CREATE POLICY users_insert_own_business_reviews ON public.business_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Datos
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data) VALUES
 ('00000000-0000-0000-0000-00000000000a','admin@x','{"role":"admin"}','{}'),
 ('00000000-0000-0000-0000-00000000000b','owner@x','{}','{}'),
 ('00000000-0000-0000-0000-00000000000c','other@x','{}','{"role":"admin"}'),
 ('00000000-0000-0000-0000-00000000000d','claimer@x','{}','{}');
UPDATE public.user_profiles SET role='admin' WHERE id='00000000-0000-0000-0000-00000000000a';
INSERT INTO public.businesses (id, owner_id, name, category, status, claimed, admin_notes) VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','Pub owner','x','published',true,'nota interna'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000b','Pend owner','x','pending',true,null),
 ('10000000-0000-0000-0000-000000000003',null,'Rej','x','rejected',false,null),
 ('10000000-0000-0000-0000-000000000004',null,'Unclaimed pub','x','published',false,null),
 ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-00000000000b','Rej owner','x','rejected',true,null),
 ('10000000-0000-0000-0000-000000000006',null,'Premium expired','x','premium',false,null);
UPDATE public.businesses SET premium_until = now() - interval '1 day' WHERE id='10000000-0000-0000-0000-000000000006';
INSERT INTO public.business_claims (id, business_id, user_id, claimant_name) VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-00000000000d','c');
CREATE POLICY users_delete_own_user_profiles ON public.user_profiles FOR DELETE TO authenticated USING (id = auth.uid());
