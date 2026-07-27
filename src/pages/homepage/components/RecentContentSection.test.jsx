import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetAll, mockGetRecent } = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockGetRecent: vi.fn(),
}));
vi.mock('../../../services/businessService', () => ({
  businessService: {
    getAll: mockGetAll,
    getImageUrl: (p) => p,
  },
}));
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
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('components/AppImage', () => ({ default: () => null }));

import RecentContentSection from './RecentContentSection';

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function business(id, createdAt) {
  return { id, name: `Negocio ${id}`, created_at: createdAt };
}

function ad(id, createdAt) {
  return { id, title: `Aviso ${id}`, created_at: createdAt };
}

// El feed renderiza cada item como una tarjeta con un <h3> cuyo texto es
// exactamente item.title — se usa como huella de identidad y de orden sin
// depender de mockear los sub-componentes de tarjeta (definidos en el mismo
// archivo, no son módulos separados).
function feedTitles() {
  return screen.queryAllByRole('heading', { level: 3 })?.map((el) => el.textContent);
}

beforeEach(() => {
  mockGetAll.mockReset();
  mockGetRecent.mockReset();
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('RecentContentSection — filtrado por communityCityId (Fase 4)', () => {
  it('ambas fuentes (negocios y clasificados) reciben la misma communityCityId', async () => {
    mockGetAll.mockResolvedValue({ data: [business('b1', '2026-01-02')], error: null });
    mockGetRecent.mockResolvedValue({ data: [ad('a1', '2026-01-01')], error: null });

    render(<RecentContentSection />);

    await waitFor(() => expect(feedTitles())?.toHaveLength(2));
    expect(mockGetAll).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'newest', page: 1, pageSize: 8, communityCityId: 'city-a' })
    );
    expect(mockGetRecent).toHaveBeenCalledWith({ limit: 8, communityCityId: 'city-a' });
  });

  it('el orden, la mezcla y el truncado se mantienen: combina negocios y avisos y ordena por created_at descendente', async () => {
    mockGetAll.mockResolvedValue({
      data: [business('b1', '2026-01-01T00:00:00Z'), business('b2', '2026-01-03T00:00:00Z')],
      error: null,
    });
    mockGetRecent.mockResolvedValue({ data: [ad('a1', '2026-01-02T00:00:00Z')], error: null });

    render(<RecentContentSection />);

    await waitFor(() => expect(feedTitles())?.toHaveLength(3));
    expect(feedTitles()).toEqual(['Negocio b2', 'Aviso a1', 'Negocio b1']);
  });

  it('un cambio de ciudad limpia de inmediato el feed anterior, antes de que resuelvan las nuevas consultas', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [business('a1', '2026-01-01')], error: null });
    mockGetRecent.mockResolvedValueOnce({ data: [], error: null });

    const { rerender } = render(<RecentContentSection />);
    await waitFor(() => expect(feedTitles())?.toEqual(['Negocio a1']));

    const deferredGetAllB = createDeferred();
    const deferredGetRecentB = createDeferred();
    mockGetAll.mockReturnValueOnce(deferredGetAllB.promise);
    mockGetRecent.mockReturnValueOnce(deferredGetRecentB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentContentSection />);

    // Antes de resolver cualquier consulta de la ciudad nueva, ya no debe
    // verse el feed de la ciudad anterior.
    expect(feedTitles())?.toHaveLength(0);

    deferredGetAllB.resolve({ data: [business('b1', '2026-02-01')], error: null });
    deferredGetRecentB.resolve({ data: [], error: null });

    await waitFor(() => expect(feedTitles())?.toEqual(['Negocio b1']));
  });

  it('B con datos reemplaza completamente el feed de A (no se mezclan)', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [business('a1', '2026-01-01')], error: null });
    mockGetRecent.mockResolvedValueOnce({ data: [], error: null });

    const { rerender } = render(<RecentContentSection />);
    await waitFor(() => expect(feedTitles())?.toEqual(['Negocio a1']));

    mockGetAll.mockResolvedValueOnce({ data: [business('b1', '2026-02-01')], error: null });
    mockGetRecent.mockResolvedValueOnce({ data: [ad('b2', '2026-02-02')], error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentContentSection />);

    await waitFor(() => expect(feedTitles())?.toEqual(['Aviso b2', 'Negocio b1']));
    expect(feedTitles())?.not?.toContain('Negocio a1');
  });

  it('vacío/error en ambas fuentes de la ciudad nueva no conserva el feed de la ciudad anterior', async () => {
    mockGetAll.mockResolvedValueOnce({ data: [business('a1', '2026-01-01')], error: null });
    mockGetRecent.mockResolvedValueOnce({ data: [], error: null });

    const { rerender } = render(<RecentContentSection />);
    await waitFor(() => expect(feedTitles())?.toEqual(['Negocio a1']));

    mockGetAll.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    mockGetRecent.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentContentSection />);

    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(2));
    expect(feedTitles())?.toHaveLength(0);
  });

  it('una respuesta tardía de la ciudad anterior (ya cancelada) no sobrescribe el feed de la ciudad vigente', async () => {
    const deferredGetAllA = createDeferred();
    const deferredGetRecentA = createDeferred();
    mockGetAll.mockReturnValueOnce(deferredGetAllA.promise);
    mockGetRecent.mockReturnValueOnce(deferredGetRecentA.promise);

    const { rerender } = render(<RecentContentSection />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    const deferredGetAllB = createDeferred();
    const deferredGetRecentB = createDeferred();
    mockGetAll.mockReturnValueOnce(deferredGetAllB.promise);
    mockGetRecent.mockReturnValueOnce(deferredGetRecentB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentContentSection />);

    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(2));

    // La ciudad vigente (B) resuelve primero.
    deferredGetAllB.resolve({ data: [business('b1', '2026-02-01')], error: null });
    deferredGetRecentB.resolve({ data: [], error: null });
    await waitFor(() => expect(feedTitles())?.toEqual(['Negocio b1']));

    // La respuesta de la ciudad anterior (A), ya cancelada, llega después.
    deferredGetAllA.resolve({ data: [business('a1', '2026-01-01')], error: null });
    deferredGetRecentA.resolve({ data: [], error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(feedTitles())?.toEqual(['Negocio b1']);
  });

  it('un cambio real de ciudad produce exactamente una secuencia adicional de Promise.all', async () => {
    mockGetAll.mockResolvedValue({ data: [business('a1', '2026-01-01')], error: null });
    mockGetRecent.mockResolvedValue({ data: [], error: null });

    const { rerender } = render(<RecentContentSection />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));
    expect(mockGetRecent)?.toHaveBeenCalledTimes(1);

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<RecentContentSection />);

    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(2));
    expect(mockGetRecent)?.toHaveBeenCalledTimes(2);
  });

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockGetAll.mockResolvedValue({ data: [business('a1', '2026-01-01')], error: null });
    mockGetRecent.mockResolvedValue({ data: [], error: null });

    const { rerender } = render(<RecentContentSection />);
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledTimes(1));

    rerender(<RecentContentSection />);

    expect(mockGetAll)?.toHaveBeenCalledTimes(1);
    expect(mockGetRecent)?.toHaveBeenCalledTimes(1);
  });
});
