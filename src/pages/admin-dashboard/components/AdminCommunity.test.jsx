import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminCommunity from './AdminCommunity';

vi.mock('../../../services/communityService', () => ({
  communityService: {
    adminGetPosts: vi.fn(),
    adminUpdatePostStatus: vi.fn(),
    adminDeletePost: vi.fn(),
    adminClosePoll: vi.fn(),
    isPollClosed: vi.fn(),
  },
}));

import { communityService } from '../../../services/communityService';

const questionPost = {
  id: 'post-1',
  title: '¿Alguien conoce un buen mecánico?',
  body: 'Se me rompió el auto.',
  sector: 'Centro',
  status: 'active',
  author: { full_name: 'Juan' },
  created_at: '2026-01-01T00:00:00Z',
  poll: null,
};

const openPollPost = {
  id: 'post-2',
  title: '¿Dónde compras frutas y verduras?',
  body: '',
  sector: 'Centro',
  status: 'active',
  author: { full_name: 'María' },
  created_at: '2026-01-02T00:00:00Z',
  poll: { id: 'poll-1', status: 'open', closes_at: null },
};

const closedPollPost = {
  id: 'post-3',
  title: '¿Cuál es la mejor cafetería?',
  body: '',
  sector: 'Centro',
  status: 'active',
  author: { full_name: 'Pedro' },
  created_at: '2026-01-03T00:00:00Z',
  poll: { id: 'poll-2', status: 'closed', closes_at: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  communityService?.isPollClosed?.mockImplementation(poll => poll?.status === 'closed');
});

describe('AdminCommunity PostsTab', () => {
  it('renders a "Pregunta" badge and no close-poll action for a question post', async () => {
    communityService?.adminGetPosts?.mockResolvedValue({ data: [questionPost], error: null });
    render(<AdminCommunity />);

    expect(await screen.findByText('Pregunta'))?.toBeInTheDocument();
    expect(screen.queryByTitle('Cerrar encuesta'))?.not?.toBeInTheDocument();
  });

  it('renders an "Encuesta" badge and a close-poll action for an open poll', async () => {
    communityService?.adminGetPosts?.mockResolvedValue({ data: [openPollPost], error: null });
    render(<AdminCommunity />);

    expect(await screen.findByText('Encuesta'))?.toBeInTheDocument();
    expect(screen.queryByText('Cerrada'))?.not?.toBeInTheDocument();
    expect(screen.getByTitle('Cerrar encuesta'))?.toBeInTheDocument();
  });

  it('renders "Cerrada" and hides the close-poll action for an already-closed poll', async () => {
    communityService?.adminGetPosts?.mockResolvedValue({ data: [closedPollPost], error: null });
    render(<AdminCommunity />);

    expect(await screen.findByText('Encuesta'))?.toBeInTheDocument();
    expect(screen.getByText('Cerrada'))?.toBeInTheDocument();
    expect(screen.queryByTitle('Cerrar encuesta'))?.not?.toBeInTheDocument();
  });

  it('closing a poll calls communityService.adminClosePoll and updates the row without a page reload', async () => {
    communityService?.adminGetPosts?.mockResolvedValue({ data: [openPollPost], error: null });
    communityService?.adminClosePoll?.mockResolvedValue({ error: null });
    render(<AdminCommunity />);

    fireEvent.click(await screen.findByTitle('Cerrar encuesta'));

    expect(communityService?.adminClosePoll)?.toHaveBeenCalledWith('poll-1');
    expect(await screen.findByText('Cerrada'))?.toBeInTheDocument();
    expect(screen.queryByTitle('Cerrar encuesta'))?.not?.toBeInTheDocument();
  });

  it('does not break rendering a mixed list of questions and polls', async () => {
    communityService?.adminGetPosts?.mockResolvedValue({ data: [questionPost, openPollPost, closedPollPost], error: null });
    render(<AdminCommunity />);

    expect(await screen.findByText(questionPost?.title))?.toBeInTheDocument();
    expect(screen.getByText(openPollPost?.title))?.toBeInTheDocument();
    expect(screen.getByText(closedPollPost?.title))?.toBeInTheDocument();
    expect(screen.getByText('Pregunta'))?.toBeInTheDocument();
    expect(screen.getAllByText('Encuesta'))?.toHaveLength(2);
  });
});
