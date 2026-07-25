import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Every admin section component is heavy (own data fetching); stub them all so
// this file only exercises the guard + the sidebar, not every section's internals.
vi.mock('./components/AdminBusinesses', () => ({ default: () => <div>Sección: Negocios</div> }));
vi.mock('./components/AdminIncompleteBusinesses', () => ({ default: () => <div>Sección: Incompletos</div> }));
vi.mock('./components/AdminCategories', () => ({ default: () => <div>Sección: Categorías</div> }));
vi.mock('./components/AdminClaimRequests', () => ({ default: () => <div>Sección: Reclamaciones</div> }));
vi.mock('./components/AdminProfesionales', () => ({ default: () => <div>Sección: Profesionales</div> }));
vi.mock('./components/AdminClassifiedAds', () => ({ default: () => <div>Sección: Clasificados</div> }));
vi.mock('./components/AdminFeaturedListings', () => ({ default: () => <div>Sección: Destacados</div> }));
vi.mock('./components/AdminBanners', () => ({ default: () => <div>Sección: Banners</div> }));
vi.mock('./components/AdminPopups', () => ({ default: () => <div>Sección: Popups</div> }));
vi.mock('./components/AdminEvents', () => ({ default: () => <div>Sección: Eventos</div> }));
vi.mock('./components/AdminCommunity', () => ({ default: () => <div>Sección: Comunidad</div> }));
vi.mock('./components/AdminEmpleos', () => ({ default: () => <div>Sección: Empleos</div> }));
vi.mock('./components/AdminPublicServices', () => ({ default: () => <div>Sección: Servicios públicos</div> }));
vi.mock('components/admin/AdminNotificationsPanel', () => ({ default: () => <div /> }));

import AdminDashboard from './index';

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/admin-dashboard']}>
      <Routes>
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/login" element={<div>Página de login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminDashboard — guard de administrador', () => {
  it('redirige a /login cuando no hay usuario autenticado (ruta protegida)', async () => {
    mockUseAuth?.mockReturnValue({ user: null, userProfile: null, loading: false });
    renderDashboard();

    expect(await screen.findByText('Página de login'))?.toBeInTheDocument();
  });

  it('redirige a /login cuando el usuario está autenticado pero no es admin', async () => {
    mockUseAuth?.mockReturnValue({
      user: { id: 'u1', email: 'vecino@example.com', user_metadata: {}, app_metadata: {} },
      userProfile: { role: 'user' },
      loading: false,
    });
    renderDashboard();

    expect(await screen.findByText('Página de login'))?.toBeInTheDocument();
  });

  it('redirige a /login para un usuario con role=admin solo en user_metadata (auto-asignable por el cliente)', async () => {
    mockUseAuth?.mockReturnValue({
      user: { id: 'u2', email: 'vecino@example.com', user_metadata: { role: 'admin' }, app_metadata: {} },
      userProfile: { role: 'user' },
      loading: false,
    });
    renderDashboard();

    expect(await screen.findByText('Página de login'))?.toBeInTheDocument();
  });

  it('muestra el panel y la opción "Servicios públicos" en el menú solo para un admin real', async () => {
    mockUseAuth?.mockReturnValue({
      user: { id: 'admin1', email: 'admin@example.com', user_metadata: {}, app_metadata: { role: 'admin' } },
      userProfile: { role: 'admin' },
      loading: false,
    });
    renderDashboard();

    expect(await screen.findByText('Panel de Administración'))?.toBeInTheDocument();
    expect(screen.getByText('Servicios públicos'))?.toBeInTheDocument();
    // El resto de las secciones existentes sigue en el menú, sin alterarse.
    expect(screen.getByText('Negocios')).toBeInTheDocument();
    expect(screen.getByText('Comunidad')).toBeInTheDocument();
    expect(screen.getByText('Empleos')).toBeInTheDocument();
  });

  it('clicking "Servicios públicos" activa esa sección', async () => {
    mockUseAuth?.mockReturnValue({
      user: { id: 'admin1', email: 'admin@example.com', user_metadata: {}, app_metadata: { role: 'admin' } },
      userProfile: { role: 'admin' },
      loading: false,
    });
    renderDashboard();

    fireEvent.click(await screen.findByText('Servicios públicos'));

    expect(await screen.findByText('Sección: Servicios públicos'))?.toBeInTheDocument();
  });
});
