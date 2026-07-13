import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PollDetail from './components/PollDetail';

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
  body: 'Estoy armando una guía de barrio.',
  sector: 'Centro',
  author: { full_name: 'María' },
  created_at: '2026-01-01T00:00:00Z',
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

function renderDetail(props) {
  return render(
    <MemoryRouter>
      <PollDetail post={basePost} user={{ id: 'user-1' }} userVote={null} onVoted={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  communityService?.isPollClosed?.mockReturnValue(false);
});

describe('PollDetail', () => {
  it('shows the title, optional description, and selectable options when there is no vote yet', () => {
    renderDetail();
    expect(screen.getByRole('heading', { name: basePost?.title }))?.toBeInTheDocument();
    expect(screen.getByText(basePost?.body))?.toBeInTheDocument();
    expect(screen.getByText('Feria'))?.toBeInTheDocument();
    expect(screen.getByText('Supermercado'))?.toBeInTheDocument();
    expect(screen.queryByText('Cambiar voto'))?.not?.toBeInTheDocument();
  });

  it('shows result bars and a "Cambiar voto" control once the user has voted, while still open', () => {
    renderDetail({ userVote: 'opt-1' });
    expect(screen.getByText('60%'))?.toBeInTheDocument();
    expect(screen.getByText('40%'))?.toBeInTheDocument();
    expect(screen.getByText('Cambiar voto'))?.toBeInTheDocument();
  });

  it('clicking "Cambiar voto" reveals the selectable options again', () => {
    renderDetail({ userVote: 'opt-1' });
    fireEvent.click(screen.getByText('Cambiar voto'));
    expect(screen.getByText('Feria'))?.toBeInTheDocument();
    expect(screen.getByText('Supermercado'))?.toBeInTheDocument();
    expect(screen.getByText('Cancelar'))?.toBeInTheDocument();
  });

  it('shows a read-only result view with no voting controls once the poll is closed', () => {
    communityService?.isPollClosed?.mockReturnValue(true);
    renderDetail({ userVote: 'opt-1' });
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
    renderDetail({ onVoted });

    fireEvent.click(screen.getByText('Feria'));

    expect(await screen.findByText('62%'))?.toBeInTheDocument();
    expect(communityService?.castPollVote)?.toHaveBeenCalledWith({ pollId: 'poll-1', optionId: 'opt-1' });
    expect(onVoted)?.toHaveBeenCalledWith('poll-1', 'opt-1');
  });

  it('prompts to log in instead of showing selectable options when there is no user', () => {
    renderDetail({ user: null });
    expect(screen.getByText(/Inicia sesión/))?.toBeInTheDocument();
    expect(screen.queryByText('Feria'))?.not?.toBeInTheDocument();
  });
});
