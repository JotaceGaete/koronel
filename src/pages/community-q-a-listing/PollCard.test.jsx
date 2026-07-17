import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PollCard from './components/PollCard';

vi.mock('../../services/communityService', () => ({
  communityService: {
    isPollClosed: vi.fn(),
  },
}));

import { communityService } from '../../services/communityService';

const basePost = {
  id: 'post-1',
  title: '¿Quién gana Argentina o España?',
  poll: {
    id: 'poll-1',
    closes_at: null,
    status: 'open',
    options: [
      { id: 'opt-1', label: 'Argentina', position: 0, vote_count: 41 },
      { id: 'opt-2', label: 'España', position: 1, vote_count: 22 },
      { id: 'opt-3', label: 'Empate', position: 2, vote_count: 8 },
    ],
  },
};

function renderCard(props) {
  return render(
    <MemoryRouter>
      <PollCard post={basePost} {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  communityService?.isPollClosed?.mockReturnValue(false);
});

describe('PollCard (listing teaser)', () => {
  it('shows the "Encuesta" badge, title, total vote count and "Abierta" — never the options or a vote control', () => {
    renderCard();
    expect(screen.getByText('Encuesta'))?.toBeInTheDocument();
    expect(screen.getByText(basePost?.title))?.toBeInTheDocument();
    expect(screen.getByText('71 votos'))?.toBeInTheDocument();
    expect(screen.getByText('Abierta'))?.toBeInTheDocument();
    expect(screen.queryByText('Argentina'))?.not?.toBeInTheDocument();
    expect(screen.queryByRole('button'))?.not?.toBeInTheDocument();
  });

  it('the whole card links to the poll detail page, with a "Ver encuesta" affordance', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link)?.toHaveAttribute('href', '/comunidad/post-1');
    expect(screen.getByText('Ver encuesta'))?.toBeInTheDocument();
  });

  it('shows "Finalizada" instead of "Abierta", and hides the countdown, when the poll is closed', () => {
    communityService?.isPollClosed?.mockReturnValue(true);
    renderCard();
    expect(screen.getByText('Finalizada'))?.toBeInTheDocument();
    expect(screen.queryByText('Abierta'))?.not?.toBeInTheDocument();
    expect(screen.queryByText(/Cierra/))?.not?.toBeInTheDocument();
  });

  it('shows a closing countdown while open, when the poll has a closes_at', () => {
    const soon = new Date(Date.now() + 2 * 86400000)?.toISOString();
    renderCard({ post: { ...basePost, poll: { ...basePost.poll, closes_at: soon } } });
    expect(screen.getByText(/Cierra en 2 días/))?.toBeInTheDocument();
  });

  it('renders a singular vote count correctly', () => {
    renderCard({
      post: {
        ...basePost,
        poll: { ...basePost.poll, options: [{ id: 'opt-1', label: 'Argentina', vote_count: 1 }] },
      },
    });
    expect(screen.getByText('1 voto'))?.toBeInTheDocument();
  });
});
