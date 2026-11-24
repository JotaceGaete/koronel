-- =============================================================================
-- Koronel: columnas internas de public.businesses ocultas para visitantes (anon)
-- =============================================================================
-- PROPUESTA. No aplicar sin la autorización de Juan.
--
-- ORDEN DE DESPLIEGUE: aplicar SOLO DESPUÉS de publicar el frontend de esta
-- rama. El frontend anterior hace select('*') como anon en el directorio, la
-- ficha pública y los destacados; con esta migración esas consultas devolverían
-- "permission denied for table businesses". El frontend nuevo usa la lista
-- PUBLIC_BUSINESS_COLUMNS (src/services/businessService.js).
--
-- Qué cambia: anon deja de poder leer admin_notes, rejection_reason,
-- account_id, walinka_enabled, walinka_catalog_url y walinka_business_slug.
-- El resto de columnas sigue igual. authenticated no cambia (los paneles del
-- dueño y de admin usan select('*')).
--
-- Al añadir columnas nuevas a businesses que deban ser públicas, hay que
-- concederlas a anon explícitamente (GRANT SELECT (col) ... TO anon).
-- =============================================================================

BEGIN;

REVOKE SELECT ON public.businesses FROM anon;

GRANT SELECT (
  id, owner_id, name, category, category_key, category_id, description,
  address, address_text, phone, email, website, whatsapp, redes_sociales,
  social_links, logo_url, rating, review_count, is_open, featured, verified,
  claimed, status, premium_until, latitude, longitude, lat, lng,
  opening_hours, profile_visits, contacts_count, google_place_id, tags,
  city_id, created_at, updated_at
) ON public.businesses TO anon;

COMMIT;

-- Verificación:
-- SELECT column_name FROM information_schema.column_privileges
--   WHERE table_schema = 'public' AND table_name = 'businesses'
--     AND grantee = 'anon' AND privilege_type = 'SELECT' ORDER BY 1;
--   -> 36 columnas; no deben aparecer admin_notes, rejection_reason,
--      account_id ni walinka_*.
--
-- Rollback:
-- GRANT SELECT ON public.businesses TO anon;
