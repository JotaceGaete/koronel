import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const getLinkStatus = vi.fn();
const requestLink = vi.fn();
const revokeLink = vi.fn();
const getMyCatalogs = vi.fn();

vi.mock('../../../services/walinkaLinkService', () => ({
  walinkaLinkService: {
    getLinkStatus: (...args) => getLinkStatus(...args),
    requestLink: (...args) => requestLink(...args),
    revokeLink: (...args) => revokeLink(...args),
    getMyCatalogs: (...args) => getMyCatalogs(...args),
  },
}));

vi.mock('../../../utils/walinkaCatalog', () => ({
  buildWalinkaRegisterUrl: () => 'https://go.ventalink.app/register',
}));

import WalinkaSection from './WalinkaSection';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WalinkaSection — guard sin business.id', () => {
  it('no llama a getLinkStatus si el negocio no tiene id', () => {
    render(<WalinkaSection business={{}} />);
    expect(getLinkStatus).not.toHaveBeenCalled();
  });

  it('no renderiza nada si no hay business.id', () => {
    const { container } = render(<WalinkaSection business={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('WalinkaSection — estado sin vínculo', () => {
  it('muestra "No conectado con Walinka" y el botón para vincular', async () => {
    getLinkStatus.mockResolvedValue({ data: null, error: null });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);

    expect(await screen.findByText('No conectado con Walinka')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vincular catálogo/i })).toBeInTheDocument();
    expect(getLinkStatus).toHaveBeenCalledWith('biz-1');
  });

  it('trata un vínculo con status "revoked" como no conectado, sin catálogo ni "Ver catálogo"', async () => {
    getLinkStatus.mockResolvedValue({
      data: {
        status: 'revoked',
        catalog: { name: 'Catálogo Viejo', publicUrl: 'https://miralatienda.de/catalogo/viejo', usesCustomDomain: false },
      },
      error: null,
    });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);

    expect(await screen.findByText('No conectado con Walinka')).toBeInTheDocument();
    expect(screen.queryByText('Catálogo Viejo')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver catálogo/i })).not.toBeInTheDocument();
  });
});

describe('WalinkaSection — estado vinculado', () => {
  const connectedLink = {
    status: 'connected',
    catalog: { name: 'Mi Tienda', publicUrl: 'https://miralatienda.de/catalogo/mi-tienda', usesCustomDomain: false },
  };

  it('muestra nombre del catálogo, URL pública válida y botón Ver catálogo', async () => {
    getLinkStatus.mockResolvedValue({ data: connectedLink, error: null });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);

    expect(await screen.findByText('Mi Tienda')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Ver catálogo/i });
    expect(link).toHaveAttribute('href', 'https://miralatienda.de/catalogo/mi-tienda');
  });

  it('muestra el badge "Dominio propio" cuando usesCustomDomain es true', async () => {
    getLinkStatus.mockResolvedValue({
      data: { status: 'connected', catalog: { name: 'Con Dominio', publicUrl: 'https://midominio.cl', usesCustomDomain: true } },
      error: null,
    });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);
    expect(await screen.findByText('Dominio propio')).toBeInTheDocument();
  });

  it('no renderiza "Ver catálogo" si publicUrl no es http/https válida', async () => {
    getLinkStatus.mockResolvedValue({
      data: { status: 'connected', catalog: { name: 'Sin URL', publicUrl: 'javascript:alert(1)', usesCustomDomain: false } },
      error: null,
    });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);
    await screen.findByText('Sin URL');
    expect(screen.queryByRole('link', { name: /Ver catálogo/i })).not.toBeInTheDocument();
  });

  it('no renderiza "Ver catálogo" si publicUrl es null', async () => {
    getLinkStatus.mockResolvedValue({
      data: { status: 'connected', catalog: { name: 'Sin URL', publicUrl: null, usesCustomDomain: false } },
      error: null,
    });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);
    await screen.findByText('Sin URL');
    expect(screen.queryByRole('link', { name: /Ver catálogo/i })).not.toBeInTheDocument();
  });

  it('nunca renderiza un UUID crudo en el texto visible', async () => {
    getLinkStatus.mockResolvedValue({
      data: {
        status: 'connected',
        koronelBusinessId: '11111111-1111-1111-1111-111111111111',
        walinkaBusinessId: '22222222-2222-2222-2222-222222222222',
        catalog: { name: 'Mi Tienda', publicUrl: 'https://miralatienda.de/catalogo/mi-tienda', usesCustomDomain: false },
      },
      error: null,
    });
    const { container } = render(<WalinkaSection business={{ id: 'biz-1' }} />);
    await screen.findByText('Mi Tienda');
    expect(container?.textContent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});

describe('WalinkaSection — desvincular', () => {
  const connectedLink = {
    status: 'connected',
    catalog: { name: 'Mi Tienda', publicUrl: 'https://miralatienda.de/catalogo/mi-tienda', usesCustomDomain: false },
  };

  it('pide confirmación explícita con botones "Cancelar" y "Desvincular" antes de revocar', async () => {
    getLinkStatus.mockResolvedValue({ data: connectedLink, error: null });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);
    await screen.findByText('Mi Tienda');

    fireEvent.click(screen.getByRole('button', { name: /^Desvincular$/i }));

    expect(await screen.findByText('¿Desvincular este catálogo de Walinka?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancelar$/i })).toBeInTheDocument();
    expect(revokeLink).not.toHaveBeenCalled();
  });

  it('cancelar vuelve al estado conectado sin llamar a revokeLink', async () => {
    getLinkStatus.mockResolvedValue({ data: connectedLink, error: null });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);
    await screen.findByText('Mi Tienda');

    fireEvent.click(screen.getByRole('button', { name: /^Desvincular$/i }));
    await screen.findByText('¿Desvincular este catálogo de Walinka?');
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/i }));

    expect(screen.queryByText('¿Desvincular este catálogo de Walinka?')).not.toBeInTheDocument();
    expect(revokeLink).not.toHaveBeenCalled();
  });

  it('confirmar llama a revokeLink y actualiza a "No conectado" sin volver a llamar getLinkStatus', async () => {
    getLinkStatus.mockResolvedValue({ data: connectedLink, error: null });
    revokeLink.mockResolvedValue({ data: { status: 'revoked', catalog: null }, error: null });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);
    await screen.findByText('Mi Tienda');

    fireEvent.click(screen.getByRole('button', { name: /^Desvincular$/i }));
    await screen.findByText('¿Desvincular este catálogo de Walinka?');
    const confirmButtons = screen.getAllByRole('button', { name: /^Desvincular$/i });
    fireEvent.click(confirmButtons?.[confirmButtons?.length - 1]);

    await waitFor(() => expect(revokeLink).toHaveBeenCalledWith('biz-1'));
    expect(await screen.findByText('No conectado con Walinka')).toBeInTheDocument();
    expect(getLinkStatus).toHaveBeenCalledTimes(1); // solo la carga inicial, no un refresco tras revocar
  });

  it('deshabilita el botón de confirmar mientras la revocación está en curso', async () => {
    getLinkStatus.mockResolvedValue({ data: connectedLink, error: null });
    let resolveRevoke;
    revokeLink.mockReturnValue(new Promise((resolve) => { resolveRevoke = resolve; }));
    render(<WalinkaSection business={{ id: 'biz-1' }} />);
    await screen.findByText('Mi Tienda');

    fireEvent.click(screen.getByRole('button', { name: /^Desvincular$/i }));
    await screen.findByText('¿Desvincular este catálogo de Walinka?');
    const confirmButtons = screen.getAllByRole('button', { name: /^Desvincular$/i });
    const confirmButton = confirmButtons?.[confirmButtons?.length - 1];
    fireEvent.click(confirmButton);

    expect(confirmButton).toBeDisabled();
    resolveRevoke({ data: { status: 'revoked', catalog: null }, error: null });
    await waitFor(() => expect(screen.queryByText('¿Desvincular este catálogo de Walinka?')).not.toBeInTheDocument());
  });
});

describe('WalinkaSection — error', () => {
  it('muestra el mensaje de error mapeado y permite reintentar', async () => {
    getLinkStatus.mockResolvedValueOnce({ data: null, error: { code: 'WALINKA_AUTH_REQUIRED', message: 'Debes iniciar sesión para continuar.' } });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);

    expect(await screen.findByText('Debes iniciar sesión para continuar.')).toBeInTheDocument();

    getLinkStatus.mockResolvedValueOnce({ data: null, error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('No conectado con Walinka')).toBeInTheDocument();
    expect(getLinkStatus).toHaveBeenCalledTimes(2);
  });
});

describe('WalinkaSection — abrir modal', () => {
  it('abre WalinkaConnectModal al hacer clic en "Vincular catálogo"', async () => {
    getLinkStatus.mockResolvedValue({ data: null, error: null });
    getMyCatalogs.mockResolvedValue({ data: [], error: null });
    render(<WalinkaSection business={{ id: 'biz-1' }} />);

    fireEvent.click(await screen.findByRole('button', { name: /Vincular catálogo/i }));

    expect(await screen.findByRole('dialog', { name: /Vincular catálogo Walinka/i })).toBeInTheDocument();
  });
});
