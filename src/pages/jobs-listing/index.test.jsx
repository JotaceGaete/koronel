import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { mockGetPublished } = vi.hoisted(() => ({ mockGetPublished: vi.fn() }));
vi.mock('../../services/jobService', () => ({
  jobService: { getPublished: mockGetPublished },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../contexts/CityContext', () => ({ useCity: mockUseCity }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/empleos', search: '' }),
}));

vi.mock('components/PageMeta', () => ({ default: () => null }));
vi.mock('components/ui/Header', () => ({ default: () => null }));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('components/ui/Button', () => ({ default: ({ children, ...props }) => <button {...props}>{children}</button> }));
vi.mock('./components/JobCard', () => ({
  default: ({ job }) => <div data-testid="job-card">{job?.id}</div>,
}));
vi.mock('./components/JobFilters', () => ({ default: () => null }));
vi.mock('./components/JobsEmptyState', () => ({
  default: () => <div data-testid="empty-state">No hay empleos disponibles</div>,
}));

import JobsListing from './index';

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function job(id) {
  return { id, title: `Empleo ${id}` };
}

function jobIds() {
  return screen.queryAllByTestId('job-card')?.map((el) => el.textContent);
}

beforeEach(() => {
  mockGetPublished.mockReset();
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('JobsListing — filtrado por communityCityId (Fase 4 / B4)', () => {
  it('envía la ciudad vigente a jobService.getPublished junto con página 1 por defecto', async () => {
    mockGetPublished.mockResolvedValue({ data: [job('a1')], count: 1, error: null });

    render(<JobsListing />);

    await waitFor(() => expect(jobIds())?.toEqual(['a1']));
    expect(mockGetPublished).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 12, communityCityId: 'city-a' })
    );
  });

  it('un cambio de ciudad limpia de inmediato los empleos anteriores, antes de que resuelva la ciudad nueva', async () => {
    mockGetPublished.mockResolvedValueOnce({ data: [job('a1')], count: 1, error: null });
    const { rerender } = render(<JobsListing />);
    await waitFor(() => expect(jobIds())?.toEqual(['a1']));

    const deferredB = createDeferred();
    mockGetPublished.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<JobsListing />);

    expect(jobIds())?.toHaveLength(0);

    deferredB.resolve({ data: [job('b1')], count: 1, error: null });
    await waitFor(() => expect(jobIds())?.toEqual(['b1']));
  });

  it('un cambio de ciudad reinicia la paginación a la página 1', async () => {
    mockGetPublished.mockResolvedValue({ data: Array.from({ length: 12 }, (_, i) => job(`a${i}`)), count: 30, error: null });
    const { rerender } = render(<JobsListing />);
    await waitFor(() => expect(jobIds())?.toHaveLength(12));

    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() =>
      expect(mockGetPublished)?.toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    );

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<JobsListing />);

    await waitFor(() =>
      expect(mockGetPublished)?.toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, communityCityId: 'city-b' })
      )
    );
  });

  it('la ciudad nueva reemplaza por completo los empleos de la ciudad anterior (no se mezclan)', async () => {
    mockGetPublished.mockResolvedValueOnce({ data: [job('a1')], count: 1, error: null });
    const { rerender } = render(<JobsListing />);
    await waitFor(() => expect(jobIds())?.toEqual(['a1']));

    mockGetPublished.mockResolvedValueOnce({ data: [job('b1'), job('b2')], count: 2, error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<JobsListing />);

    await waitFor(() => expect(jobIds())?.toEqual(['b1', 'b2']));
    expect(jobIds())?.not?.toContain('a1');
  });

  it('vacío/error en la ciudad nueva no conserva los empleos de la ciudad anterior', async () => {
    mockGetPublished.mockResolvedValueOnce({ data: [job('a1')], count: 1, error: null });
    const { rerender } = render(<JobsListing />);
    await waitFor(() => expect(jobIds())?.toEqual(['a1']));

    mockGetPublished.mockResolvedValueOnce({ data: [], count: 0, error: new Error('fail') });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<JobsListing />);

    await waitFor(() => expect(mockGetPublished)?.toHaveBeenCalledTimes(2));
    expect(jobIds())?.toHaveLength(0);
  });

  it('una respuesta tardía de la ciudad anterior (ya obsoleta) no sobrescribe los empleos de la ciudad vigente', async () => {
    const deferredA = createDeferred();
    mockGetPublished.mockReturnValueOnce(deferredA.promise);
    const { rerender } = render(<JobsListing />);
    await waitFor(() => expect(mockGetPublished)?.toHaveBeenCalledTimes(1));

    const deferredB = createDeferred();
    mockGetPublished.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<JobsListing />);
    await waitFor(() => expect(mockGetPublished)?.toHaveBeenCalledTimes(2));

    deferredB.resolve({ data: [job('b1')], count: 1, error: null });
    await waitFor(() => expect(jobIds())?.toEqual(['b1']));

    deferredA.resolve({ data: [job('a1')], count: 1, error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(jobIds())?.toEqual(['b1']);
  });

  it('un cambio real de ciudad produce exactamente una carga adicional', async () => {
    mockGetPublished.mockResolvedValue({ data: [job('a1')], count: 1, error: null });
    const { rerender } = render(<JobsListing />);
    await waitFor(() => expect(mockGetPublished)?.toHaveBeenCalledTimes(1));

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<JobsListing />);

    await waitFor(() => expect(mockGetPublished)?.toHaveBeenCalledTimes(2));
  });

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockGetPublished.mockResolvedValue({ data: [job('a1')], count: 1, error: null });
    const { rerender } = render(<JobsListing />);
    await waitFor(() => expect(mockGetPublished)?.toHaveBeenCalledTimes(1));

    rerender(<JobsListing />);

    expect(mockGetPublished)?.toHaveBeenCalledTimes(1);
  });

  it('la búsqueda sigue funcionando dentro de la misma ciudad', async () => {
    mockGetPublished.mockResolvedValue({ data: [job('a1')], count: 1, error: null });
    render(<JobsListing />);
    await waitFor(() => expect(mockGetPublished)?.toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('Busca por cargo, empresa o ubicación...'), {
      target: { value: 'diseñador' },
    });
    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() =>
      expect(mockGetPublished)?.toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'diseñador', communityCityId: 'city-a', page: 1 })
      )
    );
  });
});
