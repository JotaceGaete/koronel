import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockGetAll, mockGetHierarchicalCategories } = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockGetHierarchicalCategories: vi.fn(),
}));
vi.mock('../../services/businessService', () => ({
  businessService: {
    getAll: mockGetAll,
    getHierarchicalCategories: mockGetHierarchicalCategories,
    getImageUrl: (p) => p,
  },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../contexts/CityContext', () => ({ useCity: mockUseCity }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/business-directory-listing', search: '' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('components/PageMeta', () => ({ default: () => null }));
vi.mock('components/ui/Header', () => ({ default: () => null }));
vi.mock('components/ui/SmartSearchInput', () => ({ default: () => null }));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('./components/BusinessCard', () => ({
  default: ({ business }) => <div data-testid="business-card">{business?.id}</div>,
}));
vi.mock('./components/BusinessCardSkeleton', () => ({ default: () => null }));
vi.mock('./components/FilterPanel', () => ({ default: () => null }));
vi.mock('./components/ResultsHeader', () => ({ default: () => null }));

import BusinessDirectoryListing from './index';

beforeEach(() => {
  mockGetAll.mockReset();
  mockGetAll.mockResolvedValue({ data: [], count: 0, error: null });
  mockGetHierarchicalCategories.mockReset();
  mockGetHierarchicalCategories.mockResolvedValue({ data: [], flat: [] });
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('BusinessDirectoryListing — filtrado por communityCityId (Fase 4)', () => {
  it('pasa communityCityId (leído de useCity) a businessService.getAll', async () => {
    render(<BusinessDirectoryListing />);

    await waitFor(() =>
      expect(mockGetAll).toHaveBeenCalledWith(
        expect.objectContaining({ communityCityId: 'city-a', page: 1 })
      )
    );
  });

  it('"cargar más" concatena resultados de la misma ciudad, y un cambio de ciudad reinicia a página 1 y reemplaza (no concatena) usando el communityCityId nuevo', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [{ id: 'a1' }], count: 10, error: null });
    const { rerender } = render(<BusinessDirectoryListing />);

    await waitFor(() =>
      expect(screen.getAllByTestId('business-card')?.map((el) => el.textContent)).toEqual(['a1'])
    );
    expect(mockGetAll).toHaveBeenCalledTimes(1);

    // "Cargar más": debe concatenar dentro de la misma ciudad.
    mockGetAll.mockResolvedValueOnce({ data: [{ id: 'a2' }], count: 10, error: null });
    fireEvent.click(screen.getByText('Cargar más negocios'));

    await waitFor(() =>
      expect(screen.getAllByTestId('business-card')?.map((el) => el.textContent)?.sort()).toEqual(['a1', 'a2'])
    );
    expect(mockGetAll).toHaveBeenCalledTimes(2);
    expect(mockGetAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, communityCityId: 'city-a' }));

    // Cambio de ciudad: debe reiniciar a página 1, reemplazar (no
    // concatenar) los resultados, y usar el communityCityId nuevo — sin
    // llamadas extra más allá de esta única recarga.
    mockGetAll.mockResolvedValueOnce({ data: [{ id: 'b1' }], count: 3, error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<BusinessDirectoryListing />);

    await waitFor(() =>
      expect(screen.getAllByTestId('business-card')?.map((el) => el.textContent)).toEqual(['b1'])
    );
    expect(mockGetAll).toHaveBeenCalledTimes(3);
    expect(mockGetAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, communityCityId: 'city-b' })
    );
  });

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [{ id: 'a1' }], count: 1, error: null });
    const { rerender } = render(<BusinessDirectoryListing />);

    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));

    rerender(<BusinessDirectoryListing />);

    expect(mockGetAll).toHaveBeenCalledTimes(1);
  });
});
