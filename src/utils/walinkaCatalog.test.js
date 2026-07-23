import { describe, it, expect } from 'vitest';
import * as walinkaCatalog from './walinkaCatalog';
import { WALINKA_APP_URL, buildWalinkaRegisterUrl } from './walinkaCatalog';

describe('walinkaCatalog', () => {
  it('WALINKA_APP_URL cae al valor por defecto de producción cuando no hay env var', () => {
    expect(WALINKA_APP_URL).toBe('https://go.ventalink.app');
  });

  it('buildWalinkaRegisterUrl construye /register sobre WALINKA_APP_URL', () => {
    expect(buildWalinkaRegisterUrl()).toBe('https://go.ventalink.app/register');
  });

  it('no expone ninguna función de construcción de URL de catálogo (regresión: Koronel nunca reconstruye public_url)', () => {
    const exportedNames = Object.keys(walinkaCatalog)?.sort();
    expect(exportedNames).toEqual(['WALINKA_APP_URL', 'buildWalinkaRegisterUrl']);
  });
});
