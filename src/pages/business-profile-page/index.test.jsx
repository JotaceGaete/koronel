import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockGetById, mockGetAll, mockGetImageUrl } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockGetAll: vi.fn(),
  mockGetImageUrl: vi.fn((path) => `https://cdn.example.com/${path}`),
}));
vi.mock('../../services/businessService', () => ({
  businessService: { getById: mockGetById, getAll: mockGetAll, getImageUrl: mockGetImageUrl },
}));

const { mockUseCity } = vi.hoisted(() => ({ mockUseCity: vi.fn() }));
vi.mock('../../contexts/CityContext', () => ({ useCity: mockUseCity }));

let currentSearch = '';
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(currentSearch)],
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

vi.mock('components/ui/Header', () => ({ default: () => null }));
vi.mock('components/AppIcon', () => ({ default: () => null }));
vi.mock('components/ui/Button', () => ({ default: ({ children, ...props }) => <button {...props}>{children}</button> }));
vi.mock('components/ui/ShareButtons', () => ({ default: () => null }));
vi.mock('./components/ImageGallery', () => ({ default: () => null }));
vi.mock('./components/BusinessInfo', () => ({
  default: ({ business }) => <div data-testid="business-info">{business?.name}</div>,
}));
vi.mock('./components/OpeningHours', () => ({ default: () => null }));
vi.mock('./components/ContactDetails', () => ({ default: () => null }));
vi.mock('./components/BusinessMap', () => ({ default: () => null }));
vi.mock('./components/ReviewsSection', () => ({ default: () => null }));
vi.mock('./components/ClaimBusiness', () => ({ default: () => null }));
vi.mock('./components/ChurchDetails', () => ({ default: () => null }));
vi.mock('./components/BusinessJobs', () => ({ default: () => null }));
vi.mock('./components/RelatedBusinesses', () => ({
  default: ({ businesses }) => (
    <div data-testid="related-businesses">
      {(businesses || [])?.map((b) => <span key={b?.id} data-testid="related-item">{b?.name}</span>)}
    </div>
  ),
}));

import BusinessProfilePage from './index';

function realBusiness(overrides = {}) {
  return {
    id: 'biz-1',
    name: 'Ferretería Los Álamos',
    category_key: 'ferreterias',
    category: 'Ferretería',
    address: 'Calle Real 123',
    phone: '+56911111111',
    rating: 0,
    review_count: 0,
    business_images: [],
    ...overrides,
  };
}

const FICTITIOUS_STRINGS = [
  'Restaurante El Rincón Chileno',
  'Picada La Costanera',
  'Café Central Coronel',
  'Marisquería Don Pedro',
  'María González',
  'Feria Gastronómica de Coronel',
];

function expectNoFictitiousContent() {
  const body = document.body?.textContent || '';
  FICTITIOUS_STRINGS?.forEach((s) => expect(body)?.not?.toContain(s));
}

beforeEach(() => {
  mockGetById.mockReset();
  mockGetAll.mockReset();
  mockGetAll.mockResolvedValue({ data: [], count: 0, error: null });
  mockUseCity.mockReturnValue({ city: { brand_name: 'Coronel' }, communityCityId: 'city-a' });
  currentSearch = '?id=biz-1';
});

describe('BusinessProfilePage — sin contenido ficticio', () => {
  it('negocio válido: muestra los datos reales y ningún contenido ficticio', async () => {
    mockGetById.mockResolvedValue({ data: realBusiness(), error: null });

    render(<BusinessProfilePage />);

    await waitFor(() => expect(screen.getByTestId('business-info'))?.toHaveTextContent('Ferretería Los Álamos'));
    expectNoFictitiousContent();
  });

  it('negocio inexistente (id sin fila real): muestra "Negocio no encontrado", nunca el mock', async () => {
    mockGetById.mockResolvedValue({ data: null, error: null });

    render(<BusinessProfilePage />);

    await waitFor(() => expect(screen.getByText('Negocio no encontrado'))?.toBeInTheDocument());
    expect(screen.queryByTestId('business-info'))?.not?.toBeInTheDocument();
    expectNoFictitiousContent();
  });

  it('error de consulta: muestra "Negocio no encontrado", nunca el mock', async () => {
    mockGetById.mockResolvedValue({ data: null, error: new Error('network fail') });

    render(<BusinessProfilePage />);

    await waitFor(() => expect(screen.getByText('Negocio no encontrado'))?.toBeInTheDocument());
    expectNoFictitiousContent();
  });

  it('sin parámetro ?id en la URL: muestra "Negocio no encontrado" en vez del negocio genérico ficticio', async () => {
    currentSearch = '';

    render(<BusinessProfilePage />);

    await waitFor(() => expect(screen.getByText('Negocio no encontrado'))?.toBeInTheDocument());
    expect(mockGetById)?.not?.toHaveBeenCalled();
    expectNoFictitiousContent();
  });

  it('ausencia de negocios relacionados reales: la sección de relacionados queda vacía, sin datos ficticios', async () => {
    mockGetById.mockResolvedValue({ data: realBusiness(), error: null });
    mockGetAll.mockResolvedValue({ data: [], count: 0, error: null });

    render(<BusinessProfilePage />);

    await waitFor(() => expect(screen.getByTestId('business-info'))?.toBeInTheDocument());
    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalled());
    expect(screen.queryAllByTestId('related-item'))?.toHaveLength(0);
    expectNoFictitiousContent();
  });

  it('negocios relacionados reales: usa businessService.getAll con la categoría y la ciudad vigente, excluyendo el negocio actual', async () => {
    mockGetById.mockResolvedValue({ data: realBusiness(), error: null });
    mockGetAll.mockResolvedValue({
      data: [
        realBusiness({ id: 'biz-1', name: 'Ferretería Los Álamos' }),
        realBusiness({ id: 'biz-2', name: 'Ferretería El Tornillo' }),
      ],
      count: 2,
      error: null,
    });

    render(<BusinessProfilePage />);

    await waitFor(() => expect(mockGetAll)?.toHaveBeenCalledWith(
      expect.objectContaining({ category: 'ferreterias', communityCityId: 'city-a' })
    ));
    await waitFor(() => expect(screen.getByTestId('related-item'))?.toHaveTextContent('Ferretería El Tornillo'));
    expect(screen.queryByText('Ferretería Los Álamos', { selector: '[data-testid="related-item"]' }))?.not?.toBeInTheDocument();
    expectNoFictitiousContent();
  });
});
