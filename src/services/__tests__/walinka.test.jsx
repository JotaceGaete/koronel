import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const rpc = vi.fn();
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: (...args) => rpc(...args) } }));
vi.mock('components/AppIcon', () => ({ default: () => null }));

import { walinkaService, safeCatalogUrl, walinkaErrorMessage } from '../walinkaService';
import WalinkaCatalogButton from '../../pages/business-profile-page/components/WalinkaCatalogButton';
import WalinkaCatalogTab from '../../pages/business-owner-dashboard/components/WalinkaCatalogTab';

const BIZ = { id: 'biz-1', name: 'Ferretería Centro', claimed: true };
const CAT_OK = { id: 'cat-1', name: 'Mi Tienda', is_active: true, public_url: 'https://miralatienda.de/catalogo/mi-tienda' };
const CAT_INACTIVE = { id: 'cat-2', name: 'Inactiva', is_active: false, public_url: 'https://miralatienda.de/catalogo/inactiva' };
const CAT_NO_URL = { id: 'cat-3', name: 'Sin URL', is_active: true, public_url: null };

function rpcRouter(routes) {
  rpc.mockImplementation((fn, args) => {
    const handler = routes[fn];
    if (!handler) return Promise.resolve({ data: null, error: { message: `unexpected ${fn}` } });
    return Promise.resolve(typeof handler === 'function' ? handler(args) : handler);
  });
}

beforeEach(() => rpc.mockReset());

describe('safeCatalogUrl', () => {
  it('acepta solo https sin credenciales ni puerto', () => {
    expect(safeCatalogUrl('https://miralatienda.de/catalogo/x')).toBe('https://miralatienda.de/catalogo/x');
    expect(safeCatalogUrl('http://miralatienda.de/catalogo/x')).toBeNull();
    expect(safeCatalogUrl('javascript:alert(1)')).toBeNull();
    expect(safeCatalogUrl('https://user:pw@evil.com')).toBeNull();
    expect(safeCatalogUrl('https://evil.com:8443/')).toBeNull();
    expect(safeCatalogUrl('/catalogo/x')).toBeNull();
    expect(safeCatalogUrl(null)).toBeNull();
  });
});

describe('walinkaService', () => {
  it('escenario 8: oculta catálogos inactivos o sin URL pública', async () => {
    rpcRouter({ get_my_walinka_catalogs: { data: [CAT_OK, CAT_INACTIVE, CAT_NO_URL], error: null } });
    const { data } = await walinkaService.getMyCatalogs();
    expect(data.map((c) => c.id)).toEqual(['cat-1']);
  });

  it('escenarios 3 y 4: traduce rechazos del servidor sin exponer detalles', () => {
    expect(walinkaErrorMessage({ message: 'WALINKA_CATALOG_NOT_OWNED' })).toMatch(/no pertenece/);
    expect(walinkaErrorMessage({ message: 'KORONEL_BUSINESS_NOT_CLAIMED' })).toMatch(/no está registrado/);
    expect(walinkaErrorMessage({ message: 'WALINKA_NOT_AUTHORIZED' })).toMatch(/No tienes permiso/);
    expect(walinkaErrorMessage({ message: 'otra cosa' })).toMatch(/No se pudo/);
  });

  it('getPublicLink devuelve null ante error o URL no segura', async () => {
    rpcRouter({ get_public_walinka_link: { data: null, error: { message: 'boom' } } });
    expect(await walinkaService.getPublicLink('biz-1')).toBeNull();
    rpcRouter({ get_public_walinka_link: { data: [{ walinka_name: 'X', public_url: 'javascript:alert(1)' }], error: null } });
    expect(await walinkaService.getPublicLink('biz-1')).toBeNull();
    expect(await walinkaService.getPublicLink(null)).toBeNull();
  });

  it('envía solo los IDs al servidor; la propiedad se valida allá', async () => {
    rpcRouter({ request_business_walinka_link: { data: [{}], error: null } });
    await walinkaService.link('biz-1', 'cat-1');
    expect(rpc).toHaveBeenCalledWith('request_business_walinka_link', {
      p_koronel_business_id: 'biz-1',
      p_walinka_business_id: 'cat-1',
    });
  });
});

describe('Ficha pública: WalinkaCatalogButton', () => {
  it('escenario 5: negocio vinculado muestra botón con la URL correcta', async () => {
    rpcRouter({ get_public_walinka_link: { data: [{ walinka_name: 'Mi Tienda', public_url: CAT_OK.public_url }], error: null } });
    render(<WalinkaCatalogButton businessId="biz-1" />);
    const btn = await screen.findByTestId('walinka-catalog-button');
    expect(btn).toHaveTextContent('Ver catálogo y pedir por WhatsApp');
    expect(btn).toHaveAttribute('href', CAT_OK.public_url);
    expect(btn).toHaveAttribute('target', '_blank');
    expect(btn.getAttribute('rel')).toContain('noopener');
  });

  it('escenarios 6 y 7: sin vínculo (o desvinculado) no renderiza nada', async () => {
    rpcRouter({ get_public_walinka_link: { data: [], error: null } });
    const { container } = render(<WalinkaCatalogButton businessId="biz-1" />);
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Panel: WalinkaCatalogTab', () => {
  it('escenario 2: sin catálogos muestra mensaje y enlace', async () => {
    rpcRouter({
      get_my_walinka_catalogs: { data: [], error: null },
      get_business_walinka_link_status: { data: [], error: null },
    });
    render(<WalinkaCatalogTab businesses={[BIZ]} />);
    expect(await screen.findByText(/No tienes catálogos Walinka/)).toBeInTheDocument();
    expect(screen.getByText(/Conoce Walinka/).closest('a')).toHaveAttribute('href', 'https://walinka.com/');
  });

  it('escenario 1: selecciona, confirma y vincula', async () => {
    let linked = false;
    rpcRouter({
      get_my_walinka_catalogs: { data: [CAT_OK, CAT_INACTIVE], error: null },
      get_business_walinka_link_status: () => ({
        data: linked ? [{ walinka_name: 'Mi Tienda', walinka_is_active: true, walinka_public_url: CAT_OK.public_url }] : [],
        error: null,
      }),
      request_business_walinka_link: () => {
        linked = true;
        return { data: [{ connection_status: 'connected' }], error: null };
      },
    });
    render(<WalinkaCatalogTab businesses={[BIZ]} />);
    const select = await screen.findByLabelText(/Selecciona el catálogo/);
    expect(screen.queryByText('Inactiva')).toBeNull();
    fireEvent.change(select, { target: { value: 'cat-1' } });
    fireEvent.click(screen.getByText('Vincular catálogo'));
    fireEvent.click(screen.getByText('Confirmar vinculación'));
    expect(await screen.findByText('Catálogo vinculado correctamente.')).toBeInTheDocument();
    expect(screen.getByText('Ver catálogo').closest('a')).toHaveAttribute('href', CAT_OK.public_url);
  });

  it('escenario 3: el servidor rechaza un catálogo ajeno y se muestra el error', async () => {
    rpcRouter({
      get_my_walinka_catalogs: { data: [CAT_OK], error: null },
      get_business_walinka_link_status: { data: [], error: null },
      request_business_walinka_link: { data: null, error: { message: 'WALINKA_CATALOG_NOT_OWNED' } },
    });
    render(<WalinkaCatalogTab businesses={[BIZ]} />);
    fireEvent.change(await screen.findByLabelText(/Selecciona el catálogo/), { target: { value: 'cat-1' } });
    fireEvent.click(screen.getByText('Vincular catálogo'));
    fireEvent.click(screen.getByText('Confirmar vinculación'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no pertenece/);
  });

  it('escenario 7: desvincular vuelve al estado sin vínculo', async () => {
    let linked = true;
    rpcRouter({
      get_my_walinka_catalogs: { data: [CAT_OK], error: null },
      get_business_walinka_link_status: () => ({
        data: linked ? [{ walinka_name: 'Mi Tienda', walinka_is_active: true, walinka_public_url: CAT_OK.public_url }] : [],
        error: null,
      }),
      revoke_business_walinka_link: () => {
        linked = false;
        return { data: [{ connection_status: 'revoked' }], error: null };
      },
    });
    render(<WalinkaCatalogTab businesses={[BIZ]} />);
    fireEvent.click(await screen.findByText('Desvincular'));
    fireEvent.click(screen.getByText('Sí, desvincular'));
    expect(await screen.findByText('Catálogo desvinculado.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Selecciona el catálogo/)).toBeInTheDocument();
  });

  it('escenario 8: catálogo vinculado pero desactivado no muestra enlace', async () => {
    rpcRouter({
      get_my_walinka_catalogs: { data: [], error: null },
      get_business_walinka_link_status: { data: [{ walinka_name: 'Mi Tienda', walinka_is_active: false, walinka_public_url: CAT_OK.public_url }], error: null },
    });
    render(<WalinkaCatalogTab businesses={[BIZ]} />);
    expect(await screen.findByText(/no está activo o no es público/)).toBeInTheDocument();
    expect(screen.queryByText('Ver catálogo')).toBeNull();
  });

  it('negocio no reclamado no ofrece vincular', async () => {
    rpcRouter({
      get_my_walinka_catalogs: { data: [CAT_OK], error: null },
      get_business_walinka_link_status: { data: [], error: null },
    });
    render(<WalinkaCatalogTab businesses={[{ ...BIZ, claimed: false }]} />);
    expect(await screen.findByText(/no figura como reclamado/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Selecciona el catálogo/)).toBeNull();
  });
});
