import { describe, it, expect, vi } from 'vitest';

// Header.jsx importa AuthContext -> lib/supabase, que exige env vars de
// Supabase al cargar el módulo. No se necesita ninguno de los dos para
// probar isAdminUser() como función pura. vi.mock se hoistea antes que
// los imports estáticos de abajo, así que el orden aquí es seguro.
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({}) }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

import { isAdminUser } from './Header';

/**
 * Regresión: isAdminUser() confiaba antes en user_metadata.role, que
 * cualquier usuario autenticado puede escribir sobre sí mismo con
 * supabase.auth.updateUser({ data: { role: 'admin' } }), permitiendo
 * auto-promoción a admin. Solo app_metadata (no editable por el cliente)
 * debe considerarse válido.
 */
describe('isAdminUser (Header)', () => {
  it('no acepta user_metadata.role = "admin"', () => {
    const user = { id: 'u1', user_metadata: { role: 'admin' }, app_metadata: {} };
    expect(isAdminUser(user)).toBe(false);
  });

  it('no acepta userProfile.role = "admin" (la función ya no toma userProfile como argumento)', () => {
    const user = { id: 'u1', user_metadata: {}, app_metadata: {} };
    // Pasar un segundo argumento no debe tener ningún efecto.
    expect(isAdminUser(user, { role: 'admin' })).toBe(false);
  });

  it('acepta únicamente app_metadata.role = "admin"', () => {
    const user = { id: 'u1', user_metadata: {}, app_metadata: { role: 'admin' } };
    expect(isAdminUser(user)).toBe(true);
  });

  it('devuelve false para un usuario normal sin rol', () => {
    const user = { id: 'u1', user_metadata: {}, app_metadata: {} };
    expect(isAdminUser(user)).toBe(false);
  });

  it('maneja null o usuario ausente sin lanzar', () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });
});
