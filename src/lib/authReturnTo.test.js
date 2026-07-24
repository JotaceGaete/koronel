import { describe, it, expect, beforeEach } from 'vitest';
import { isSafeReturnPath, saveReturnTo, consumeReturnTo } from './authReturnTo';

describe('isSafeReturnPath', () => {
  it('accepts a plain internal path', () => {
    expect(isSafeReturnPath('/mi-perfil')).toBe(true);
    expect(isSafeReturnPath('/publicar-aviso')).toBe(true);
    expect(isSafeReturnPath('/admin-dashboard')).toBe(true);
  });

  it('accepts an internal path with query string', () => {
    expect(isSafeReturnPath('/buscar?ciudad=coronel')).toBe(true);
  });

  it('rejects external URLs', () => {
    expect(isSafeReturnPath('https://otro-dominio.com')).toBe(false);
    expect(isSafeReturnPath('http://otro-dominio.com/login')).toBe(false);
  });

  it('rejects protocol-relative URLs', () => {
    expect(isSafeReturnPath('//otro-dominio.com')).toBe(false);
  });

  it('rejects javascript: pseudo-protocol, with or without a leading slash', () => {
    expect(isSafeReturnPath('/javascript:alert(1)')).toBe(false);
    expect(isSafeReturnPath('javascript:alert(1)')).toBe(false);
  });

  it('rejects empty, null or non-string values', () => {
    expect(isSafeReturnPath('')).toBe(false);
    expect(isSafeReturnPath(null)).toBe(false);
    expect(isSafeReturnPath(undefined)).toBe(false);
  });

  it('rejects paths that would loop back into the auth flow', () => {
    expect(isSafeReturnPath('/login')).toBe(false);
    expect(isSafeReturnPath('/signup')).toBe(false);
    expect(isSafeReturnPath('/auth/callback')).toBe(false);
  });
});

describe('saveReturnTo / consumeReturnTo', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('round-trips a valid internal path', () => {
    saveReturnTo('/mis-negocios');
    expect(consumeReturnTo('/')).toBe('/mis-negocios');
  });

  it('consuming clears the stored value (single use)', () => {
    saveReturnTo('/mis-negocios');
    consumeReturnTo('/');
    expect(consumeReturnTo('/')).toBe('/');
  });

  it('does not store an external URL', () => {
    saveReturnTo('https://evil.com');
    expect(consumeReturnTo('/')).toBe('/');
  });

  it('falls back to the given default when nothing was saved', () => {
    expect(consumeReturnTo('/dashboard')).toBe('/dashboard');
  });

  it('falls back to "/" by default', () => {
    expect(consumeReturnTo()).toBe('/');
  });
});
