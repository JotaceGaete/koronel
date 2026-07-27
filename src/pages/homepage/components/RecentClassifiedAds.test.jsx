import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetRecent } = vi.hoisted(() => ({ mockGetRecent: vi.fn() }));
vi.mock('../../../services/adService', () => ({
  adService: {
    getRecent: mockGetRecent,
    formatAd: (ad) => ad,
  },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../../contexts/CityContext', () => ({ useCity: mockUseCity }));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock('components/ui/Button', () => ({ default: ({ children }) => <button>{children}</button> }));
vi.mock('components/ui/FeaturedContentCarousel', () => ({
  default: ({ items }) => (
    <div data-testid="carousel">
      {items?.map((it) => (
        <span key={it?.id} data-testid="carousel-item">{it?.id}</span>
      ))}
    </div>
  ),
}));

import RecentClassifiedAds from './RecentClassifiedAds';

const EMPTY_MESSAGE = 'Aún no hay clasificados recientes en esta ciudad.';
const FICTITIOUS_STRINGS = ['Toyota Corolla', 'iPhone 13 Pro', 'Departamento 2D/1B', 'Bicicleta de montaña Trek'];

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function carouselIds() {
  return screen.queryAllByTestId('carousel-item')?.map((el) => el.textContent);
}

function assertNoFictitiousContent(container) {
  const text = container.textContent;
  FICTITIOUS_STRINGS?.forEach((s) => expect(text)?.not?.toContain(s));
}

beforeEach(() => {
  mockGetRecent.mockReset();
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('RecentClassifiedAds — filtrado por communityCityId (Fase 4)', () => {
  it('estado inicial: sin avisos ficticios, no muestra el carrusel hasta que llegue una respuesta real', () => {
    mockGetRecent.mockReturnValue(new Promise(() => {})); // nunca resuelve dentro de este test

    const { container } = render(<RecentClassifiedAds />);

    expect(screen.queryByTestId('carousel'))?.not?.toBeInTheDocument();
    expect(screen.getByText(EMPTY_MESSAGE))?.toBeInTheDocument();
    assertNoFictitiousContent(container);
  });

  it('ciudad A muestra clasificados reales, con el communityCityId vigente', async () => {
    mockGetRecent.mockResolvedValue({ data: [{ id: 'a1' }], error: null });

    render(<RecentClassifiedAds />);

    await waitFor(() => expect(carouselIds())?.toEqual(['a1']));
    expect(mockGetRecent).toHaveBeenCalledWith({ limit: 6, communityCityId: 'city-a' });
  });

  it('al cambiar a ciudad B, los clasificados de A desaparecen de inmediato (antes de resolver B)', async () => {
    mockGetRecent.mockResolvedValueOnce({ data: [{ id: 'a1' }], error: null });
    const { rerender, container } = render(<RecentClassifiedAds />);
    await waitFor(() => expect(carouselIds())?.toEqual(['a1']));

    const deferredB = createDeferred();
    mockGetRecent.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentClassifiedAds />);

    // Antes de resolver la consulta de la ciudad nueva, ya no debe verse el
    // clasificado real de la ciudad anterior, ni contenido ficticio.
    expect(carouselIds())?.toHaveLength(0);
    expect(screen.getByText(EMPTY_MESSAGE))?.toBeInTheDocument();
    assertNoFictitiousContent(container);

    deferredB.resolve({ data: [{ id: 'b1' }], error: null });
    await waitFor(() => expect(carouselIds())?.toEqual(['b1']));
  });

  it('B vacío deja la lista vacía (no conserva los clasificados de A)', async () => {
    mockGetRecent.mockResolvedValueOnce({ data: [{ id: 'a1' }], error: null });
    const { rerender } = render(<RecentClassifiedAds />);
    await waitFor(() => expect(carouselIds())?.toEqual(['a1']));

    mockGetRecent.mockResolvedValueOnce({ data: [], error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentClassifiedAds />);

    await waitFor(() => expect(mockGetRecent)?.toHaveBeenCalledTimes(2));
    expect(carouselIds())?.toHaveLength(0);
    expect(screen.getByText(EMPTY_MESSAGE))?.toBeInTheDocument();
  });

  it('B con error deja la lista vacía (no conserva los clasificados de A)', async () => {
    mockGetRecent.mockResolvedValueOnce({ data: [{ id: 'a1' }], error: null });
    const { rerender } = render(<RecentClassifiedAds />);
    await waitFor(() => expect(carouselIds())?.toEqual(['a1']));

    mockGetRecent.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentClassifiedAds />);

    await waitFor(() => expect(mockGetRecent)?.toHaveBeenCalledTimes(2));
    expect(carouselIds())?.toHaveLength(0);
    expect(screen.getByText(EMPTY_MESSAGE))?.toBeInTheDocument();
  });

  it('una respuesta tardía de la ciudad anterior (ya cancelada) no sobrescribe la ciudad vigente', async () => {
    const deferredA = createDeferred();
    mockGetRecent.mockReturnValueOnce(deferredA.promise);
    const { rerender } = render(<RecentClassifiedAds />);
    await waitFor(() => expect(mockGetRecent)?.toHaveBeenCalledTimes(1));

    const deferredB = createDeferred();
    mockGetRecent.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentClassifiedAds />);
    await waitFor(() => expect(mockGetRecent)?.toHaveBeenCalledTimes(2));

    // La ciudad vigente (B) resuelve primero.
    deferredB.resolve({ data: [{ id: 'b1' }], error: null });
    await waitFor(() => expect(carouselIds())?.toEqual(['b1']));

    // La respuesta de la ciudad anterior (A), ya cancelada, llega después.
    deferredA.resolve({ data: [{ id: 'a1' }], error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(carouselIds())?.toEqual(['b1']);
  });

  it('si B tiene datos, reemplaza completamente los de A (no se mezclan)', async () => {
    mockGetRecent.mockResolvedValueOnce({ data: [{ id: 'a1' }], error: null });
    const { rerender } = render(<RecentClassifiedAds />);
    await waitFor(() => expect(carouselIds())?.toEqual(['a1']));

    mockGetRecent.mockResolvedValueOnce({ data: [{ id: 'b1' }, { id: 'b2' }], error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentClassifiedAds />);

    await waitFor(() => expect(carouselIds())?.toEqual(['b1', 'b2']));
    expect(carouselIds())?.not?.toContain('a1');
  });

  it('un re-render sin cambio de ciudad no dispara una consulta adicional', async () => {
    mockGetRecent.mockResolvedValue({ data: [{ id: 'a1' }], error: null });
    const { rerender } = render(<RecentClassifiedAds />);
    await waitFor(() => expect(mockGetRecent)?.toHaveBeenCalledTimes(1));

    rerender(<RecentClassifiedAds />);

    expect(mockGetRecent)?.toHaveBeenCalledTimes(1);
  });

  it('un cambio real de ciudad produce exactamente una carga adicional', async () => {
    mockGetRecent.mockResolvedValue({ data: [{ id: 'a1' }], error: null });
    const { rerender } = render(<RecentClassifiedAds />);
    await waitFor(() => expect(mockGetRecent)?.toHaveBeenCalledTimes(1));

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentClassifiedAds />);

    await waitFor(() => expect(mockGetRecent)?.toHaveBeenCalledTimes(2));
  });

  it('el mensaje de estado vacío aparece cuando no hay clasificados, y desaparece cuando sí los hay', async () => {
    mockGetRecent.mockResolvedValueOnce({ data: [], error: null });
    const { rerender } = render(<RecentClassifiedAds />);
    await waitFor(() => expect(mockGetRecent)?.toHaveBeenCalledTimes(1));
    expect(screen.getByText(EMPTY_MESSAGE))?.toBeInTheDocument();

    mockGetRecent.mockResolvedValueOnce({ data: [{ id: 'a1' }], error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentClassifiedAds />);

    await waitFor(() => expect(carouselIds())?.toEqual(['a1']));
    expect(screen.queryByText(EMPTY_MESSAGE))?.not?.toBeInTheDocument();
  });

  it('no aparece ningún contenido de FALLBACK_ADS (Toyota Corolla, iPhone 13 Pro, u otro) en ningún escenario', async () => {
    mockGetRecent.mockResolvedValue({ data: [], error: null });

    const { container } = render(<RecentClassifiedAds />);

    await waitFor(() => expect(mockGetRecent)?.toHaveBeenCalled());
    assertNoFictitiousContent(container);
  });

  it('conserva la navegación al listado completo de clasificados', async () => {
    mockGetRecent.mockResolvedValue({ data: [], error: null });

    render(<RecentClassifiedAds />);

    await waitFor(() => expect(mockGetRecent)?.toHaveBeenCalled());
    expect(screen.getByText('Ver todos los clasificados').closest('a')).toHaveAttribute(
      'href',
      '/classified-ads-listing'
    );
  });
});
