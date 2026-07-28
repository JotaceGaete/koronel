import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { mockGetAll, mockFormatAd } = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockFormatAd: vi.fn((ad) => ad),
}));
vi.mock('../../services/adService', () => ({
  adService: { getAll: mockGetAll, formatAd: mockFormatAd },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../contexts/CityContext', () => ({ useCity: mockUseCity }));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/clasificados', search: '' }),
}));

vi.mock('components/PageMeta', () => ({ default: () => null }));
vi.mock('components/ui/Header', () => ({ default: () => null }));
vi.mock('components/ui/CategoryFilter', () => ({ default: () => null }));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('components/ui/Button', () => ({ default: ({ children, ...props }) => <button {...props}>{children}</button> }));
vi.mock('./components/AdCard', () => ({
  default: ({ ad }) => <div data-testid="ad-card">{ad?.id}</div>,
}));
vi.mock('./components/FilterPanel', () => ({ default: () => null }));
vi.mock('./components/SortBar', () => ({ default: () => null }));
vi.mock('./components/AdCardSkeleton', () => ({ default: () => <div data-testid="ad-skeleton" /> }));
vi.mock('./components/EmptyState', () => ({
  default: () => <div data-testid="empty-state">No se encontraron avisos</div>,
}));

import ClassifiedAdsListing from './index';

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function ad(id) {
  return { id, title: `Aviso ${id}` };
}

function adIds() {
  return screen.queryAllByTestId('ad-card')?.map((el) => el.textContent);
}

beforeEach(() => {
  mockGetAll.mockReset();
  mockFormatAd.mockReset();
  mockFormatAd.mockImplementation((a) => a);
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('ClassifiedAdsListing — filtrado por communityCityId (Fase 4 / B1)', () => {
  it('envía la ciudad vigente a adService.getAll junto con página 1 por defecto', async () => {
    mockGetAll.mockResolvedValue({ data: [ad('a1')], count: 1, error: null });

    render(<ClassifiedAdsListing />);

    await waitFor(() => expect(adIds())?.toEqual(['a1']));
    expect(mockGetAll)?.toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 8, communityCityId: 'city-a' })
    );
  });

  it('un cambio de ciudad limpia de inmediato los clasificados anteriores, antes de que resuelva la ciudad nueva', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [ad('a1')], count: 1, error: null });
    const { rerender } = render(<ClassifiedAdsListing />);
    await waitFor(() => expect(adIds())?.toEqual(['a1']));

    const deferredB = createDeferred();
    mockGetAll.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<ClassifiedAdsListing />);

    expect(adIds())?.toHaveLength(0);

    deferredB.resolve({ data: [ad('b1')], count: 1, error: null });
    await waitFor(() => expect(adIds())?.toEqual(['b1']));
  });

  it('un cambio de ciudad reinicia la paginación a la página 1', async () => {
    mockGetAll.mockResolvedValue({ data: [ad('a1')], count: 20, error: null });
    const { rerender } = render(<ClassifiedAdsListing />);
    await waitFor(() => expect(adIds())?.toEqual(['a1']));

    fireEvent.click(screen.getByText('Cargar más clasificados'));
    await waitFor(() =>
      expect(mockGetAll)?.toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    );

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<ClassifiedAdsListing />);

    await waitFor(() =>
      expect(mockGetAll)?.toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, communityCityId: 'city-b' })
      )
    );
  });

  it('la ciudad nueva reemplaza por completo los clasificados de la ciudad anterior (no se mezclan)', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [ad('a1')], count: 1, error: null });
    const { rerender } = render(<ClassifiedAdsListing />);
    await waitFor(() => expect(adIds())?.toEqual(['a1']));

    mockGetAll.mockResolvedValueOnce({ data: [ad('b1'), ad('b2')], count: 2, error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<ClassifiedAdsListing />);

    await waitFor(() => expect(adIds())?.toEqual(['b1', 'b2']));
    expect(adIds())?.not?.toContain('a1');
  });

  it('"Cargar más" sigue concatenando resultados dentro de la misma ciudad', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [ad('a1')], count: 2, error: null });
    render(<ClassifiedAdsListing />);
    await waitFor(() => expect(adIds())?.toEqual(['a1']));

    mockGetAll.mockResolvedValueOnce({ data: [ad('a2')], count: 2, error: null });
    fireEvent.click(screen.getByText('Cargar más clasificados'));

    await waitFor(() => expect(adIds())?.toEqual(['a1', 'a2']));
  });

  it('vacío/error en la ciudad nueva no conserva los clasificados de la ciudad anterior', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [ad('a1')], count: 1, error: null });
    const { rerender } = render(<ClassifiedAdsListing />);
    await waitFor(() => expect(adIds())?.toEqual(['a1']));

    mockGetAll.mockResolvedValueOnce({ data: [], count: 0, error: new Error('fail') });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<ClassifiedAdsListing />);

    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(2));
    expect(adIds())?.toHaveLength(0);
    expect(screen.getByTestId('empty-state'))?.toBeInTheDocument();
  });

  it('una respuesta tardía de la ciudad anterior (ya obsoleta) no sobrescribe los clasificados de la ciudad vigente', async () => {
    const deferredA = createDeferred();
    mockGetAll.mockReturnValueOnce(deferredA.promise);
    const { rerender } = render(<ClassifiedAdsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    const deferredB = createDeferred();
    mockGetAll.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<ClassifiedAdsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(2));

    deferredB.resolve({ data: [ad('b1')], count: 1, error: null });
    await waitFor(() => expect(adIds())?.toEqual(['b1']));

    deferredA.resolve({ data: [ad('a1')], count: 1, error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(adIds())?.toEqual(['b1']);
  });

  it('un cambio real de ciudad produce exactamente una carga adicional', async () => {
    mockGetAll.mockResolvedValue({ data: [ad('a1')], count: 1, error: null });
    const { rerender } = render(<ClassifiedAdsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<ClassifiedAdsListing />);

    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(2));
  });

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockGetAll.mockResolvedValue({ data: [ad('a1')], count: 1, error: null });
    const { rerender } = render(<ClassifiedAdsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    rerender(<ClassifiedAdsListing />);

    expect(mockGetAll)?.toHaveBeenCalledTimes(1);
  });

  it('la búsqueda sigue funcionando dentro de la misma ciudad', async () => {
    mockGetAll.mockResolvedValue({ data: [ad('a1')], count: 1, error: null });
    render(<ClassifiedAdsListing />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('Buscar clasificados...'), {
      target: { value: 'bicicleta' },
    });
    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() =>
      expect(mockGetAll)?.toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'bicicleta', communityCityId: 'city-a', page: 1 })
      )
    );
  });
});
