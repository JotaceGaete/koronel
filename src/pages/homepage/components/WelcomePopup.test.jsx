import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetActivePopup } = vi.hoisted(() => ({ mockGetActivePopup: vi.fn() }));
vi.mock('../../../services/popupService', () => ({
  popupService: { getActivePopup: mockGetActivePopup },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../../contexts/CityContext', () => ({ useCity: mockUseCity }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

import WelcomePopup from './WelcomePopup';

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  mockGetActivePopup.mockReset();
  mockNavigate.mockClear();
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
  sessionStorage.removeItem('welcome_popup_dismissed');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WelcomePopup — filtrado por communityCityId (Fase 4 / B7)', () => {
  it('solicita el popup con la ciudad vigente', async () => {
    mockGetActivePopup.mockResolvedValue({ data: { id: 'p1', title: 'Hola' }, error: null });

    render(<WelcomePopup />);

    await waitFor(() =>
      expect(mockGetActivePopup).toHaveBeenCalledWith({ communityCityId: 'city-a' })
    );
  });

  it('sin popup activo (data null): no se renderiza nada', async () => {
    mockGetActivePopup.mockResolvedValue({ data: null, error: null });

    const { container } = render(<WelcomePopup />);

    await waitFor(() => expect(mockGetActivePopup).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('con error: no se renderiza nada (comportamiento previo conservado)', async () => {
    mockGetActivePopup.mockResolvedValue({ data: null, error: new Error('fail') });

    const { container } = render(<WelcomePopup />);

    await waitFor(() => expect(mockGetActivePopup).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el título del popup recibido', async () => {
    mockGetActivePopup.mockResolvedValue({ data: { id: 'p1', title: 'Bienvenido a la ciudad A' }, error: null });

    render(<WelcomePopup />);

    expect(await screen.findByText('Bienvenido a la ciudad A')).toBeInTheDocument();
  });

  it('un cambio de ciudad limpia de inmediato el popup anterior, antes de que resuelva la ciudad nueva', async () => {
    mockGetActivePopup.mockResolvedValueOnce({ data: { id: 'p-a', title: 'Popup A' }, error: null });
    const { rerender, container } = render(<WelcomePopup />);
    await screen.findByText('Popup A');

    const deferredB = createDeferred();
    mockGetActivePopup.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<WelcomePopup />);

    // Antes de resolver la consulta de la ciudad nueva, ya no debe verse el
    // popup de la ciudad anterior.
    expect(screen.queryByText('Popup A')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();

    deferredB.resolve({ data: { id: 'p-b', title: 'Popup B' }, error: null });
    expect(await screen.findByText('Popup B')).toBeInTheDocument();
  });

  it('la ciudad nueva reemplaza por completo a la anterior (no se mezclan)', async () => {
    mockGetActivePopup.mockResolvedValueOnce({ data: { id: 'p-a', title: 'Popup A' }, error: null });
    const { rerender } = render(<WelcomePopup />);
    await screen.findByText('Popup A');

    mockGetActivePopup.mockResolvedValueOnce({ data: { id: 'p-b', title: 'Popup B' }, error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<WelcomePopup />);

    await screen.findByText('Popup B');
    expect(screen.queryByText('Popup A')).not.toBeInTheDocument();
  });

  it('una respuesta tardía de la ciudad anterior (ya cancelada) no sobrescribe el popup de la ciudad vigente', async () => {
    const deferredA = createDeferred();
    mockGetActivePopup.mockReturnValueOnce(deferredA.promise);
    const { rerender } = render(<WelcomePopup />);
    await waitFor(() => expect(mockGetActivePopup).toHaveBeenCalledTimes(1));

    const deferredB = createDeferred();
    mockGetActivePopup.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<WelcomePopup />);
    await waitFor(() => expect(mockGetActivePopup).toHaveBeenCalledTimes(2));

    // La ciudad vigente (B) resuelve primero.
    deferredB.resolve({ data: { id: 'p-b', title: 'Popup B' }, error: null });
    await screen.findByText('Popup B');

    // La respuesta de la ciudad anterior (A), ya cancelada, llega después.
    deferredA.resolve({ data: { id: 'p-a', title: 'Popup A' }, error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryByText('Popup A')).not.toBeInTheDocument();
    expect(screen.getByText('Popup B')).toBeInTheDocument();
  });

  it('un cambio real de ciudad produce exactamente una carga adicional', async () => {
    mockGetActivePopup.mockResolvedValue({ data: null, error: null });
    const { rerender } = render(<WelcomePopup />);
    await waitFor(() => expect(mockGetActivePopup).toHaveBeenCalledTimes(1));

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<WelcomePopup />);

    await waitFor(() => expect(mockGetActivePopup).toHaveBeenCalledTimes(2));
  });

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockGetActivePopup.mockResolvedValue({ data: null, error: null });
    const { rerender } = render(<WelcomePopup />);
    await waitFor(() => expect(mockGetActivePopup).toHaveBeenCalledTimes(1));

    rerender(<WelcomePopup />);

    expect(mockGetActivePopup).toHaveBeenCalledTimes(1);
  });

  it('si el popup ya fue descartado en la sesión, no se vuelve a consultar aunque cambie la ciudad', async () => {
    sessionStorage.setItem('welcome_popup_dismissed', '1');
    mockGetActivePopup.mockResolvedValue({ data: { id: 'p1', title: 'Hola' }, error: null });

    const { rerender } = render(<WelcomePopup />);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<WelcomePopup />);

    expect(mockGetActivePopup).not.toHaveBeenCalled();
  });
});
