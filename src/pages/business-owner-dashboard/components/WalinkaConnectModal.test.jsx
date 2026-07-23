import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const getMyCatalogs = vi.fn();
const requestLink = vi.fn();

vi.mock('../../../services/walinkaLinkService', () => ({
  walinkaLinkService: {
    getMyCatalogs: (...args) => getMyCatalogs(...args),
    requestLink: (...args) => requestLink(...args),
  },
}));

vi.mock('../../../utils/walinkaCatalog', () => ({
  buildWalinkaRegisterUrl: () => 'https://go.ventalink.app/register',
}));

import WalinkaConnectModal from './WalinkaConnectModal';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WalinkaConnectModal — carga de catálogos', () => {
  it('llama a getMyCatalogs al montar y lista los catálogos', async () => {
    getMyCatalogs.mockResolvedValue({
      data: [
        { id: 'wa-1', name: 'Mi Tienda', isActive: true },
        { id: 'wa-2', name: 'Otra Tienda', isActive: true },
      ],
      error: null,
    });
    render(<WalinkaConnectModal businessId="biz-1" onClose={vi.fn()} onLinked={vi.fn()} />);

    expect(await screen.findByText('Mi Tienda')).toBeInTheDocument();
    expect(screen.getByText('Otra Tienda')).toBeInTheDocument();
    expect(getMyCatalogs).toHaveBeenCalledTimes(1);
  });

  it('muestra el estado "sin catálogos" con el CTA de crear catálogo cuando la lista viene vacía', async () => {
    getMyCatalogs.mockResolvedValue({ data: [], error: null });
    render(<WalinkaConnectModal businessId="biz-1" onClose={vi.fn()} onLinked={vi.fn()} />);

    expect(await screen.findByText('Todavía no tienes ningún catálogo Walinka.')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Crear catálogo gratis/i });
    expect(cta).toHaveAttribute('href', 'https://go.ventalink.app/register');
  });

  it('muestra el error mapeado si getMyCatalogs falla', async () => {
    getMyCatalogs.mockResolvedValue({ data: [], error: { code: 'WALINKA_AUTH_REQUIRED', message: 'Debes iniciar sesión para continuar.' } });
    render(<WalinkaConnectModal businessId="biz-1" onClose={vi.fn()} onLinked={vi.fn()} />);
    expect(await screen.findByText('Debes iniciar sesión para continuar.')).toBeInTheDocument();
  });
});

describe('WalinkaConnectModal — vincular', () => {
  it('el botón Vincular está deshabilitado hasta elegir un catálogo', async () => {
    getMyCatalogs.mockResolvedValue({ data: [{ id: 'wa-1', name: 'Mi Tienda', isActive: true }], error: null });
    render(<WalinkaConnectModal businessId="biz-1" onClose={vi.fn()} onLinked={vi.fn()} />);
    await screen.findByText('Mi Tienda');
    expect(screen.getByRole('button', { name: 'Vincular' })).toBeDisabled();
  });

  it('selecciona un catálogo y confirma con requestLink(businessId, catalogId)', async () => {
    getMyCatalogs.mockResolvedValue({ data: [{ id: 'wa-1', name: 'Mi Tienda', isActive: true }], error: null });
    requestLink.mockResolvedValue({ data: { koronelBusinessId: 'biz-1', walinkaBusinessId: 'wa-1', status: 'connected' }, error: null });
    const onLinked = vi.fn();
    render(<WalinkaConnectModal businessId="biz-1" onClose={vi.fn()} onLinked={onLinked} />);
    await screen.findByText('Mi Tienda');

    fireEvent.click(screen.getByRole('radio'));
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));

    await waitFor(() => expect(requestLink).toHaveBeenCalledWith({ koronelBusinessId: 'biz-1', walinkaBusinessId: 'wa-1' }));
    expect(onLinked).toHaveBeenCalledTimes(1);
  });

  it('deshabilita Cancelar y Vincular mientras la solicitud está en curso, para evitar dobles clics', async () => {
    getMyCatalogs.mockResolvedValue({ data: [{ id: 'wa-1', name: 'Mi Tienda', isActive: true }], error: null });
    let resolveRequest;
    requestLink.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    render(<WalinkaConnectModal businessId="biz-1" onClose={vi.fn()} onLinked={vi.fn()} />);
    await screen.findByText('Mi Tienda');

    fireEvent.click(screen.getByRole('radio'));
    const confirmButton = screen.getByRole('button', { name: 'Vincular' });
    fireEvent.click(confirmButton);

    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    resolveRequest({ data: { status: 'connected' }, error: null });
    await waitFor(() => expect(requestLink).toHaveBeenCalledTimes(1));
  });

  it('muestra el error mapeado y no cierra el modal si requestLink falla (p. ej. catálogo ya vinculado a otro negocio)', async () => {
    getMyCatalogs.mockResolvedValue({ data: [{ id: 'wa-1', name: 'Mi Tienda', isActive: true }], error: null });
    requestLink.mockResolvedValue({ data: null, error: { code: 'WALINKA_OWNERSHIP_CONFLICT', message: 'Ese catálogo ya está vinculado a otro negocio y no se puede conectar automáticamente.' } });
    const onLinked = vi.fn();
    render(<WalinkaConnectModal businessId="biz-1" onClose={vi.fn()} onLinked={onLinked} />);
    await screen.findByText('Mi Tienda');

    fireEvent.click(screen.getByRole('radio'));
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));

    expect(await screen.findByText('Ese catálogo ya está vinculado a otro negocio y no se puede conectar automáticamente.')).toBeInTheDocument();
    expect(onLinked).not.toHaveBeenCalled();
  });
});

describe('WalinkaConnectModal — cierre y accesibilidad', () => {
  it('llama a onClose al hacer clic en el botón X', async () => {
    getMyCatalogs.mockResolvedValue({ data: [], error: null });
    const onClose = vi.fn();
    render(<WalinkaConnectModal businessId="biz-1" onClose={onClose} onLinked={vi.fn()} />);
    await screen.findByText('Todavía no tienes ningún catálogo Walinka.');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('llama a onClose al presionar Escape', async () => {
    getMyCatalogs.mockResolvedValue({ data: [], error: null });
    const onClose = vi.fn();
    render(<WalinkaConnectModal businessId="biz-1" onClose={onClose} onLinked={vi.fn()} />);
    await screen.findByText('Todavía no tienes ningún catálogo Walinka.');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('llama a onClose al hacer clic en el fondo (backdrop), pero no al hacer clic dentro del diálogo', async () => {
    getMyCatalogs.mockResolvedValue({ data: [], error: null });
    const onClose = vi.fn();
    const { container } = render(<WalinkaConnectModal businessId="biz-1" onClose={onClose} onLinked={vi.fn()} />);
    await screen.findByText('Todavía no tienes ningún catálogo Walinka.');

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container?.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('el diálogo expone role="dialog" y aria-modal="true"', async () => {
    getMyCatalogs.mockResolvedValue({ data: [], error: null });
    render(<WalinkaConnectModal businessId="biz-1" onClose={vi.fn()} onLinked={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
