import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

// ReplyForm (rendered below the question/poll on every state) imports the Supabase client
// directly rather than through communityService, so it needs its own mock here too.
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        ilike: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [] })) })),
      })),
    })),
  },
}));

vi.mock('../../services/communityService', () => ({
  communityService: {
    getPostById: vi.fn(),
    getRepliesByPostId: vi.fn(),
    getUserVotes: vi.fn(),
    getUserPollVote: vi.fn(),
    isPollClosed: vi.fn(),
    getQuestionImages: vi.fn(),
  },
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
import CommunityQuestionDetailPage from './index';

function renderAt(postId) {
  return render(
    <MemoryRouter initialEntries={[`/comunidad/${postId}`]}>
      <Routes>
        <Route path="/comunidad/:id" element={<CommunityQuestionDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  communityService?.getRepliesByPostId?.mockResolvedValue({ data: [] });
  communityService?.getUserVotes?.mockResolvedValue({ data: [] });
  communityService?.isPollClosed?.mockReturnValue(false);
  communityService?.getQuestionImages?.mockResolvedValue({ data: [] });
});

describe('CommunityQuestionDetailPage', () => {
  it('renders PollDetail (options + "Comentarios") for a post with a poll', async () => {
    communityService?.getPostById?.mockResolvedValue({
      data: {
        id: 'poll-post-1',
        title: '¿Dónde compras frutas y verduras?',
        body: '',
        sector: 'Centro',
        author: { full_name: 'María' },
        poll: {
          id: 'poll-1',
          closes_at: null,
          status: 'open',
          options: [
            { id: 'opt-1', label: 'Feria', position: 0, vote_count: 0 },
            { id: 'opt-2', label: 'Supermercado', position: 1, vote_count: 0 },
          ],
        },
      },
      error: null,
    });
    communityService?.getUserPollVote?.mockResolvedValue({ data: null });

    renderAt('poll-post-1');

    expect(await screen.findByText('Feria'))?.toBeInTheDocument();
    expect(screen.getByText('Encuesta'))?.toBeInTheDocument();
    expect(screen.getByText('0 Comentarios'))?.toBeInTheDocument();
    expect(communityService?.getUserPollVote)?.toHaveBeenCalledWith('user-1', 'poll-1');
  });

  it('renders the classic QuestionHeader ("Respuestas") for a post without a poll', async () => {
    communityService?.getPostById?.mockResolvedValue({
      data: {
        id: 'question-post-1',
        title: '¿Alguien conoce un buen mecánico?',
        body: 'Se me rompió el auto en el sector Centro.',
        sector: 'Centro',
        author: { full_name: 'Juan' },
        upvote_count: 0,
        poll: null,
      },
      error: null,
    });

    renderAt('question-post-1');

    expect(await screen.findByRole('heading', { name: '¿Alguien conoce un buen mecánico?' }))?.toBeInTheDocument();
    expect(screen.getByText('0 Respuestas'))?.toBeInTheDocument();
    expect(screen.queryByText('Encuesta'))?.not?.toBeInTheDocument();
    expect(communityService?.getUserPollVote)?.not?.toHaveBeenCalled();
  });
});
