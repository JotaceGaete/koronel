import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SummaryTab from './SummaryTab';

const isMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: () => ({
          is: (...args) => isMock(...args),
        }),
      }),
    }),
  },
}));

const business = {
  id: 'biz-1',
  name: 'Restaurante El Rincón',
  status: 'published',
  verified: true,
  claimed: true,
  logo_url: 'https://x/logo.png',
  business_images: [{ is_primary: true }],
  address_text: 'Av. Prat 345',
  whatsapp: '+56912345678',
  opening_hours: null,
  description: 'a'.repeat(40),
  category_key: 'restaurantes',
  website: null,
  social_links: [],
  updated_at: '2026-06-01T00:00:00Z',
};

describe('SummaryTab', () => {
  beforeEach(() => {
    isMock.mockReset();
    isMock.mockResolvedValue({ data: [], error: null });
  });

  it('shows an empty state when the owner has no businesses', () => {
    render(<SummaryTab businesses={[]} walinkaLinks={{}} />);
    expect(screen.getByText(/aún no tienes negocios/i)).toBeInTheDocument();
  });

  it('renders the business name, verified badge, and completeness percentage', async () => {
    render(<SummaryTab businesses={[business]} walinkaLinks={{}} />);
    expect(screen.getByText('Restaurante El Rincón')).toBeInTheDocument();
    expect(screen.getByText('Verificado')).toBeInTheDocument();
    // 6 of 8 fields done (missing: hours, social) -> 75%
    await waitFor(() => expect(screen.getByText('75%')).toBeInTheDocument());
  });

  it('recommends completing hours since opening_hours is missing', async () => {
    render(<SummaryTab businesses={[business]} walinkaLinks={{}} />);
    await waitFor(() => expect(screen.getByText(/completa tus horarios/i)).toBeInTheDocument());
  });

  it('recommends connecting Walinka when claimed and not yet connected', async () => {
    render(<SummaryTab businesses={[business]} walinkaLinks={{}} />);
    await waitFor(() => expect(screen.getByText(/aún no conectas tu catálogo walinka/i)).toBeInTheDocument());
  });

  it('does not recommend Walinka once the link is connected', async () => {
    render(
      <SummaryTab
        businesses={[business]}
        walinkaLinks={{ 'biz-1': { status: 'connected' } }}
      />
    );
    await waitFor(() => expect(screen.getByText('75%')).toBeInTheDocument());
    expect(screen.queryByText(/catálogo walinka/i)).not.toBeInTheDocument();
  });

  it('shows a pending-reviews recommendation when there are unanswered reviews', async () => {
    isMock.mockResolvedValue({ data: [{ business_id: 'biz-1' }, { business_id: 'biz-1' }], error: null });
    render(<SummaryTab businesses={[business]} walinkaLinks={{}} />);
    await waitFor(() => expect(screen.getByText(/tienes 2 reseñas sin responder/i)).toBeInTheDocument());
  });
});
