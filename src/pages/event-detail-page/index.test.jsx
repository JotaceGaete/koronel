import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetById, mockGetUpcoming } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockGetUpcoming: vi.fn(),
}));
vi.mock('../../services/eventService', () => ({
  eventService: { getById: mockGetById, getUpcoming: mockGetUpcoming },
}));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../../contexts/CityContext', () => ({ useCity: () => ({ city: { brand_name: 'Coronel' } }) }));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'event-1' }),
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

vi.mock('components/ui/Header', () => ({ default: () => null }));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('components/AppImage', () => ({ default: () => null }));
vi.mock('components/ui/Button', () => ({ default: ({ children, ...props }) => <button {...props}>{children}</button> }));
vi.mock('components/ui/ShareButtons', () => ({ default: () => null }));

import EventDetailPage from './index';

function realEvent(overrides = {}) {
  return {
    id: 'event-1',
    title: 'Reunión vecinal de septiembre',
    description: 'Reunión mensual de la junta de vecinos.',
    category: 'meetups',
    start_datetime: new Date(Date.now() + 86400000)?.toISOString(),
    venue_name: 'Sede Social Los Álamos',
    status: 'approved',
    ...overrides,
  };
}

const FICTITIOUS_STRINGS = [
  'Feria Gastronómica de Coronel',
  'Plaza de Armas de Coronel',
  'Municipalidad de Coronel',
  'Restaurante El Rincón Chileno',
];

function expectNoFictitiousContent() {
  const body = document.body?.textContent || '';
  FICTITIOUS_STRINGS?.forEach((s) => expect(body)?.not?.toContain(s));
}

beforeEach(() => {
  mockGetById.mockReset();
  mockGetUpcoming.mockReset();
  mockGetUpcoming.mockResolvedValue({ data: [], error: null });
});

describe('EventDetailPage — sin contenido ficticio', () => {
  it('evento válido: muestra los datos reales y ningún contenido ficticio', async () => {
    mockGetById.mockResolvedValue({ data: realEvent(), error: null });

    render(<EventDetailPage />);

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }))?.toHaveTextContent('Reunión vecinal de septiembre'));
    expectNoFictitiousContent();
  });

  it('evento inexistente (id sin fila real): muestra "Evento no encontrado", nunca el fallback ficticio', async () => {
    mockGetById.mockResolvedValue({ data: null, error: null });

    render(<EventDetailPage />);

    await waitFor(() => expect(screen.getByText('Evento no encontrado'))?.toBeInTheDocument());
    expect(screen.queryByText('Reunión vecinal de septiembre'))?.not?.toBeInTheDocument();
    expectNoFictitiousContent();
  });

  it('error de consulta: muestra "Evento no encontrado", nunca el fallback ficticio', async () => {
    mockGetById.mockResolvedValue({ data: null, error: new Error('network fail') });

    render(<EventDetailPage />);

    await waitFor(() => expect(screen.getByText('Evento no encontrado'))?.toBeInTheDocument());
    expectNoFictitiousContent();
  });

  it('ausencia de eventos relacionados: la sección "Otros eventos próximos" no se muestra, sin datos ficticios', async () => {
    mockGetById.mockResolvedValue({ data: realEvent(), error: null });
    mockGetUpcoming.mockResolvedValue({ data: [], error: null });

    render(<EventDetailPage />);

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }))?.toHaveTextContent('Reunión vecinal de septiembre'));
    expect(screen.queryByText('Otros eventos próximos'))?.not?.toBeInTheDocument();
    expectNoFictitiousContent();
  });
});
