import { describe, it, expect, vi } from 'vitest';

// AdminQuickBusinessEntry.jsx importa AuthContext -> lib/supabase, y
// servicios que también dependen de supabase, exigiendo env vars al
// cargar el módulo. No se necesita ninguno para probar isAdminUser()
// como función pura.
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({}) }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

import { isAdminUser } from './AdminQuickBusinessEntry';

/**
 * Regresión: isAdminUser() confiaba antes en user_metadata.role (editable
 * por el propio usuario vía supabase.auth.updateUser) y en userProfile.role
 * (editable vía UPDATE user_profiles), permitiendo auto-promoción a admin.
 * Solo app_metadata.role debe considerarse válido.
 */
describe('isAdminUser (AdminQuickBusinessEntry)', () => {
  it('no acepta user_metadata.role = "admin"', () => {
    const user = { id: 'u1', user_metadata: { role: 'admin' }, app_metadata: {} };
    expect(isAdminUser(user)).toBe(false);
  });

  it('no acepta userProfile.role = "admin" (la función ya no toma userProfile como argumento)', () => {
    const user = { id: 'u1', user_metadata: {}, app_metadata: {} };
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
