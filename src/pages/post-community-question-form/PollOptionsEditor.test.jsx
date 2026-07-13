import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PollOptionsEditor, { MIN_POLL_OPTIONS, MAX_POLL_OPTIONS } from './components/PollOptionsEditor';

// Wraps the (controlled) editor with local state so interactions actually re-render it,
// the same way post-community-question-form/index.jsx drives it via pollOptions/setPollOptions.
function ControlledEditor({ initial = ['', ''], onChangeSpy, error }) {
  const [options, setOptions] = useState(initial);
  return (
    <PollOptionsEditor
      options={options}
      onChange={(next) => { setOptions(next); onChangeSpy?.(next); }}
      error={error}
    />
  );
}

describe('PollOptionsEditor', () => {
  it('starts with 2 empty option inputs and no remove buttons', () => {
    render(<ControlledEditor />);
    expect(screen.getByPlaceholderText('Opción 1'))?.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Opción 2'))?.toBeInTheDocument();
    expect(screen.queryByLabelText('Quitar opción 1'))?.not?.toBeInTheDocument();
  });

  it('lets the user type into an option and reports the change', () => {
    const onChangeSpy = vi.fn();
    render(<ControlledEditor onChangeSpy={onChangeSpy} />);
    fireEvent.change(screen.getByPlaceholderText('Opción 1'), { target: { value: 'Feria' } });
    expect(onChangeSpy)?.toHaveBeenCalledWith(['Feria', '']);
  });

  it('adds options up to the maximum and then hides the "Agregar opción" button', () => {
    render(<ControlledEditor />);
    const addButton = () => screen.getByText('Agregar opción');

    for (let i = 2; i < MAX_POLL_OPTIONS; i += 1) {
      fireEvent.click(addButton());
    }

    expect(screen.getAllByPlaceholderText(/^Opción \d$/))?.toHaveLength(MAX_POLL_OPTIONS);
    expect(screen.queryByText('Agregar opción'))?.not?.toBeInTheDocument();
  });

  it('never lets the option count drop below the minimum', () => {
    render(<ControlledEditor initial={['Feria', 'Supermercado']} />);
    expect(screen.queryByLabelText('Quitar opción 1'))?.not?.toBeInTheDocument();
    expect(screen.getAllByPlaceholderText(/^Opción \d$/))?.toHaveLength(MIN_POLL_OPTIONS);
  });

  it('removes an option and keeps the rest, once above the minimum', () => {
    const onChangeSpy = vi.fn();
    render(<ControlledEditor initial={['Feria', 'Supermercado', 'Verdulería']} onChangeSpy={onChangeSpy} />);

    fireEvent.click(screen.getByLabelText('Quitar opción 2'));

    expect(onChangeSpy)?.toHaveBeenCalledWith(['Feria', 'Verdulería']);
    expect(screen.queryByDisplayValue('Supermercado'))?.not?.toBeInTheDocument();
    expect(screen.getByDisplayValue('Feria'))?.toBeInTheDocument();
    expect(screen.getByDisplayValue('Verdulería'))?.toBeInTheDocument();
  });

  it('shows the validation error message when provided', () => {
    render(<ControlledEditor error="La encuesta necesita al menos 2 opciones" />);
    expect(screen.getByText('La encuesta necesita al menos 2 opciones'))?.toBeInTheDocument();
  });
});
