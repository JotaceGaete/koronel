import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetPosts, mockGetPostsWithImages } = vi.hoisted(() => ({
  mockGetPosts: vi.fn(),
  mockGetPostsWithImages: vi.fn(),
}));
vi.mock('../../services/communityService', () => ({
  communityService: {
    getPosts: mockGetPosts,
    getPostsWithImages: mockGetPostsWithImages,
  },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../contexts/CityContext', () => ({ useCity: mockUseCity }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/community-q-a-listing', search: '' }),
}));

vi.mock('components/PageMeta', () => ({ default: () => null }));
vi.mock('components/ui/Header', () => ({ default: () => null }));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('components/ui/Button', () => ({ default: ({ children, ...props }) => <button {...props}>{children}</button> }));

import CommunityQAListing from './index';

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function post(id) {
  return { id, title: `Pregunta ${id}`, body: 'cuerpo', created_at: new Date()?.toISOString() };
}

// El estado vacío ("No hay preguntas aún") también es un <h3>, igual que el
// título de cada tarjeta — se excluye explícitamente para que esta huella
// solo represente preguntas reales renderizadas.
function postTitles() {
  return screen.queryAllByRole('heading', { level: 3 })
    ?.map((el) => el.textContent)
    ?.filter((t) => t !== 'No hay preguntas aún');
}

beforeEach(() => {
  mockGetPosts.mockReset();
  mockGetPostsWithImages.mockReset();
  mockGetPostsWithImages.mockResolvedValue({});
  mockUseCity.mockReturnValue({ communityCityId: 'city-a' });
});

describe('CommunityQAListing — filtrado por communityCityId (Fase 4 / B5)', () => {
  it('envía la ciudad vigente a communityService.getPosts junto con la página 1 por defecto', async () => {
    mockGetPosts.mockResolvedValue({ data: [post('a1')], count: 1, error: null });

    render(<CommunityQAListing />);

    await waitFor(() => expect(postTitles())?.toEqual(['Pregunta a1']));
    expect(mockGetPosts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 12, communityCityId: 'city-a' })
    );
  }, 10000);

  it('un cambio de ciudad limpia de inmediato las preguntas anteriores, antes de que resuelva la ciudad nueva', async () => {
    mockGetPosts.mockResolvedValueOnce({ data: [post('a1')], count: 1, error: null });
    const { rerender } = render(<CommunityQAListing />);
    await waitFor(() => expect(postTitles())?.toEqual(['Pregunta a1']));

    const deferredB = createDeferred();
    mockGetPosts.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<CommunityQAListing />);

    // Limpieza inmediata (efecto síncrono), antes de que corra el debounce
    // de 300ms y de que resuelva la consulta de la ciudad nueva.
    expect(postTitles())?.toHaveLength(0);

    deferredB.resolve({ data: [post('b1')], count: 1, error: null });
    await waitFor(() => expect(postTitles())?.toEqual(['Pregunta b1']));
  }, 10000);

  it('la ciudad nueva reemplaza por completo las preguntas de la ciudad anterior (no se mezclan)', async () => {
    mockGetPosts.mockResolvedValueOnce({ data: [post('a1')], count: 1, error: null });
    const { rerender } = render(<CommunityQAListing />);
    await waitFor(() => expect(postTitles())?.toEqual(['Pregunta a1']));

    mockGetPosts.mockResolvedValueOnce({ data: [post('b1'), post('b2')], count: 2, error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<CommunityQAListing />);

    await waitFor(() => expect(postTitles())?.toEqual(['Pregunta b1', 'Pregunta b2']));
    expect(postTitles())?.not?.toContain('Pregunta a1');
  }, 10000);

  it('vacío/error en la ciudad nueva no conserva las preguntas de la ciudad anterior', async () => {
    mockGetPosts.mockResolvedValueOnce({ data: [post('a1')], count: 1, error: null });
    const { rerender } = render(<CommunityQAListing />);
    await waitFor(() => expect(postTitles())?.toEqual(['Pregunta a1']));

    mockGetPosts.mockResolvedValueOnce({ data: [], count: 0, error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<CommunityQAListing />);

    await waitFor(() => expect(mockGetPosts)?.toHaveBeenCalledTimes(2));
    expect(postTitles())?.toHaveLength(0);
    expect(screen.getByText('No hay preguntas aún'))?.toBeInTheDocument();
  }, 10000);

  it('una respuesta tardía de la ciudad anterior (ya obsoleta) no sobrescribe las preguntas de la ciudad vigente', async () => {
    const deferredA = createDeferred();
    mockGetPosts.mockReturnValueOnce(deferredA.promise);
    const { rerender } = render(<CommunityQAListing />);
    await waitFor(() => expect(mockGetPosts)?.toHaveBeenCalledTimes(1));

    const deferredB = createDeferred();
    mockGetPosts.mockReturnValueOnce(deferredB.promise);
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<CommunityQAListing />);
    await waitFor(() => expect(mockGetPosts)?.toHaveBeenCalledTimes(2));

    deferredB.resolve({ data: [post('b1')], count: 1, error: null });
    await waitFor(() => expect(postTitles())?.toEqual(['Pregunta b1']));

    deferredA.resolve({ data: [post('a1')], count: 1, error: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(postTitles())?.toEqual(['Pregunta b1']);
  }, 10000);

  it('un cambio real de ciudad produce exactamente una carga adicional', async () => {
    mockGetPosts.mockResolvedValue({ data: [post('a1')], count: 1, error: null });
    const { rerender } = render(<CommunityQAListing />);
    await waitFor(() => expect(mockGetPosts)?.toHaveBeenCalledTimes(1));

    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<CommunityQAListing />);

    await waitFor(() => expect(mockGetPosts)?.toHaveBeenCalledTimes(2));
  }, 10000);

  it('re-renderizar sin que communityCityId cambie no dispara una carga adicional', async () => {
    mockGetPosts.mockResolvedValue({ data: [post('a1')], count: 1, error: null });
    const { rerender } = render(<CommunityQAListing />);
    await waitFor(() => expect(mockGetPosts)?.toHaveBeenCalledTimes(1));

    rerender(<CommunityQAListing />);

    expect(mockGetPosts)?.toHaveBeenCalledTimes(1);
  });

  it('el orden (sort) sigue funcionando dentro de la misma ciudad', async () => {
    mockGetPosts.mockResolvedValue({ data: [post('a1')], count: 1, error: null });
    render(<CommunityQAListing />);
    await waitFor(() => expect(mockGetPosts)?.toHaveBeenCalledTimes(1));

    screen.getByText('Más votados')?.click();

    await waitFor(
      () =>
        expect(mockGetPosts)?.toHaveBeenLastCalledWith(
          expect.objectContaining({ sort: 'votes', communityCityId: 'city-a' })
        ),
      { timeout: 3000 }
    );
  }, 10000);

  it('"cargar más" concatena resultados de la misma ciudad, y un cambio de ciudad reinicia a página 1 y reemplaza (no concatena) usando el communityCityId nuevo', async () => {
    mockGetPosts.mockResolvedValueOnce({ data: [post('a1')], count: 10, error: null });
    const { rerender } = render(<CommunityQAListing />);
    await waitFor(() => expect(postTitles())?.toEqual(['Pregunta a1']));

    mockGetPosts.mockResolvedValueOnce({ data: [post('a2')], count: 10, error: null });
    screen.getByText('Cargar más')?.click();

    await waitFor(() => expect(postTitles()?.sort())?.toEqual(['Pregunta a1', 'Pregunta a2']));
    expect(mockGetPosts)?.toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, communityCityId: 'city-a' }));

    mockGetPosts.mockResolvedValueOnce({ data: [post('b1')], count: 3, error: null });
    mockUseCity.mockReturnValue({ communityCityId: 'city-b' });
    rerender(<CommunityQAListing />);

    await waitFor(() => expect(postTitles())?.toEqual(['Pregunta b1']));
    expect(mockGetPosts)?.toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, communityCityId: 'city-b' })
    );
  }, 10000);
});
