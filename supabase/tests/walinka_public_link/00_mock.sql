-- NO EJECUTAR CONTRA SUPABASE. Solo para un Postgres local desechable (ver run.sh).
-- Esquema mínimo que replica las definiciones de producción relevantes (coronel-portal, 2026-11-23)
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon, authenticated;
CREATE TABLE auth.users (id uuid PRIMARY KEY, raw_app_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
-- Supabase concede por defecto EXECUTE/ALL a anon y authenticated en public:
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

CREATE TABLE public.businesses (id uuid PRIMARY KEY, name text, owner_id uuid, status text, claimed boolean DEFAULT false);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_businesses ON public.businesses FOR SELECT TO public USING (true);

CREATE TABLE public.wa_businesses (id uuid PRIMARY KEY, user_id uuid, name text NOT NULL, slug text UNIQUE, is_active boolean DEFAULT true, email text, created_at timestamptz DEFAULT now());
ALTER TABLE public.wa_businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY wa_businesses_owner_all ON public.wa_businesses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.business_domains (business_id uuid, domain text, status text);
ALTER TABLE public.business_domains ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.business_walinka_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  koronel_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  walinka_business_id uuid NOT NULL REFERENCES public.wa_businesses(id) ON DELETE CASCADE,
  connection_status text NOT NULL CHECK (connection_status IN ('connected','revoked')),
  source text NOT NULL DEFAULT 'koronel' CHECK (source IN ('koronel','admin')),
  connected_at timestamptz, connected_by uuid, revoked_at timestamptz, revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX business_walinka_links_one_active_koronel ON public.business_walinka_links (koronel_business_id) WHERE connection_status = 'connected';
CREATE UNIQUE INDEX business_walinka_links_one_active_walinka ON public.business_walinka_links (walinka_business_id) WHERE connection_status = 'connected';
ALTER TABLE public.business_walinka_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY owners_read_own_business_walinka_links ON public.business_walinka_links FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = koronel_business_id AND b.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.wa_businesses wb WHERE wb.id = walinka_business_id AND wb.user_id = auth.uid()));

-- Copia literal de producción
CREATE OR REPLACE FUNCTION public.wa_resolve_catalog_url(p_business_id uuid)
 RETURNS TABLE(public_url text, uses_custom_domain boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    CASE
      WHEN bd.domain IS NOT NULL THEN 'https://' || bd.domain
      WHEN wb.slug IS NOT NULL AND wb.slug <> '' THEN 'https://miralatienda.de/catalogo/' || wb.slug
      ELSE NULL
    END,
    (bd.domain IS NOT NULL)
  FROM public.wa_businesses wb
  LEFT JOIN public.business_domains bd
    ON bd.business_id = wb.id AND bd.status = 'active'
  WHERE wb.id = p_business_id;
$function$;
REVOKE EXECUTE ON FUNCTION public.wa_resolve_catalog_url(uuid) FROM PUBLIC, anon;

-- Datos de prueba (ficticios)
INSERT INTO auth.users(id) VALUES ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
INSERT INTO public.businesses VALUES
 ('10000000-0000-0000-0000-000000000001','Publicado vinculado','00000000-0000-0000-0000-0000000000a1','published',true),
 ('10000000-0000-0000-0000-000000000002','Pendiente vinculado','00000000-0000-0000-0000-0000000000a1','pending',true),
 ('10000000-0000-0000-0000-000000000003','Publicado revocado','00000000-0000-0000-0000-0000000000a1','published',true),
 ('10000000-0000-0000-0000-000000000004','Publicado catálogo inactivo','00000000-0000-0000-0000-0000000000a1','published',true),
 ('10000000-0000-0000-0000-000000000005','Premium dominio propio','00000000-0000-0000-0000-0000000000a2','premium',true),
 ('10000000-0000-0000-0000-000000000006','Publicado sin vínculo','00000000-0000-0000-0000-0000000000a2','published',true),
 ('10000000-0000-0000-0000-000000000007','Publicado catálogo sin slug','00000000-0000-0000-0000-0000000000a2','published',true),
 ('10000000-0000-0000-0000-000000000008','Publicado dominio malicioso','00000000-0000-0000-0000-0000000000a2','published',true);
INSERT INTO public.wa_businesses(id,user_id,name,slug,is_active,email) VALUES
 ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Tienda Uno','tienda-uno',true,'uno@example.com'),
 ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','Tienda Dos','tienda-dos',true,'dos@example.com'),
 ('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','Tienda Tres','tienda-tres',true,'tres@example.com'),
 ('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000a1','Tienda Inactiva','tienda-inactiva',false,'cuatro@example.com'),
 ('20000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000a2','Tienda Dominio','tienda-dominio',true,'cinco@example.com'),
 ('20000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-0000000000a2','Tienda Sin Slug',NULL,true,'siete@example.com'),
 ('20000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-0000000000a2','Tienda Dominio Raro','tienda-raro',true,'ocho@example.com');
INSERT INTO public.business_domains VALUES
 ('20000000-0000-0000-0000-000000000005','tienda.example.cl','active'),
 ('20000000-0000-0000-0000-000000000005','vieja.example.cl','inactive'),
 ('20000000-0000-0000-0000-000000000008','evil.example"><script>','active');
INSERT INTO public.business_walinka_links(koronel_business_id,walinka_business_id,connection_status,connected_at) VALUES
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','connected',now()),
 ('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','connected',now()),
 ('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003','revoked',now()),
 ('10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','connected',now()),
 ('10000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000005','connected',now()),
 ('10000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000007','connected',now()),
 ('10000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000008','connected',now());
