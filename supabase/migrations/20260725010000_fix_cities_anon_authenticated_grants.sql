REVOKE ALL ON TABLE public.cities FROM anon;
REVOKE ALL ON TABLE public.cities FROM authenticated;

GRANT SELECT ON TABLE public.cities TO anon;
GRANT SELECT ON TABLE public.cities TO authenticated;
