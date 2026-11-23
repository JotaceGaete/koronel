import { describe, it, expect } from 'vitest';
import { isAdminUser } from './adminAuth';

describe('isAdminUser', () => {
  it('acepta solo app_metadata.role = admin', () => {
    expect(isAdminUser({ app_metadata: { role: 'admin' } })).toBe(true);
  });

  it('no confía en user_metadata.role (lo edita el propio usuario)', () => {
    expect(isAdminUser({ user_metadata: { role: 'admin' }, app_metadata: {} })).toBe(false);
  });

  it('devuelve false sin usuario', () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });
});
