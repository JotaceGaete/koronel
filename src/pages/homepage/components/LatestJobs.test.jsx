import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetLatest } = vi.hoisted(() => ({ mockGetLatest: vi.fn() }));
vi.mock('../../../services/jobService', () => ({
  jobService: {
    getLatest: mockGetLatest,
    formatSalary: () => null,
  },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../../contexts/CityContext', () => ({ useCity: mockUseCity }));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('components/ui/Button', () => ({ default: ({ children }) => <button>{children}</button> }));

import LatestJobs from './LatestJobs';

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function job(id) {
  return { id, title: `Empleo ${id}`, company: 'Empresa', modality: 'Presencial', location: 'Coronel' };
}

function jobTitles() {
  return screen.queryAllByRole('heading', { level: 3 })?.map((el) => el.textContent);
}

beforeEach(() => {
  mockGetLatest.mockReset();
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('LatestJobs — filtrado por communityCityId (Fase 4 / B4)', () => {
  it('envía la ciudad vigente a jobService.getLatest', async () => {
    mockGetLatest.mockResolvedValue({ data: [job('a1')], error: null });

    render(<LatestJobs />);

    await waitFor(() => expect(jobTitles())?.toEqual(['Empleo a1']));
    expect(mockGetLatest).toHaveBeenCalledWith({ limit: 4, communityCityId: 'city-a' });
  });

  it('sin empleos recientes (data vacía real): no renderiza contenido, no muestra empleos ficticios', async () => {
    mockGetLatest.mockResolvedValue({ data: [], error: null });

    const { container } = render(<LatestJobs />);

    await waitFor(() => expect(mockGetLatest)?.toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('con error: no renderiza contenido, no conserva empleos ficticios', async () => {
    mockGetLatest.mockResolvedValue({ data: null, error: new Error('fail') });

    const { container } = render(<LatestJobs />);

    await waitFor(() => expect(mockGetLatest)?.toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('un cambio de ciudad limpia de inmediato los empleos anteriores, antes de que resuelva la ciudad nueva', async () => {
    mockGetLatest.mockResolvedValueOnce({ data: [job('a1')], error: null });
    const { rerender } = render(<LatestJobs />);
    await waitFor(() => expect(jobTitles())?.toEqual(['Empleo a1']));

    const deferredB = createDeferred();
    mockGetLatest.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<LatestJobs />);

    // Antes de resolver la consulta de la ciudad nueva, ya no debe verse el
    // empleo de la ciudad anterior.
    expect(jobTitles())?.toHaveLength(0);

    deferredB.resolve({ data: [job('b1')], error: null });
    await waitFor(() => expect(jobTitles())?.toEqual(['Empleo b1']));
  });

  it('la ciudad nueva reemplaza por completo a la anterior (no se mezclan)', async () => {
    mockGetLatest.mockResolvedValueOnce({ data: [job('a1')], error: null });
    const { rerender } = render(<LatestJobs />);
    await waitFor(() => expect(jobTitles())?.toEqual(['Empleo a1']));

    mockGetLatest.mockResolvedValueOnce({ data: [job('b1'), job('b2')], error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<LatestJobs />);

    await waitFor(() => expect(jobTitles())?.toEqual(['Empleo b1', 'Empleo b2']));
    expect(jobTitles())?.not?.toContain('Empleo a1');
  });

  it('una respuesta tardía de la ciudad anterior (ya cancelada) no sobrescribe los empleos de la ciudad vigente', async () => {
    const deferredA = createDeferred();
    mockGetLatest.mockReturnValueOnce(deferredA.promise);
    const { rerender } = render(<LatestJobs />);
    await waitFor(() => expect(mockGetLatest)?.toHaveBeenCalledTimes(1));

    const deferredB = createDeferred();
    mockGetLatest.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<LatestJobs />);
    await waitFor(() => expect(mockGetLatest)?.toHaveBeenCalledTimes(2));

    // La ciudad vigente (B) resuelve primero.
    deferredB.resolve({ data: [job('b1')], error: null });
    await waitFor(() => expect(jobTitles())?.toEqual(['Empleo b1']));

    // La respuesta de la ciudad anterior (A), ya cancelada, llega después.
    deferredA.resolve({ data: [job('a1')], error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(jobTitles())?.toEqual(['Empleo b1']);
  });

  it('un cambio real de ciudad produce exactamente una carga adicional', async () => {
    mockGetLatest.mockResolvedValue({ data: [job('a1')], error: null });
    const { rerender } = render(<LatestJobs />);
    await waitFor(() => expect(mockGetLatest)?.toHaveBeenCalledTimes(1));

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<LatestJobs />);

    await waitFor(() => expect(mockGetLatest)?.toHaveBeenCalledTimes(2));
  });

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockGetLatest.mockResolvedValue({ data: [job('a1')], error: null });
    const { rerender } = render(<LatestJobs />);
    await waitFor(() => expect(mockGetLatest)?.toHaveBeenCalledTimes(1));

    rerender(<LatestJobs />);

    expect(mockGetLatest)?.toHaveBeenCalledTimes(1);
  });

  it('conserva la navegación a "Ver todos"', async () => {
    mockGetLatest.mockResolvedValue({ data: [job('a1')], error: null });

    render(<LatestJobs />);

    await waitFor(() => expect(jobTitles())?.toEqual(['Empleo a1']));
    expect(screen.getByText('Ver todos').closest('a'))?.toHaveAttribute('href', '/empleos');
  });
});
