import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PollOptionButton from './PollOptionButton';

// "Un clic para votar" only holds if the click target is genuinely operable by keyboard too
// (Tab + Enter/Space), not just a mouse target. Fase 6 QA check: confirm this is a real
// <button>, not a <div onClick> — no custom CSS in this file removes the default focus
// outline either, so tabbing to it shows the browser's native focus ring.
describe('PollOptionButton accessibility', () => {
  it('renders as a native, focusable <button>', () => {
    render(<PollOptionButton option={{ id: 'opt-1', label: 'Feria' }} onSelect={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'Feria' });
    expect(btn.tagName)?.toBe('BUTTON');
    expect(btn)?.not?.toHaveAttribute('tabindex', '-1');

    btn.focus();
    expect(document.activeElement)?.toBe(btn);
  });

  it('calls onSelect with the option id when activated', () => {
    const onSelect = vi.fn();
    render(<PollOptionButton option={{ id: 'opt-1', label: 'Feria' }} onSelect={onSelect} />);
    screen.getByRole('button', { name: 'Feria' })?.click();
    expect(onSelect)?.toHaveBeenCalledWith('opt-1');
  });

  it('is disabled (and excluded from the tab order) while a vote is in flight', () => {
    render(<PollOptionButton option={{ id: 'opt-1', label: 'Feria' }} onSelect={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Feria' }))?.toBeDisabled();
  });
});
