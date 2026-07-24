import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import AuthCallbackPage from './AuthCallbackPage';

let mockUser = null;
let mockGetSession = () => Promise.resolve({ data: { session: null } });

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
    },
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function renderCallback(initialEntry = '/auth/callback') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockUser = null;
    mockGetSession = () => Promise.resolve({ data: { session: null } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('login iniciado desde beta.koronel.cl: sin returnTo guardado, vuelve a "/"', async () => {
    mockUser = { id: 'user-1' };
    renderCallback();
    await vi.advanceTimersByTimeAsync(0);
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/');
    });
  });

  it('login iniciado desde koronel.cl (producción): mismo comportamiento, sin dependencia de dominio', async () => {
    // El componente no lee el hostname; el dominio real ya quedó resuelto por
    // AuthContext.signInWithGoogle (redirectTo = window.location.origin).
    mockGetSession = () => Promise.resolve({ data: { session: { user: { id: 'user-2' } } } });
    renderCallback();
    await vi.advanceTimersByTimeAsync(800);
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/');
    });
  });

  it('retorno interno válido: respeta la ruta guardada en auth_return_to', async () => {
    window.sessionStorage.setItem('auth_return_to', '/mis-negocios');
    mockUser = { id: 'user-3' };
    renderCallback();
    await vi.advanceTimersByTimeAsync(0);
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/mis-negocios');
    });
  });

  it('rechaza una URL externa guardada como retorno y cae a "/"', async () => {
    window.sessionStorage.setItem('auth_return_to', 'https://evil.com');
    mockUser = { id: 'user-4' };
    renderCallback();
    await vi.advanceTimersByTimeAsync(0);
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/');
    });
  });

  it('ya no redirige siempre a /dashboard por defecto', async () => {
    mockUser = { id: 'user-5' };
    renderCallback();
    await vi.advanceTimersByTimeAsync(0);
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).not.toBe('/dashboard');
    });
  });

  it('usuario ya autenticado: redirige de inmediato sin esperar el timeout de sesión', async () => {
    mockUser = { id: 'user-6' };
    renderCallback();
    // No avanzamos el timer de 800ms: si esto pasa, ya navegó por el efecto síncrono de "user".
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/');
    });
  });

  it('error o cancelación de Google OAuth: vuelve a /login con estado controlado', async () => {
    renderCallback('/auth/callback?error=access_denied');
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/login');
    });
  });

  it('error en el hash (#error=...) también se trata como cancelación', async () => {
    // El componente lee window.location.hash directamente (no el hash de React Router),
    // porque así llega el error de Supabase tras el redirect de Google.
    window.location.hash = '#error=access_denied';
    renderCallback('/auth/callback');
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/login');
    });
    window.location.hash = '';
  });

  it('sin sesión tras el timeout: vuelve a /login', async () => {
    renderCallback();
    await vi.advanceTimersByTimeAsync(800);
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/login');
    });
  });
});
