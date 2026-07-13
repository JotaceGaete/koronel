import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PollCard from './components/PollCard';

vi.mock('../../services/communityService', () => ({
  communityService: {
    isPollClosed: vi.fn(),
    castPollVote: vi.fn(),
  },
}));

import { communityService } from '../../services/communityService';

const basePost = {
  id: 'post-1',
  title: '¿Dónde compras frutas y verduras?',
  body: '',
  reply_count: 3,
  author: { full_name: 'María' },
  poll: {
    id: 'poll-1',
    closes_at: null,
    status: 'open',
    options: [
      { id: 'opt-1', label: 'Feria', position: 0, vote_count: 12 },
      { id: 'opt-2', label: 'Supermercado', position: 1, vote_count: 8 },
    ],
  },
};

function renderCard(props) {
  return render(
    <MemoryRouter>
      <PollCard post={basePost} user={{ id: 'user-1' }} userVote={null} onVoted={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  communityService?.isPollClosed?.mockReturnValue(false);
});

describe('PollCard', () => {
  it('shows the options as clickable buttons when the user has not voted yet', () => {
    renderCard();
    expect(screen.getByText('Feria'))?.toBeInTheDocument();
    expect(screen.getByText('Supermercado'))?.toBeInTheDocument();
    expect(screen.queryByText(/Inicia sesión/))?.not?.toBeInTheDocument();
  });

  it('prompts to log in instead of showing selectable options when there is no user', () => {
    renderCard({ user: null });
    expect(screen.getByText(/Inicia sesión/))?.toBeInTheDocument();
    expect(screen.queryByText('Feria'))?.not?.toBeInTheDocument();
  });

  it('shows result bars (not selectable buttons) once the user has already voted', () => {
    renderCard({ userVote: 'opt-1' });
    expect(screen.getByText('60%'))?.toBeInTheDocument(); // 12/20
    expect(screen.getByText('40%'))?.toBeInTheDocument(); // 8/20
    expect(screen.getByText('Cambiar voto'))?.toBeInTheDocument();
  });

  it('hides "Cambiar voto" and shows read-only results when the poll is closed', () => {
    communityService?.isPollClosed?.mockReturnValue(true);
    renderCard({ userVote: 'opt-1' });
    expect(screen.getByText('60%'))?.toBeInTheDocument();
    expect(screen.queryByText('Cambiar voto'))?.not?.toBeInTheDocument();
    expect(screen.queryByText('Feria', { selector: 'button' }))?.not?.toBeInTheDocument();
  });

  it('casts a vote through communityService.castPollVote and reports it via onVoted', async () => {
    communityService?.castPollVote?.mockResolvedValue({
      data: [
        { id: 'opt-1', label: 'Feria', position: 0, vote_count: 13 },
        { id: 'opt-2', label: 'Supermercado', position: 1, vote_count: 8 },
      ],
      error: null,
    });
    const onVoted = vi.fn();
    renderCard({ onVoted });

    fireEvent.click(screen.getByText('Feria'));

    expect(await screen.findByText('62%'))?.toBeInTheDocument(); // 13/21 rounded
    expect(communityService?.castPollVote)?.toHaveBeenCalledWith({ pollId: 'poll-1', optionId: 'opt-1' });
    expect(onVoted)?.toHaveBeenCalledWith('poll-1', 'opt-1');
  });

  it('shows an error and keeps the options votable when the vote fails (e.g. a closed poll rejected server-side)', async () => {
    communityService?.castPollVote?.mockResolvedValue({
      data: null,
      error: new Error('La encuesta está cerrada o no existe'),
    });
    renderCard();

    fireEvent.click(screen.getByText('Feria'));

    expect(await screen.findByText('La encuesta está cerrada o no existe'))?.toBeInTheDocument();
    expect(screen.getByText('Feria'))?.toBeInTheDocument();
  });
});
