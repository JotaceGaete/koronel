/**
 * Única fuente de verdad del rol de administrador en el frontend.
 *
 * Solo se confía en `app_metadata.role`, que únicamente puede escribir el
 * servidor (service role / dashboard de Supabase). `user_metadata` lo puede
 * cambiar el propio usuario con `supabase.auth.updateUser({ data })` y
 * `user_profiles.role` no es una fuente autorizada, así que ninguno de los dos
 * se usa para decidir permisos.
 *
 * Esto es solo para la interfaz: la autorización real la hacen la RLS
 * (`public.is_admin()`) y las funciones del servidor.
 */
export function isAdminUser(user) {
  return user?.app_metadata?.role === 'admin';
}
