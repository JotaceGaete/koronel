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

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/buscar', search: '' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('components/ui/Header', () => ({ default: () => null }));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('./components/SearchMapLeftPanel', () => ({
  default: ({ businesses, onSearchChange, onSelectParent }) => (
    <div>
      <div data-testid="business-list">
        {businesses?.map((b) => (
          <span key={b?.id} data-testid="business-item">{b?.id}</span>
        ))}
      </div>
      <button onClick={() => onSearchChange('pizza')}>trigger-search</button>
      <button onClick={() => onSelectParent('cat-1')}>trigger-category</button>
    </div>
  ),
}));
vi.mock('./components/SearchMapRightPanel', () => ({ default: () => null }));

import BusinessSearchMapPage from './index';

beforeEach(() => {
  mockGetAll.mockReset();
  mockGetAll.mockResolvedValue({ data: [], error: null });
  mockGetHierarchicalCategories.mockReset();
  mockGetHierarchicalCategories.mockResolvedValue({
    data: [{ id: 'cat-1', name_key: 'categoria-uno' }],
    flat: [],
  });
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

// Nota: este componente ya disparaba fetchBusinesses más de una vez al
// montar ANTES de este cambio — el efecto depende de `categoryTree`, y
// `loadCategories()` (efecto de montaje aparte) le asigna un array nuevo
// cuando resuelve, lo que por sí solo re-dispara el efecto aunque
// communityCityId/search/categoría no hayan cambiado. Es una condición
// preexistente, no introducida por este bloque — las pruebas verifican
// llamadas *adicionales* relativas a la carga inicial ya asentada, no un
// conteo absoluto de "una sola llamada al montar".
async function waitForInitialSettle() {
  await waitFor(() => expect(mockGetHierarchicalCategories).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(mockGetAll).toHaveBeenLastCalledWith(
    expect.objectContaining({ communityCityId: 'city-a' })
  ));
}

describe('BusinessSearchMapPage — filtrado por communityCityId (Fase 4)', () => {
  it('pasa communityCityId (leído de useCity) a businessService.getAll junto con page/pageSize existentes', async () => {
    render(<BusinessSearchMapPage />);
    await waitForInitialSettle();

    expect(mockGetAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 50, communityCityId: 'city-a' })
    );
  });

  it('un cambio de ciudad produce exactamente una recarga adicional con el identificador nuevo, y no quedan negocios de la ciudad anterior', async () => {
    mockGetAll.mockResolvedValue({ data: [{ id: 'a1' }], error: null });
    const { rerender } = render(<BusinessSearchMapPage />);
    await waitForInitialSettle();
    await waitFor(() =>
      expect(screen.getAllByTestId('business-item')?.map((el) => el.textContent)).toEqual(['a1'])
    );
    const callsBeforeCityChange = mockGetAll.mock.calls.length;

    mockGetAll.mockResolvedValueOnce({ data: [{ id: 'b1' }], error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<BusinessSearchMapPage />);

    await waitFor(() =>
      expect(screen.getAllByTestId('business-item')?.map((el) => el.textContent)).toEqual(['b1'])
    );
    // Exactamente una llamada adicional por el cambio de ciudad — ni cero
    // (no se perdió la reacción) ni más de una (no hay carga duplicada).
    expect(mockGetAll.mock.calls.length).toBe(callsBeforeCityChange + 1);
    expect(mockGetAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ communityCityId: 'city-b' })
    );
  });

  it('re-renderizar sin que communityCityId cambie no dispara ninguna carga adicional', async () => {
    const { rerender } = render(<BusinessSearchMapPage />);
    await waitForInitialSettle();
    const callsAfterSettle = mockGetAll.mock.calls.length;

    rerender(<BusinessSearchMapPage />);

    expect(mockGetAll.mock.calls.length).toBe(callsAfterSettle);
  });

  it('la búsqueda sigue funcionando: un cambio de búsqueda recarga con el término nuevo y el communityCityId vigente', async () => {
    render(<BusinessSearchMapPage />);
    await waitForInitialSettle();

    fireEvent.click(screen.getByText('trigger-search'));

    await waitFor(() =>
      expect(mockGetAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'pizza', communityCityId: 'city-a' })
      )
    );
  });

  it('la categoría sigue funcionando: seleccionar una categoría recarga con el filtro nuevo y el communityCityId vigente', async () => {
    render(<BusinessSearchMapPage />);
    await waitForInitialSettle();

    fireEvent.click(screen.getByText('trigger-category'));

    await waitFor(() =>
      expect(mockGetAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: 'categoria-uno', communityCityId: 'city-a' })
      )
    );
  });
});
