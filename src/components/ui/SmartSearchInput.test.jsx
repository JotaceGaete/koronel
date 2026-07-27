import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockSearchSuggestions } = vi.hoisted(() => ({ mockSearchSuggestions: vi.fn() }));
vi.mock('../../services/businessService', () => ({
  businessService: { searchSuggestions: mockSearchSuggestions },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../contexts/CityContext', () => ({ useCity: mockUseCity }));

import SmartSearchInput from './SmartSearchInput';

function renderInput(props = {}) {
  return render(
    <MemoryRouter>
      <SmartSearchInput {...props} />
    </MemoryRouter>
  );
}

const getInput = () => screen.getByRole('searchbox', { name: /buscar negocios/i });

beforeEach(() => {
  mockSearchSuggestions.mockReset();
  mockSearchSuggestions.mockResolvedValue({ businesses: [], categories: [] });
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('SmartSearchInput — paso de communityCityId a businessService.searchSuggestions (Fase 4)', () => {
  it('pasa communityCityId (leído de useCity) como tercer argumento a searchSuggestions', async () => {
    renderInput();
    fireEvent.change(getInput(), { target: { value: 'pizza' } });

    await waitFor(() =>
      expect(mockSearchSuggestions).toHaveBeenCalledWith('pizza', 6, 'city-a')
    );
    expect(mockSearchSuggestions).toHaveBeenCalledTimes(1);
  });

  it('un cambio de ciudad no dispara una búsqueda adicional por sí solo (sin cambio de query)', async () => {
    const { rerender } = renderInput();
    fireEvent.change(getInput(), { target: { value: 'ab' } });
    await waitFor(() => expect(mockSearchSuggestions).toHaveBeenCalledTimes(1));

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(
      <MemoryRouter>
        <SmartSearchInput />
      </MemoryRouter>
    );

    // Sin cambio de query, no debería dispararse ninguna búsqueda nueva
    // solo porque useCity() haya devuelto un valor distinto.
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockSearchSuggestions).toHaveBeenCalledTimes(1);
  });

  it('la siguiente búsqueda tras un cambio de ciudad usa el communityCityId nuevo, no uno obsoleto (sin llamadas extra)', async () => {
    renderInput();
    const input = getInput();

    fireEvent.change(input, { target: { value: 'ab' } });
    await waitFor(() =>
      expect(mockSearchSuggestions).toHaveBeenCalledWith('ab', 6, 'city-a')
    );

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    fireEvent.change(input, { target: { value: 'abc' } });

    await waitFor(() =>
      expect(mockSearchSuggestions).toHaveBeenLastCalledWith('abc', 6, 'city-b')
    );
    expect(mockSearchSuggestions).toHaveBeenCalledTimes(2);
  });

  it('con communityCityId null (useCity sin ciudad resuelta todavía), igual busca — pasando null explícito, sin lanzar', async () => {
    mockUseCity.mockReturnValue({ communityCityId: null });
    renderInput();
    fireEvent.change(getInput(), { target: { value: 'ab' } });

    await waitFor(() =>
      expect(mockSearchSuggestions).toHaveBeenCalledWith('ab', 6, null)
    );
  });
});
