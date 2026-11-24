-- Réplica mínima (solo pruebas locales, NUNCA en Supabase) del estado de producción de
-- coronel-portal al 2026-11-24 (políticas y columnas confirmadas por Juan con el precheck) para user_profiles y tablas que lo embeben.
-- Tomada de supabase/tests/businesses_security_baseline.sql (PR de businesses).
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END $$;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE TABLE auth.users (id uuid primary key, email text, raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.user_profiles (id uuid primary key references auth.users(id) on delete cascade, email text unique, full_name text, phone text, location text, avatar_url text, created_at timestamptz default now(), updated_at timestamptz default now(), role text default 'user', email_notifications boolean);
CREATE TABLE public.business_reviews (id uuid primary key default gen_random_uuid(), user_id uuid references public.user_profiles(id), rating int, comment text);
CREATE TABLE public.classified_ads (id uuid primary key default gen_random_uuid(), user_id uuid references public.user_profiles(id), title text);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$ SELECT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth.uid() AND au.raw_app_meta_data->>'role' = 'admin') $$;
CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.user_profiles (id, email, full_name) VALUES (NEW.id, NEW.email, split_part(NEW.email,'@',1)) ON CONFLICT (id) DO NOTHING; RETURN NEW; END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Objetos que necesita 20261124000000 (PR #2) para aplicarse sobre esta réplica (copiados de
-- businesses_security_baseline.sql); permiten probar ambos PR juntos.
CREATE TABLE public.businesses (
 id uuid primary key default gen_random_uuid(), owner_id uuid references public.user_profiles(id) on delete set null, name text not null, category text not null, category_key text, description text, address text, phone text, email text, website text, rating numeric default 0, review_count integer default 0, is_open boolean default true, featured boolean default false, verified boolean default false, latitude numeric, longitude numeric, opening_hours jsonb, profile_visits integer default 0, contacts_count integer default 0, created_at timestamptz default CURRENT_TIMESTAMP, updated_at timestamptz default CURRENT_TIMESTAMP, lat double precision, lng double precision, status text default 'pending', premium_until timestamptz, whatsapp text, redes_sociales text, rejection_reason text, category_id uuid, logo_url text, social_links jsonb default '[]', address_text text, claimed boolean default false, admin_notes text, google_place_id text, tags text[] default '{}', walinka_catalog_url text, walinka_business_slug text, walinka_enabled boolean not null default false, account_id uuid, city_id uuid);
CREATE TYPE public.claim_status AS ENUM ('pending','approved','rejected');
CREATE TABLE public.business_claims (id uuid primary key default gen_random_uuid(), business_id uuid references public.businesses(id) on delete cascade, user_id uuid, claimant_name text, claim_status public.claim_status default 'pending', reviewed_by uuid, reviewed_at timestamptz, admin_notes text, updated_at timestamptz);
CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$ SELECT public.is_admin() $$;
CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.businesses, public.business_claims TO anon, authenticated, service_role;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_user_profiles ON public.user_profiles FOR SELECT TO public USING (true);
CREATE POLICY users_insert_own_user_profiles ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY users_update_own_user_profiles ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY admin_read_user_profiles ON public.user_profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY users_delete_own_user_profiles ON public.user_profiles FOR DELETE TO authenticated USING (id = auth.uid());
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_business_reviews ON public.business_reviews FOR SELECT USING (true);
ALTER TABLE public.classified_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_ads ON public.classified_ads FOR SELECT USING (true);

INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data) VALUES
 ('00000000-0000-0000-0000-00000000000a','admin@x','{"role":"admin"}','{}'),
 ('00000000-0000-0000-0000-00000000000b','owner@x','{}','{}'),
 ('00000000-0000-0000-0000-00000000000c','fake@x','{}','{"role":"admin"}');
UPDATE public.user_profiles SET phone='+56900000000', role='admin' WHERE id='00000000-0000-0000-0000-00000000000a';
UPDATE public.user_profiles SET phone='+56911111111', location='Coronel', avatar_url='a.png' WHERE id='00000000-0000-0000-0000-00000000000b';
UPDATE public.user_profiles SET role='admin' WHERE id='00000000-0000-0000-0000-00000000000c'; -- role falso en perfil
INSERT INTO public.business_reviews (user_id, rating, comment) VALUES ('00000000-0000-0000-0000-00000000000b', 5, 'ok');
INSERT INTO public.classified_ads (user_id, title) VALUES ('00000000-0000-0000-0000-00000000000b', 'aviso');
