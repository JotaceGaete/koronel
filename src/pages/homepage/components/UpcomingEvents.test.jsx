import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetUpcoming } = vi.hoisted(() => ({ mockGetUpcoming: vi.fn() }));
vi.mock('../../../services/eventService', () => ({
  eventService: {
    getUpcoming: mockGetUpcoming,
    formatEvent: (ev) => ({ dateStr: '', timeStr: '' , ...ev }),
  },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../../contexts/CityContext', () => ({ useCity: mockUseCity }));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('components/AppImage', () => ({ default: () => null }));
vi.mock('components/ui/Button', () => ({ default: ({ children }) => <button>{children}</button> }));

import UpcomingEvents from './UpcomingEvents';

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function event(id) {
  return { id, title: `Evento ${id}`, category: 'meetups', start_datetime: new Date()?.toISOString() };
}

function eventTitles() {
  return screen.queryAllByRole('heading', { level: 3 })?.map((el) => el.textContent);
}

beforeEach(() => {
  mockGetUpcoming.mockReset();
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('UpcomingEvents — filtrado por communityCityId (Fase 4 / B3)', () => {
  it('envía la ciudad vigente a eventService.getUpcoming', async () => {
    mockGetUpcoming.mockResolvedValue({ data: [event('a1')], error: null });

    render(<UpcomingEvents />);

    await waitFor(() => expect(eventTitles())?.toEqual(['Evento a1']));
    expect(mockGetUpcoming).toHaveBeenCalledWith({ limit: 4, communityCityId: 'city-a' });
  });

  it('sin eventos próximos (data vacía real): muestra el estado vacío, no contenido ficticio', async () => {
    mockGetUpcoming.mockResolvedValue({ data: [], error: null });

    render(<UpcomingEvents />);

    await waitFor(() => expect(mockGetUpcoming)?.toHaveBeenCalled());
    expect(await screen.findByText('No hay eventos próximos'))?.toBeInTheDocument();
    expect(eventTitles())?.toHaveLength(0);
  });

  it('con error: muestra el estado vacío, no conserva contenido ficticio', async () => {
    mockGetUpcoming.mockResolvedValue({ data: null, error: new Error('fail') });

    render(<UpcomingEvents />);

    await waitFor(() => expect(mockGetUpcoming)?.toHaveBeenCalled());
    expect(await screen.findByText('No hay eventos próximos'))?.toBeInTheDocument();
  });

  it('un cambio de ciudad limpia de inmediato los eventos anteriores, antes de que resuelva la ciudad nueva', async () => {
    mockGetUpcoming.mockResolvedValueOnce({ data: [event('a1')], error: null });
    const { rerender } = render(<UpcomingEvents />);
    await waitFor(() => expect(eventTitles())?.toEqual(['Evento a1']));

    const deferredB = createDeferred();
    mockGetUpcoming.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<UpcomingEvents />);

    // Antes de resolver la consulta de la ciudad nueva, ya no debe verse el
    // evento de la ciudad anterior.
    expect(eventTitles())?.toHaveLength(0);

    deferredB.resolve({ data: [event('b1')], error: null });
    await waitFor(() => expect(eventTitles())?.toEqual(['Evento b1']));
  });

  it('la ciudad nueva reemplaza por completo a la anterior (no se mezclan)', async () => {
    mockGetUpcoming.mockResolvedValueOnce({ data: [event('a1')], error: null });
    const { rerender } = render(<UpcomingEvents />);
    await waitFor(() => expect(eventTitles())?.toEqual(['Evento a1']));

    mockGetUpcoming.mockResolvedValueOnce({ data: [event('b1'), event('b2')], error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<UpcomingEvents />);

    await waitFor(() => expect(eventTitles())?.toEqual(['Evento b1', 'Evento b2']));
    expect(eventTitles())?.not?.toContain('Evento a1');
  });

  it('una respuesta tardía de la ciudad anterior (ya cancelada) no sobrescribe los eventos de la ciudad vigente', async () => {
    const deferredA = createDeferred();
    mockGetUpcoming.mockReturnValueOnce(deferredA.promise);
    const { rerender } = render(<UpcomingEvents />);
    await waitFor(() => expect(mockGetUpcoming)?.toHaveBeenCalledTimes(1));

    const deferredB = createDeferred();
    mockGetUpcoming.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<UpcomingEvents />);
    await waitFor(() => expect(mockGetUpcoming)?.toHaveBeenCalledTimes(2));

    // La ciudad vigente (B) resuelve primero.
    deferredB.resolve({ data: [event('b1')], error: null });
    await waitFor(() => expect(eventTitles())?.toEqual(['Evento b1']));

    // La respuesta de la ciudad anterior (A), ya cancelada, llega después.
    deferredA.resolve({ data: [event('a1')], error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(eventTitles())?.toEqual(['Evento b1']);
  });

  it('un cambio real de ciudad produce exactamente una carga adicional', async () => {
    mockGetUpcoming.mockResolvedValue({ data: [event('a1')], error: null });
    const { rerender } = render(<UpcomingEvents />);
    await waitFor(() => expect(mockGetUpcoming)?.toHaveBeenCalledTimes(1));

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<UpcomingEvents />);

    await waitFor(() => expect(mockGetUpcoming)?.toHaveBeenCalledTimes(2));
  });

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockGetUpcoming.mockResolvedValue({ data: [event('a1')], error: null });
    const { rerender } = render(<UpcomingEvents />);
    await waitFor(() => expect(mockGetUpcoming)?.toHaveBeenCalledTimes(1));

    rerender(<UpcomingEvents />);

    expect(mockGetUpcoming)?.toHaveBeenCalledTimes(1);
  });

  it('conserva la navegación a "Ver todos" y al formulario de publicar evento', async () => {
    mockGetUpcoming.mockResolvedValue({ data: [], error: null });

    render(<UpcomingEvents />);

    await waitFor(() => expect(mockGetUpcoming)?.toHaveBeenCalled());
    expect(screen.getByText('Ver todos').closest('a'))?.toHaveAttribute('href', '/eventos');
    expect(screen.getByText('Publicar evento').closest('a'))?.toHaveAttribute('href', '/post-event-form');
  });
});
