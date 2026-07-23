import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rpc = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: { rpc: (...args) => rpc(...args) },
}));

import { walinkaLinkService, mapWalinkaError, WALINKA_LINK_STATUS } from './walinkaLinkService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('walinkaLinkService.getMyCatalogs', () => {
  it('llama a get_my_walinka_catalogs sin parámetros y normaliza cada fila', async () => {
    rpc.mockResolvedValue({
      data: [
        { id: 'wa-1', name: 'Mi Tienda', slug: 'mi-tienda', logo_url: 'https://cdn/l.png', is_active: true, public_url: 'https://miralatienda.de/catalogo/mi-tienda', uses_custom_domain: false },
        { id: 'wa-2', name: 'Con Dominio', slug: 'con-dominio', logo_url: null, is_active: true, public_url: 'https://midominio.cl', uses_custom_domain: true },
      ],
      error: null,
    });

    const { data, error } = await walinkaLinkService.getMyCatalogs();

    expect(rpc).toHaveBeenCalledWith('get_my_walinka_catalogs');
    expect(error).toBeNull();
    expect(data).toEqual([
      { id: 'wa-1', name: 'Mi Tienda', slug: 'mi-tienda', logoUrl: 'https://cdn/l.png', isActive: true, publicUrl: 'https://miralatienda.de/catalogo/mi-tienda', usesCustomDomain: false },
      { id: 'wa-2', name: 'Con Dominio', slug: 'con-dominio', logoUrl: null, isActive: true, publicUrl: 'https://midominio.cl', usesCustomDomain: true },
    ]);
  });

  it('devuelve lista vacía (no error) cuando el usuario no tiene catálogos', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const { data, error } = await walinkaLinkService.getMyCatalogs();
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it('mapea el error a WALINKA_AUTH_REQUIRED cuando no hay sesión', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'WALINKA_AUTH_REQUIRED' } });
    const { data, error } = await walinkaLinkService.getMyCatalogs();
    expect(data).toEqual([]);
    expect(error).toEqual({ code: 'WALINKA_AUTH_REQUIRED', message: 'Debes iniciar sesión para continuar.' });
  });
});

describe('walinkaLinkService.getLinkStatus', () => {
  it('no llama a la RPC si no hay koronelBusinessId', async () => {
    const { data, error } = await walinkaLinkService.getLinkStatus(null);
    expect(rpc).not.toHaveBeenCalled();
    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('llama a get_business_walinka_link_status con el id correcto y normaliza el vínculo conectado', async () => {
    rpc.mockResolvedValue({
      data: [{
        koronel_business_id: 'biz-1',
        walinka_business_id: 'wa-1',
        connection_status: 'connected',
        source: 'koronel',
        connected_at: '2026-07-23T00:00:00Z',
        connected_by: 'user-1',
        walinka_name: 'Mi Tienda',
        walinka_logo_url: 'https://cdn/l.png',
        walinka_is_active: true,
        walinka_public_url: 'https://miralatienda.de/catalogo/mi-tienda',
        walinka_uses_custom_domain: false,
      }],
      error: null,
    });

    const { data, error } = await walinkaLinkService.getLinkStatus('biz-1');

    expect(rpc).toHaveBeenCalledWith('get_business_walinka_link_status', { p_koronel_business_id: 'biz-1' });
    expect(error).toBeNull();
    expect(data?.status).toBe(WALINKA_LINK_STATUS.connected);
    expect(data?.catalog).toEqual({
      name: 'Mi Tienda',
      logoUrl: 'https://cdn/l.png',
      isActive: true,
      publicUrl: 'https://miralatienda.de/catalogo/mi-tienda',
      usesCustomDomain: false,
    });
  });

  it('devuelve data:null (sin error) cuando no hay ningún vínculo', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const { data, error } = await walinkaLinkService.getLinkStatus('biz-1');
    expect(data).toBeNull();
    expect(error).toBeNull();
  });
});

describe('walinkaLinkService.requestLink', () => {
  it('llama a request_business_walinka_link con ambos ids y normaliza el resultado connected', async () => {
    rpc.mockResolvedValue({
      data: [{ koronel_business_id: 'biz-1', walinka_business_id: 'wa-1', connection_status: 'connected', source: 'koronel', connected_at: '2026-07-23T00:00:00Z', connected_by: 'user-1' }],
      error: null,
    });

    const { data, error } = await walinkaLinkService.requestLink({ koronelBusinessId: 'biz-1', walinkaBusinessId: 'wa-1' });

    expect(rpc).toHaveBeenCalledWith('request_business_walinka_link', {
      p_koronel_business_id: 'biz-1',
      p_walinka_business_id: 'wa-1',
    });
    expect(error).toBeNull();
    expect(data?.status).toBe('connected');
  });

  it.each([
    ['KORONEL_BUSINESS_NOT_CLAIMED', 'Este negocio debe estar reclamado antes de vincular un catálogo.'],
    ['WALINKA_CATALOG_NOT_OWNED', 'No encontramos ese catálogo asociado a tu cuenta.'],
    ['WALINKA_CATALOG_INACTIVE', 'Ese catálogo de Walinka está inactivo.'],
    ['WALINKA_LINK_ALREADY_ACTIVE', 'Este negocio ya tiene un catálogo Walinka vinculado.'],
    ['WALINKA_CATALOG_LINKED_TO_ANOTHER_OWN_BUSINESS', 'Ese catálogo ya está vinculado a otro de tus negocios.'],
    ['WALINKA_OWNERSHIP_CONFLICT', 'Ese catálogo ya está vinculado a otro negocio y no se puede conectar automáticamente.'],
  ])('mapea el código %s a su mensaje en español, sin mostrar texto crudo de Postgres', async (code, expectedMessage) => {
    rpc.mockResolvedValue({ data: null, error: { message: `${code}` } });

    const { data, error } = await walinkaLinkService.requestLink({ koronelBusinessId: 'biz-1', walinkaBusinessId: 'wa-1' });

    expect(data).toBeNull();
    expect(error).toEqual({ code, message: expectedMessage });
  });
});

describe('walinkaLinkService.revokeLink', () => {
  it('llama a revoke_business_walinka_link con el id correcto', async () => {
    rpc.mockResolvedValue({
      data: [{ koronel_business_id: 'biz-1', walinka_business_id: 'wa-1', connection_status: 'revoked', source: 'koronel', connected_at: null, connected_by: null }],
      error: null,
    });

    const { data, error } = await walinkaLinkService.revokeLink('biz-1');

    expect(rpc).toHaveBeenCalledWith('revoke_business_walinka_link', { p_koronel_business_id: 'biz-1' });
    expect(error).toBeNull();
    expect(data?.status).toBe('revoked');
  });

  it('mapea WALINKA_LINK_NOT_FOUND cuando no hay nada que revocar', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'WALINKA_LINK_NOT_FOUND' } });
    const { error } = await walinkaLinkService.revokeLink('biz-1');
    expect(error).toEqual({ code: 'WALINKA_LINK_NOT_FOUND', message: 'No hay ningún catálogo vinculado para revocar.' });
  });

  it('mapea WALINKA_NOT_AUTHORIZED cuando quien revoca no es dueño ni admin', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'WALINKA_NOT_AUTHORIZED' } });
    const { error } = await walinkaLinkService.revokeLink('biz-1');
    expect(error).toEqual({ code: 'WALINKA_NOT_AUTHORIZED', message: 'No tienes permiso para esta acción.' });
  });
});

describe('mapWalinkaError', () => {
  it('cae a WALINKA_UNKNOWN_ERROR con mensaje genérico ante un código no reconocido', () => {
    expect(mapWalinkaError({ message: 'algo raro de postgres, unique_violation' })).toEqual({
      code: 'WALINKA_UNKNOWN_ERROR',
      message: 'Ocurrió un error. Intenta de nuevo.',
    });
  });

  it('nunca devuelve el texto crudo del error como mensaje al usuario', () => {
    const { message } = mapWalinkaError({ message: 'duplicate key value violates unique constraint "business_walinka_links_pkey"' });
    expect(message).not.toContain('constraint');
    expect(message).not.toContain('business_walinka_links');
  });
});

describe('walinkaLinkService — sin acceso directo a tablas ni reconstrucción de URLs (verificación estructural)', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(path.join(here, 'walinkaLinkService.js'), 'utf-8');

  it('nunca usa supabase.from(...) — solo RPCs', () => {
    expect(source).not.toMatch(/\.from\(/);
  });

  it('nunca reconstruye una URL de catálogo a mano (sin literales de dominio ni de ruta /catalogo/)', () => {
    expect(source).not.toMatch(/catalogo\//);
    expect(source).not.toMatch(/miralatienda/i);
    expect(source).not.toMatch(/ventalink\.app\/catalogo/i);
  });

  it('no contiene ninguna credencial ni llave embebida', () => {
    expect(source).not.toMatch(/service_role/i);
    expect(source).not.toMatch(/eyJhbGci/); // prefijo típico de un JWT
  });
});
