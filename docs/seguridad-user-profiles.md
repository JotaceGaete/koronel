# Datos privados de `user_profiles` (nov 2026)

## Problema
La política `public_read_user_profiles` (`FOR SELECT TO public USING (true)`) junto con el
`GRANT ALL` por defecto a `anon` y `authenticated` permite a **cualquier visitante sin sesión**
leer `email`, `phone`, `location`, `role` y `email_notifications` de todos los usuarios con la
anon key (`GET /rest/v1/user_profiles?select=email,phone`). Cualquier usuario autenticado
también puede leerlos.

RLS filtra filas, no columnas, así que no basta con cambiar la política: las reseñas, la
comunidad, los mensajes y los avisos necesitan leer `full_name`/`avatar_url` de otros usuarios.

## Solución
Permisos por columna + dos RPC `SECURITY DEFINER`:

| Quién | Puede leer de `user_profiles` |
|---|---|
| `anon`, `authenticated` (tabla) | `id, full_name, avatar_url, created_at, updated_at` de todas las filas |
| Usuario autenticado | Su fila completa vía `get_my_profile()` |
| Admin (`is_admin()`, app_metadata) | `email, phone` de otros vía `admin_get_user_contacts(uuid[])` (máx. 1000) |
| `service_role`, funciones `SECURITY DEFINER` | Todo, sin cambios |

Las columnas que se agreguen en el futuro quedan **privadas por defecto**.

Frontend:
- `AuthContext`: el perfil propio se carga con `get_my_profile` (respaldo a `select('*')` si la
  RPC no existe todavía). `updateProfile` ya no usa `.select()` (RETURNING * pediría email).
- Panel admin (negocios, reclamos, avisos, eventos, comunidad, sugerencias): el embed pide
  `(id, full_name)` y `attachUserContacts` agrega `email/phone` con una sola RPC.
- Las consultas públicas ya pedían solo `id, full_name, avatar_url, updated_at`: sin cambios.

## Archivos
- `supabase/migrations/20261125000000_user_profiles_private_rpcs.sql` (paso 1, aditivo)
- `supabase/migrations/20261125000100_user_profiles_column_privacy.sql` (paso 2, corrige la filtración)
- `supabase/rollback/*_down.sql`
- `supabase/tests/user_profiles_privacy_precheck.sql` (solo lectura, para producción)
- `supabase/tests/user_profiles_privacy_baseline.sql` + `user_profiles_privacy_test.sh` (local)

## Orden de despliegue
1. Correr `user_profiles_privacy_precheck.sql` en producción (solo catálogo) y revisar.
2. Aplicar el paso 1 (no cambia nada visible).
3. Desplegar el frontend de esta rama.
4. Aplicar el paso 2.
5. Verificar con la anon key: `GET /rest/v1/user_profiles?select=email` → 401/42501;
   `select=id,full_name` → 200. Probar ficha de negocio con reseñas, comunidad, avisos,
   mensajes, "Mi cuenta" (guardar perfil) y panel admin.
6. Si algo se rompe: `rollback/20261125000100_..._down.sql` (vuelve al estado anterior).

## Riesgos pendientes
- **Walinka**: su código de producción no está en los repos. Si lee `user_profiles` con
  `select=*`, `email`, `phone` o `role` usando la anon key o el token del usuario, fallará tras
  el paso 2. El bloque 3 del precheck detecta funciones SQL que lo hagan, pero no código de cliente.
- Vistas sin `security_invoker` que lean `user_profiles` seguirían exponiendo datos (precheck bloque 2).
- `get_rescue_businesses()` (anon) sigue filtrando emails de dueños Walinka: no lo cubre este cambio.
- Si PR #2 (businesses) se aplica junto con esto, su prueba `admin cambia rol` (usa `RETURNING role`)
  pasa a dar `permission denied`: es el comportamiento esperado, hay que ajustar su regex.
- `email` de `user_profiles` sigue siendo editable por el propio usuario (no es el email de Auth).
