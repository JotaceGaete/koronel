import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { mockGetAll } = vi.hoisted(() => ({ mockGetAll: vi.fn() }));
vi.mock('../../services/eventService', () => ({
  eventService: { getAll: mockGetAll },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../contexts/CityContext', () => ({ useCity: mockUseCity }));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/eventos', search: '' }),
}));

vi.mock('components/PageMeta', () => ({ default: () => null }));
vi.mock('components/ui/Header', () => ({ default: () => null }));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('components/AppImage', () => ({ default: () => null }));
vi.mock('components/ui/Button', () => ({ default: ({ children }) => <button>{children}</button> }));

import EventsListing from './index';

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function event(id) {
  return { id, title: `Evento ${id}`, category: 'meetups', start_datetime: new Date()?.toISOString() };
}

// El estado vacío ("No hay eventos") también es un <h3>, igual que el
// título de cada tarjeta — se excluye explícitamente para que esta huella
// solo represente eventos reales renderizados.
function eventTitles() {
  return screen.queryAllByRole('heading', { level: 3 })
    ?.map((el) => el.textContent)
    ?.filter((t) => t !== 'No hay eventos');
}

beforeEach(() => {
  mockGetAll.mockReset();
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('EventsListing — filtrado por communityCityId (Fase 4 / B3)', () => {
  it('envía la ciudad vigente a eventService.getAll junto con los filtros por defecto', async () => {
    mockGetAll.mockResolvedValue({ data: [event('a1')], count: 1, error: null });

    render(<EventsListing />);

    await waitFor(() => expect(eventTitles())?.toEqual(['Evento a1']));
    expect(mockGetAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', upcoming: true, communityCityId: 'city-a' })
    );
  });

  it('un cambio de ciudad limpia de inmediato los eventos anteriores, antes de que resuelva la ciudad nueva', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [event('a1')], count: 1, error: null });
    const { rerender } = render(<EventsListing />);
    await waitFor(() => expect(eventTitles())?.toEqual(['Evento a1']));

    const deferredB = createDeferred();
    mockGetAll.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<EventsListing />);

    // Limpieza inmediata (efecto síncrono), antes de que corra el debounce
    // de 300ms y de que resuelva la consulta de la ciudad nueva.
    expect(eventTitles())?.toHaveLength(0);

    deferredB.resolve({ data: [event('b1')], count: 1, error: null });
    await waitFor(() => expect(eventTitles())?.toEqual(['Evento b1']));
  }, 10000);

  it('la ciudad nueva reemplaza por completo los eventos de la ciudad anterior (no se mezclan)', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [event('a1')], count: 1, error: null });
    const { rerender } = render(<EventsListing />);
    await waitFor(() => expect(eventTitles())?.toEqual(['Evento a1']));

    mockGetAll.mockResolvedValueOnce({ data: [event('b1'), event('b2')], count: 2, error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<EventsListing />);

    await waitFor(() => expect(eventTitles())?.toEqual(['Evento b1', 'Evento b2']));
    expect(eventTitles())?.not?.toContain('Evento a1');
  }, 10000);

  it('vacío/error en la ciudad nueva no conserva los eventos de la ciudad anterior', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [event('a1')], count: 1, error: null });
    const { rerender } = render(<EventsListing />);
    await waitFor(() => expect(eventTitles())?.toEqual(['Evento a1']));

    mockGetAll.mockResolvedValueOnce({ data: null, count: 0, error: new Error('fail') });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<EventsListing />);

    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(2));
    expect(eventTitles())?.toHaveLength(0);
    expect(screen.getByText('No hay eventos'))?.toBeInTheDocument();
  }, 10000);

  it('una respuesta tardía de la ciudad anterior (ya obsoleta) no sobrescribe los eventos de la ciudad vigente', async () => {
    const deferredA = createDeferred();
    mockGetAll.mockReturnValueOnce(deferredA.promise);
    const { rerender } = render(<EventsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    const deferredB = createDeferred();
    mockGetAll.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<EventsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(2));

    // La ciudad vigente (B) resuelve primero.
    deferredB.resolve({ data: [event('b1')], count: 1, error: null });
    await waitFor(() => expect(eventTitles())?.toEqual(['Evento b1']));

    // La respuesta de la ciudad anterior (A), ya obsoleta, llega después.
    deferredA.resolve({ data: [event('a1')], count: 1, error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(eventTitles())?.toEqual(['Evento b1']);
  }, 10000);

  it('un cambio real de ciudad produce exactamente una carga adicional', async () => {
    mockGetAll.mockResolvedValue({ data: [event('a1')], count: 1, error: null });
    const { rerender } = render(<EventsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<EventsListing />);

    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(2));
  }, 10000);

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockGetAll.mockResolvedValue({ data: [event('a1')], count: 1, error: null });
    const { rerender } = render(<EventsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    rerender(<EventsListing />);

    expect(mockGetAll)?.toHaveBeenCalledTimes(1);
  });

  it('el filtro de búsqueda sigue funcionando dentro de la misma ciudad (mismo debounce previo)', async () => {
    mockGetAll.mockResolvedValue({ data: [event('a1')], count: 1, error: null });
    render(<EventsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    const searchInput = screen.getByPlaceholderText('Buscar eventos...');
    fireEvent.change(searchInput, { target: { value: 'feria' } });

    await waitFor(
      () =>
        expect(mockGetAll)?.toHaveBeenLastCalledWith(
          expect.objectContaining({ search: 'feria', communityCityId: 'city-a' })
        ),
      { timeout: 3000 }
    );
  }, 10000);

  it('el toggle de categoría sigue funcionando dentro de la misma ciudad', async () => {
    mockGetAll.mockResolvedValue({ data: [event('a1')], count: 1, error: null });
    render(<EventsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('Cursos'));

    await waitFor(
      () =>
        expect(mockGetAll)?.toHaveBeenLastCalledWith(
          expect.objectContaining({ category: 'courses', communityCityId: 'city-a' })
        ),
      { timeout: 3000 }
    );
  }, 10000);
});
