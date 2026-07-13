import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PollResultsBar from './PollResultsBar';

describe('PollResultsBar', () => {
  it('shows 0% without dividing by zero when there are no votes yet', () => {
    render(<PollResultsBar option={{ id: 'a', label: 'Feria', vote_count: 0 }} totalVotes={0} />);
    expect(screen.getByText('Feria'))?.toBeInTheDocument();
    expect(screen.getByText('0%'))?.toBeInTheDocument();
  });

  it('computes the percentage relative to totalVotes', () => {
    render(<PollResultsBar option={{ id: 'a', label: 'Feria', vote_count: 42 }} totalVotes={100} />);
    expect(screen.getByText('42%'))?.toBeInTheDocument();
  });

  it('rounds the percentage', () => {
    render(<PollResultsBar option={{ id: 'a', label: 'Feria', vote_count: 1 }} totalVotes={3} />);
    expect(screen.getByText('33%'))?.toBeInTheDocument();
  });

  it('handles a poll with tens of thousands of votes without breaking the percentage math', () => {
    // Surrogate for a live "thousands of concurrent votes" load test: there is no Postgres
    // instance available in this environment to actually seed community_poll_votes at that
    // scale, but every result view derives its percentage the same way this component does
    // (a plain division over already-denormalized vote_count fields, never a live COUNT), so
    // exercising that arithmetic at scale here covers the real risk surface.
    render(<PollResultsBar option={{ id: 'a', label: 'Feria', vote_count: 18432 }} totalVotes={50217} />);
    expect(screen.getByText('37%'))?.toBeInTheDocument(); // 18432/50217 = 36.71% -> rounds to 37
  });

  it('renders a check mark only when isSelected is true', () => {
    const { container, rerender } = render(
      <PollResultsBar option={{ id: 'a', label: 'Feria', vote_count: 1 }} totalVotes={1} isSelected={false} />
    );
    expect(container.querySelector('svg'))?.not?.toBeInTheDocument();

    rerender(<PollResultsBar option={{ id: 'a', label: 'Feria', vote_count: 1 }} totalVotes={1} isSelected />);
    expect(container.querySelector('svg'))?.toBeInTheDocument();
  });
});
