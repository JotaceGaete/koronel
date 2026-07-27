import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetFeatured, mockGetAll } = vi.hoisted(() => ({
  mockGetFeatured: vi.fn(),
  mockGetAll: vi.fn(),
}));
vi.mock('../../../services/businessService', () => ({
  businessService: {
    getFeatured: mockGetFeatured,
    getAll: mockGetAll,
    getImageUrl: (p) => p,
  },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../../contexts/CityContext', () => ({ useCity: mockUseCity }));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('components/ui/Button', () => ({ default: ({ children }) => <button>{children}</button> }));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('components/ui/FeaturedContentCarousel', () => ({
  default: ({ items }) => (
    <div data-testid="carousel">
      {items?.map((it) => (
        <span key={it?.id} data-testid="carousel-item">{it?.id}</span>
      ))}
    </div>
  ),
}));

import FeaturedBusinesses from './FeaturedBusinesses';

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  mockGetFeatured.mockReset();
  mockGetAll.mockReset();
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('FeaturedBusinesses — filtrado por communityCityId (Fase 4)', () => {
  it('ciudad A muestra sus negocios (destacados vacíos, fallback con datos)', async () => {
    mockGetFeatured.mockResolvedValue({ data: [], error: null });
    mockGetAll.mockResolvedValue({ data: [{ id: 'a1' }], error: null });

    render(<FeaturedBusinesses />);

    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['a1'])
    );
    expect(mockGetFeatured).toHaveBeenCalledWith({ limit: 6, communityCityId: 'city-a' });
    expect(mockGetAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 6, sort: 'newest', communityCityId: 'city-a' })
    );
  });

  it('getFeatured recibe communityCityId (Fase 4 / B2) — el aislamiento por ciudad ya no es exclusivo del fallback', async () => {
    mockGetFeatured.mockResolvedValue({ data: [{ id: 'f1' }], error: null });
    mockGetAll.mockResolvedValue({ data: [], error: null });

    render(<FeaturedBusinesses />);

    await waitFor(() => expect(mockGetFeatured).toHaveBeenCalled());
    expect(mockGetFeatured).toHaveBeenCalledWith({ limit: 6, communityCityId: 'city-a' });
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('si hay destacados válidos, se muestran esos y no se llama al fallback getAll (comportamiento intacto)', async () => {
    mockGetFeatured.mockResolvedValue({ data: [{ id: 'f1' }, { id: 'f2' }], error: null });
    mockGetAll.mockResolvedValue({ data: [], error: null });

    render(<FeaturedBusinesses />);

    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['f1', 'f2'])
    );
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('un cambio de ciudad limpia de inmediato los negocios anteriores, antes de que resuelva la ciudad nueva', async () => {
    mockGetFeatured.mockResolvedValue({ data: [], error: null });
    mockGetAll.mockResolvedValueOnce({ data: [{ id: 'a1' }], error: null });

    const { rerender } = render(<FeaturedBusinesses />);
    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['a1'])
    );

    const deferredGetAllB = createDeferred();
    mockGetAll.mockReturnValueOnce(deferredGetAllB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<FeaturedBusinesses />);

    // Antes de resolver cualquier consulta de la ciudad nueva, ya no deben
    // verse los negocios de la ciudad anterior.
    expect(screen.queryAllByTestId('carousel-item')).toHaveLength(0);

    deferredGetAllB.resolve({ data: [{ id: 'b1' }], error: null });
    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['b1'])
    );
  });

  it('la ciudad nueva sin destacados y sin resultados de fallback muestra el estado vacío (sin negocios de la ciudad anterior)', async () => {
    mockGetFeatured.mockResolvedValue({ data: [], error: null });
    mockGetAll.mockResolvedValueOnce({ data: [{ id: 'a1' }], error: null });

    const { rerender } = render(<FeaturedBusinesses />);
    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['a1'])
    );

    mockGetAll.mockResolvedValueOnce({ data: [], error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<FeaturedBusinesses />);

    await waitFor(() =>
      expect(
        screen.getByText('Aún no hay negocios destacados. Revisa el directorio completo.')
      ).toBeInTheDocument()
    );
    expect(screen.queryAllByTestId('carousel-item')).toHaveLength(0);
  });

  it('si ambas consultas de la ciudad nueva devuelven error, no se conservan los negocios de la ciudad anterior', async () => {
    mockGetFeatured.mockResolvedValue({ data: [], error: null });
    mockGetAll.mockResolvedValueOnce({ data: [{ id: 'a1' }], error: null });

    const { rerender } = render(<FeaturedBusinesses />);
    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['a1'])
    );

    mockGetFeatured.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    mockGetAll.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<FeaturedBusinesses />);

    await waitFor(() =>
      expect(
        screen.getByText('Aún no hay negocios destacados. Revisa el directorio completo.')
      ).toBeInTheDocument()
    );
    expect(screen.queryAllByTestId('carousel-item')).toHaveLength(0);
  });

  it('un cambio de ciudad reemplaza por completo los resultados del fallback (no los mezcla), con exactamente una carga adicional por consulta', async () => {
    mockGetFeatured.mockResolvedValue({ data: [], error: null });
    mockGetAll.mockResolvedValue({ data: [{ id: 'a1' }], error: null });
    const { rerender } = render(<FeaturedBusinesses />);

    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['a1'])
    );
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(mockGetFeatured).toHaveBeenCalledTimes(1);

    mockGetAll.mockResolvedValueOnce({ data: [{ id: 'b1' }], error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<FeaturedBusinesses />);

    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['b1'])
    );
    expect(mockGetAll).toHaveBeenCalledTimes(2);
    expect(mockGetFeatured).toHaveBeenCalledTimes(2);
    expect(mockGetAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ communityCityId: 'city-b' })
    );
  });

  it('una respuesta tardía de getAll de la ciudad anterior (ya cancelada) no sobrescribe los datos de la ciudad vigente', async () => {
    const deferredGetAllA = createDeferred();
    const deferredGetAllB = createDeferred();

    mockGetFeatured.mockResolvedValue({ data: [], error: null });
    mockGetAll.mockReturnValueOnce(deferredGetAllA.promise);

    const { rerender } = render(<FeaturedBusinesses />);
    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));
    expect(mockGetAll).toHaveBeenLastCalledWith(expect.objectContaining({ communityCityId: 'city-a' }));

    mockGetAll.mockReturnValueOnce(deferredGetAllB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<FeaturedBusinesses />);

    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(2));
    expect(mockGetAll).toHaveBeenLastCalledWith(expect.objectContaining({ communityCityId: 'city-b' }));

    // La ciudad vigente (B) resuelve primero.
    deferredGetAllB.resolve({ data: [{ id: 'b1' }], error: null });
    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['b1'])
    );

    // La respuesta de la ciudad anterior (A), ya cancelada, llega después.
    deferredGetAllA.resolve({ data: [{ id: 'a1' }], error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['b1']);
  });

  it('un cambio de ciudad reemplaza por completo los destacados de getFeatured (no los mezcla) cuando ambas ciudades tienen destacados propios', async () => {
    mockGetFeatured.mockResolvedValueOnce({ data: [{ id: 'f-a1' }], error: null });
    const { rerender } = render(<FeaturedBusinesses />);
    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['f-a1'])
    );
    expect(mockGetAll).not.toHaveBeenCalled();

    mockGetFeatured.mockResolvedValueOnce({ data: [{ id: 'f-b1' }], error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<FeaturedBusinesses />);

    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['f-b1'])
    );
    expect(mockGetFeatured).toHaveBeenLastCalledWith({ limit: 6, communityCityId: 'city-b' });
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('una respuesta tardía de getFeatured de la ciudad anterior (ya cancelada) no sobrescribe los destacados de la ciudad vigente', async () => {
    const deferredFeaturedA = createDeferred();
    mockGetFeatured.mockReturnValueOnce(deferredFeaturedA.promise);

    const { rerender } = render(<FeaturedBusinesses />);
    await waitFor(() => expect(mockGetFeatured).toHaveBeenCalledTimes(1));

    const deferredFeaturedB = createDeferred();
    mockGetFeatured.mockReturnValueOnce(deferredFeaturedB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<FeaturedBusinesses />);
    await waitFor(() => expect(mockGetFeatured).toHaveBeenCalledTimes(2));

    // La ciudad vigente (B) resuelve primero.
    deferredFeaturedB.resolve({ data: [{ id: 'f-b1' }], error: null });
    await waitFor(() =>
      expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['f-b1'])
    );

    // La respuesta de la ciudad anterior (A), ya cancelada, llega después.
    deferredFeaturedA.resolve({ data: [{ id: 'f-a1' }], error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getAllByTestId('carousel-item')?.map((el) => el.textContent)).toEqual(['f-b1']);
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockGetFeatured.mockResolvedValue({ data: [], error: null });
    mockGetAll.mockResolvedValue({ data: [{ id: 'a1' }], error: null });
    const { rerender } = render(<FeaturedBusinesses />);

    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));

    rerender(<FeaturedBusinesses />);

    expect(mockGetFeatured).toHaveBeenCalledTimes(1);
    expect(mockGetAll).toHaveBeenCalledTimes(1);
  });

  it('si getFeatured y el fallback getAll devuelven vacío/error, se conserva el estado vacío (sin destacados)', async () => {
    mockGetFeatured.mockResolvedValue({ data: [], error: null });
    mockGetAll.mockResolvedValue({ data: [], error: null });

    render(<FeaturedBusinesses />);

    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
    expect(
      await screen.findByText('Aún no hay negocios destacados. Revisa el directorio completo.')
    ).toBeInTheDocument();
  });

  it('conserva la navegación al directorio completo', async () => {
    mockGetFeatured.mockResolvedValue({ data: [], error: null });
    mockGetAll.mockResolvedValue({ data: [], error: null });

    render(<FeaturedBusinesses />);

    await waitFor(() => expect(mockGetAll).toHaveBeenCalled());
    expect(screen.getByText('Ver todos los negocios').closest('a')).toHaveAttribute(
      'href',
      '/business-directory-listing'
    );
  });
});
