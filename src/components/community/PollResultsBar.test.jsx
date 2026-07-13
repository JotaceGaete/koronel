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

  it('renders a check mark only when isSelected is true', () => {
    const { container, rerender } = render(
      <PollResultsBar option={{ id: 'a', label: 'Feria', vote_count: 1 }} totalVotes={1} isSelected={false} />
    );
    expect(container.querySelector('svg'))?.not?.toBeInTheDocument();

    rerender(<PollResultsBar option={{ id: 'a', label: 'Feria', vote_count: 1 }} totalVotes={1} isSelected />);
    expect(container.querySelector('svg'))?.toBeInTheDocument();
  });
});
