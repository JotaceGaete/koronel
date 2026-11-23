# Seguridad de `businesses`: auditoría y correcciones

Fecha: 2026-11-23. Proyecto Supabase `coronel-portal` (compartido con Walinka).
Toda la información de producción se obtuvo con consultas de **solo lectura**. No se aplicó nada.

## 1. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Alta | `owner_update_businesses` / `owners_update_businesses` (duplicadas) dejan al dueño cambiar **cualquier columna** de su ficha: `status` (auto-publicarse o pasar a `premium`), `verified`, `featured`, `premium_until`, `claimed`, `rating`, `review_count`, contadores, `admin_notes`, `rejection_reason`, `account_id` y `walinka_*`. |
| 2 | Alta | `authenticated_insert_businesses` / `owner_insert_businesses` (duplicadas) solo exigen `owner_id = auth.uid()`: un usuario puede crear un negocio directamente `premium`, `verified` y `featured`. El formulario de publicación lo hacía con el pago **simulado** en el navegador. |
| 3 | Alta | `public_read_businesses USING (true)` para `public`: cualquier visitante lee **todos** los negocios, incluidos `pending` y `rejected`. Anula los filtros de `public_read_published_businesses` y `"Public can read published businesses"`. Hoy los 40 negocios están `published`, así que no hay exposición real todavía, pero el primer registro nuevo quedaría visible. |
| 4 | Alta | `/api/places/import` (Vercel) usa la **service role key** tras `requireAdmin()`, que aceptaba `user_metadata.role = 'admin'` (lo edita el propio usuario con `supabase.auth.updateUser`) o `user_profiles.role = 'admin'` (lo edita el propio usuario por la política `users_update_own_user_profiles`). Cualquier cuenta podía importar negocios saltándose la RLS y gastar la cuota de Google Places. |
| 5 | Media | `users_update_own_user_profiles` no restringe columnas: cualquier usuario puede ponerse `role = 'admin'` en su perfil. Las políticas RLS no lo usan (usan `is_admin()`), pero el frontend y la API sí lo usaban. |
| 6 | Media | Frontend: `Header`, panel admin, alta rápida, importación, avisos clasificados y `ChurchDetails` consideraban admin a quien tuviera `user_metadata.role` o `user_profiles.role`. Solo afecta a lo que se muestra (la RLS bloquea las escrituras), pero exponía las pantallas de admin. |
| 7 | Media | `anon` lee todas las columnas de los negocios publicados, incluidas `admin_notes`, `rejection_reason`, `account_id` y `walinka_*`. Hoy están vacías. |
| 8 | Baja | `anon` y `authenticated` tienen `TRUNCATE`, `TRIGGER` y `REFERENCES` sobre `businesses` (TRUNCATE no pasa por RLS; PostgREST no lo expone). `anon` además tiene `INSERT/UPDATE/DELETE` sin políticas que lo permitan. |
| 9 | Baja | La aprobación de reclamos del panel hacía `UPDATE business_claims` directo, pero esa tabla no tiene política UPDATE: la acción fallaba. Existen las RPC `approve_business_claim` / `reject_business_claim`, que validan `is_admin()`. |
| 10 | Info | `is_admin()` e `is_admin_user()` en producción ya usan solo `app_metadata.role` (correcto). Las migraciones antiguas del repo tienen una versión que acepta `user_metadata`; si alguien las reaplicara, reintroduciría la escalada. |

### Fuera del alcance de esta rama (pendiente)
- **`public_read_user_profiles USING (true)`**: cualquier visitante lee `email` y `phone` de los 105 usuarios. Es la filtración de datos personales más grave que vi; se arregla igual que la #7 (permisos por columna para `anon`: `id, full_name, avatar_url`) tras revisar las consultas que hacen *embed* de `user_profiles`.
- `get_rescue_businesses()` ejecutable por `anon` (ver `seguridad-walinka-koronel.md`).
- `owners_delete_businesses`: el dueño puede borrar su ficha, también una reclamada que creó un admin. Decidir si se quiere mantener.
- `has_approved_claim()` es `SECURITY DEFINER` sin `search_path` fijo.

## 2. Correcciones

### Base de datos
`supabase/migrations/20261124000000_businesses_security_hardening.sql` (se puede aplicar antes o junto con el frontend):

- Trigger `businesses_guard_privileged_columns` (BEFORE INSERT/UPDATE):
  - **Alta por comerciante**: fuerza `status = 'pending'`, `verified/featured = false`, `premium_until = NULL`, `claimed = true`, contadores a 0, `admin_notes/rejection_reason/account_id = NULL`, `walinka_*` por defecto.
  - **Edición por comerciante**: error `42501` si cambia `status` (salvo `rejected → pending`, reenviar a revisión), `verified`, `featured`, `premium_until`, `owner_id`, `claimed`, `rating`, `review_count`, `profile_visits`, `contacts_count`, `rejection_reason`, `admin_notes`, `account_id` o `walinka_*`. Enviar el mismo valor que ya tiene no es un cambio.
  - No restringe a admins (`is_admin()`), `service_role`/`postgres`, ni a funciones `SECURITY DEFINER` (`approve_business_claim`, `update_business_rating`, `check_premium_expiry`). Es `SECURITY INVOKER` y mira `current_user`, por eso distingue esos casos.
- Trigger `user_profiles_guard_role`: el usuario no puede cambiar su `role`; en el alta se fuerza `'user'`. `handle_new_user()` y los admins no se ven afectados.
- Políticas de `businesses`: de 11 a 6. Se eliminan las duplicadas y las tres de lectura pública; se crea `businesses_public_read_published` (`anon, authenticated`, `status IN ('published','premium')`). Se conservan lectura del dueño, admin (`is_admin()`), alta, edición y borrado del dueño.
- `is_admin()` / `is_admin_user()`: mismo comportamiento que producción, con `search_path = ''`. Deja el repo alineado.
- Revoca `TRUNCATE/TRIGGER/REFERENCES` a `anon` y `authenticated`, y escritura a `anon`.
- Incluye consultas de verificación y un rollback que vuelve exactamente al estado actual.

`supabase/migrations/20261124000100_businesses_anon_columns.sql` (**aplicar después de publicar el frontend**): `anon` deja de leer `admin_notes`, `rejection_reason`, `account_id` y `walinka_*`. El frontend anterior hace `select('*')` como anon y fallaría con esta migración.

### Frontend y API
- `src/utils/adminAuth.js`: `isAdminUser(user)` = `app_metadata.role === 'admin'`. Reemplaza las 6 copias locales.
- `api/places/_core.js`: `requireAdmin()` solo acepta `app_metadata.role`.
- `businessService`: el comerciante solo envía columnas editables (`OWNER_EDITABLE_COLUMNS`); las vistas públicas usan `PUBLIC_BUSINESS_COLUMNS` en vez de `*`.
- Formulario de publicación: el pago simulado ya no publica como Premium. El negocio queda `pending` y el texto dice que un admin activa Premium al confirmar el pago.
- Reclamos: aprobar/rechazar usa `approve_business_claim` / `reject_business_claim`.

## 3. Pruebas
`supabase/tests/`: réplica mínima del esquema de producción y 49 casos (registro, reclamación, edición, administración, lectura pública, roles y funciones de sistema).

- Sobre la réplica **sin** migraciones fallan 24 casos: reproducen los hallazgos 1, 2, 3, 5, 7 y 8.
- **Con** las dos migraciones pasan 49 de 49. La migración se puede aplicar dos veces y el rollback vuelve al estado inicial.

```bash
createdb koronel_test
psql -d koronel_test -f supabase/tests/businesses_security_baseline.sql
psql -d koronel_test -f supabase/migrations/20261124000000_businesses_security_hardening.sql
psql -d koronel_test -f supabase/migrations/20261124000100_businesses_anon_columns.sql
ANON_NOTES_EXPECT="permission denied" bash supabase/tests/businesses_security_test.sh koronel_test
```

## 4. Orden de despliegue propuesto
1. Revisar y fusionar esta rama → Vercel publica el frontend y la API nuevos.
2. Aplicar `20261124000000_businesses_security_hardening.sql` (con autorización).
3. Probar en producción: alta de negocio (queda `pending`), edición por el dueño, aprobación desde el panel admin y aprobación de un reclamo.
4. Esperar a que los visitantes tengan el frontend nuevo (unas horas) y aplicar `20261124000100_businesses_anon_columns.sql`.
5. Activar Premium real: hoy lo asigna un admin desde el panel. Para automatizarlo hace falta un webhook de pago con la service role.
