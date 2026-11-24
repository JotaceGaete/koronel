-- Réplica mínima (solo pruebas locales, NUNCA en Supabase) del estado de producción de
-- coronel-portal al 2026-11-23 para user_profiles y tablas que lo embeben.
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

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_user_profiles ON public.user_profiles FOR SELECT TO public USING (true);
CREATE POLICY users_insert_own_user_profiles ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY users_update_own_user_profiles ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
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
