import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../../services/communityService', () => ({
  communityService: {
    getPosts: vi.fn(),
    getPostsWithImages: vi.fn(),
    getUserPollVotesForPosts: vi.fn(),
  },
  COMMUNITY_CATEGORIES: [
    { key: 'services', label: 'Servicios y datos', chipLabel: 'Servicios' },
    { key: 'recommendations', label: 'Recomendaciones', chipLabel: 'Recomendaciones' },
    { key: 'security', label: 'Seguridad', chipLabel: 'Seguridad' },
    { key: 'community', label: 'Barrio y comunidad', chipLabel: 'Barrio' },
    { key: 'general', label: 'Consultas generales', chipLabel: 'Consultas' },
    { key: 'polls', label: 'Encuestas', chipLabel: 'Encuestas' },
  ],
  getCategoryLabel: (categoryKey) => ({
    services: 'Servicios y datos',
    recommendations: 'Recomendaciones',
    security: 'Seguridad',
    community: 'Barrio y comunidad',
    general: 'Consultas generales',
    polls: 'Encuestas',
  }?.[categoryKey] || 'Consultas generales'),
}));

import { communityService } from '../../services/communityService';
import CommunityQAListing from './index';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/comunidad']}>
      <CommunityQAListing />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  communityService?.getPostsWithImages?.mockResolvedValue({});
  communityService?.getUserPollVotesForPosts?.mockResolvedValue({ data: [] });
});

describe('CommunityQAListing category chips', () => {
  it('renders "Todas" plus the six category chips', async () => {
    communityService?.getPosts?.mockResolvedValue({ data: [], count: 0, error: null });
    renderPage();

    await screen.findByText('Aún no hay publicaciones');
    expect(screen.getByText('Todas'))?.toBeInTheDocument();
    expect(screen.getByText('Servicios'))?.toBeInTheDocument();
    expect(screen.getByText('Recomendaciones'))?.toBeInTheDocument();
    expect(screen.getByText('Seguridad'))?.toBeInTheDocument();
    expect(screen.getByText('Barrio'))?.toBeInTheDocument();
    expect(screen.getByText('Consultas'))?.toBeInTheDocument();
    expect(screen.getByText('Encuestas'))?.toBeInTheDocument();
  });

  it('clicking a chip re-queries communityService.getPosts with that categoryKey (filter from the query, not client-side)', async () => {
    communityService?.getPosts?.mockResolvedValue({ data: [], count: 0, error: null });
    renderPage();
    await screen.findByText('Aún no hay publicaciones');

    fireEvent.click(screen.getByText('Seguridad'));

    await vi.waitFor(() => {
      expect(communityService?.getPosts)?.toHaveBeenCalledWith(
        expect.objectContaining({ categoryKey: 'security' })
      );
    });
  });

  it('shows a discrete category label on a question card without a poll', async () => {
    communityService?.getPosts?.mockResolvedValue({
      data: [{
        id: 'post-1',
        title: '¿Alguien conoce un buen mecánico?',
        body: 'Se me rompió el auto.',
        sector: 'Centro',
        category_key: 'services',
        author: { full_name: 'Juan' },
        poll: null,
      }],
      count: 1,
      error: null,
    });

    renderPage();

    expect(await screen.findByText('Servicios y datos'))?.toBeInTheDocument();
  });
});
