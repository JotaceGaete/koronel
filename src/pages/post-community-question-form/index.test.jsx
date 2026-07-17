import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Integration-level smoke test for the whole page: catches wiring mistakes between
// index.jsx and the three new components (PostTypeSelector, PollOptionsEditor,
// PollClosingDatePicker) that a component-only test can't see, without needing a real
// Supabase session (there is no dev/mock auth bypass available in this environment).
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isAuthenticated: true, loading: false }),
}));

vi.mock('../../services/communityService', () => ({
  communityService: {
    createPost: vi.fn(),
    createPoll: vi.fn(),
    uploadQuestionImages: vi.fn(),
  },
  COMMUNITY_CATEGORIES: [
    { key: 'services', label: 'Servicios y datos', chipLabel: 'Servicios' },
    { key: 'recommendations', label: 'Recomendaciones', chipLabel: 'Recomendaciones' },
    { key: 'security', label: 'Seguridad', chipLabel: 'Seguridad' },
    { key: 'community', label: 'Barrio y comunidad', chipLabel: 'Barrio' },
    { key: 'general', label: 'Consultas generales', chipLabel: 'Consultas' },
    { key: 'polls', label: 'Encuestas', chipLabel: 'Encuestas' },
  ],
}));

import { communityService } from '../../services/communityService';
import PostCommunityQuestionForm from './index';

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/comunidad/nueva']}>
      <PostCommunityQuestionForm />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PostCommunityQuestionForm', () => {
  it('defaults to Pregunta, unchanged from before the poll type was added', () => {
    renderForm();
    expect(screen.getByRole('heading', { name: 'Hacer una Pregunta' }))?.toBeInTheDocument();
    expect(screen.getByText('Enviar pregunta'))?.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Opción 1'))?.not?.toBeInTheDocument();
    expect(screen.getByText(/Imágenes/))?.toBeInTheDocument();
  });

  it('switching to Encuesta reveals the poll-only fields and hides image upload', () => {
    renderForm();
    fireEvent.click(screen.getByText('Encuesta'));

    expect(screen.getByRole('heading', { name: 'Crear una Encuesta' }))?.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Opción 1'))?.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Opción 2'))?.toBeInTheDocument();
    expect(screen.getByText('Finaliza'))?.toBeInTheDocument();
    expect(screen.getByText('Crear encuesta'))?.toBeInTheDocument();
    expect(screen.queryByText(/Imágenes/))?.not?.toBeInTheDocument();
  });

  it('blocks submit with fewer than 2 non-blank options and never calls createPoll', async () => {
    renderForm();
    fireEvent.click(screen.getByText('Encuesta'));

    fireEvent.change(screen.getByPlaceholderText('Ej: ¿Dónde compras frutas y verduras?'), {
      target: { value: '¿Dónde compras frutas y verduras?' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /Sector/ }), { target: { value: 'Centro' } });
    // Both option inputs are left blank.

    fireEvent.click(screen.getByText('Crear encuesta'));

    expect(await screen.findByText('La encuesta necesita al menos 2 opciones'))?.toBeInTheDocument();
    expect(communityService?.createPoll)?.not?.toHaveBeenCalled();
  });

  it('submits a valid poll via communityService.createPoll and shows the confirmation screen', async () => {
    communityService?.createPoll?.mockResolvedValue({
      data: { id: 'post-1', poll: { id: 'poll-1', options: [] } },
      error: null,
    });

    renderForm();
    fireEvent.click(screen.getByText('Encuesta'));

    fireEvent.change(screen.getByPlaceholderText('Ej: ¿Dónde compras frutas y verduras?'), {
      target: { value: '¿Dónde compras frutas y verduras?' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /Sector/ }), { target: { value: 'Centro' } });
    fireEvent.change(screen.getByPlaceholderText('Opción 1'), { target: { value: 'Feria' } });
    fireEvent.change(screen.getByPlaceholderText('Opción 2'), { target: { value: 'Supermercado' } });

    fireEvent.click(screen.getByText('Crear encuesta'));

    expect(await screen.findByText('¡Encuesta enviada!'))?.toBeInTheDocument();
    expect(communityService?.createPoll)?.toHaveBeenCalledWith(
      expect.objectContaining({
        title: '¿Dónde compras frutas y verduras?',
        sector: 'Centro',
        userId: 'user-1',
        options: ['Feria', 'Supermercado'],
      })
    );
    expect(communityService?.createPost)?.not?.toHaveBeenCalled();
  });

  it('shows a category selector (excluding Encuestas) for a Pregunta, defaulting to Consultas generales', () => {
    renderForm();
    const categorySelect = screen.getByRole('combobox', { name: 'Categoría' });
    expect(categorySelect)?.toBeInTheDocument();
    expect(categorySelect?.value)?.toBe('general');
    expect(screen.getByRole('option', { name: 'Servicios y datos' }))?.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Encuestas' }))?.not?.toBeInTheDocument();
  });

  it('hides the category selector for an Encuesta — its category is always assigned automatically', () => {
    renderForm();
    fireEvent.click(screen.getByText('Encuesta'));
    expect(screen.queryByRole('combobox', { name: 'Categoría' }))?.not?.toBeInTheDocument();
  });

  it('submits the chosen category with createPost for a Pregunta', async () => {
    communityService?.createPost?.mockResolvedValue({ data: { id: 'post-1' }, error: null });

    renderForm();
    fireEvent.change(screen.getByPlaceholderText('Ej: ¿Dónde puedo encontrar un buen mecánico en Centro?'), {
      target: { value: '¿Alguien conoce un buen mecánico?' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /Sector/ }), { target: { value: 'Centro' } });
    fireEvent.change(screen.getByPlaceholderText('Describe tu consulta con más detalle...'), {
      target: { value: 'Se me rompió el auto en Centro.' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Categoría' }), { target: { value: 'services' } });

    fireEvent.click(screen.getByText('Enviar pregunta'));

    expect(await screen.findByText('¡Pregunta enviada!'))?.toBeInTheDocument();
    expect(communityService?.createPost)?.toHaveBeenCalledWith(
      expect.objectContaining({ categoryKey: 'services' })
    );
  });

  it('never sends a category selection for an Encuesta — createPoll always assigns it server-side', async () => {
    communityService?.createPoll?.mockResolvedValue({
      data: { id: 'post-1', poll: { id: 'poll-1', options: [] } },
      error: null,
    });

    renderForm();
    fireEvent.click(screen.getByText('Encuesta'));
    fireEvent.change(screen.getByPlaceholderText('Ej: ¿Dónde compras frutas y verduras?'), {
      target: { value: '¿Dónde compras frutas y verduras?' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /Sector/ }), { target: { value: 'Centro' } });
    fireEvent.change(screen.getByPlaceholderText('Opción 1'), { target: { value: 'Feria' } });
    fireEvent.change(screen.getByPlaceholderText('Opción 2'), { target: { value: 'Supermercado' } });

    fireEvent.click(screen.getByText('Crear encuesta'));

    expect(await screen.findByText('¡Encuesta enviada!'))?.toBeInTheDocument();
    const call = communityService?.createPoll?.mock?.calls?.[0]?.[0];
    expect(call)?.not?.toHaveProperty('categoryKey');
  });
});
