import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import LoginPage from './LoginPage';

let mockUser = null;
const signInWithGoogleMock = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, signInWithGoogle: signInWithGoogleMock }),
}));

// Header -> Logo ahora usa CityContext, que importa lib/supabase (exige
// VITE_SUPABASE_URL). Sin relación con lo que prueba este archivo.
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderLogin(initialEntry = { pathname: '/login' }) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LoginPage (Koronel, solo Google)', () => {
  beforeEach(() => {
    mockUser = null;
    signInWithGoogleMock.mockClear();
    window.sessionStorage.clear();
  });

  it('solo muestra el botón "Continuar con Google"', () => {
    renderLogin();
    expect(screen.getByText(/continuar con google/i)).toBeInTheDocument();
  });

  it('no muestra ningún campo de correo electrónico', () => {
    renderLogin();
    expect(screen.queryByLabelText(/correo electrónico/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/tu@email\.com/i)).not.toBeInTheDocument();
  });

  it('no muestra ningún campo de contraseña', () => {
    renderLogin();
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
  });

  it('no muestra un enlace de "Regístrate"', () => {
    renderLogin();
    expect(screen.queryByText(/regístrate/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument();
  });

  it('no muestra un enlace de "¿Olvidaste tu contraseña?"', () => {
    renderLogin();
    expect(screen.queryByText(/olvidaste tu contraseña/i)).not.toBeInTheDocument();
  });

  it('no hay ningún <form> de email/password en la página', () => {
    const { container } = renderLogin();
    expect(container.querySelector('form')).toBeNull();
  });

  it('usuario ya autenticado: sale de /login sin quedarse en un loop', () => {
    mockUser = { id: 'user-1' };
    renderLogin();
    expect(screen.getByTestId('location').textContent).toBe('/dashboard');
  });

  it('el botón de Google sigue funcionando (dispara signInWithGoogle)', async () => {
    renderLogin();
    const button = screen.getByRole('button', { name: /iniciar sesión con google/i });
    button.click();
    await Promise.resolve();
    expect(signInWithGoogleMock).toHaveBeenCalledTimes(1);
  });

  it('muestra un error de OAuth cancelado/fallido pasado por location.state', () => {
    renderLogin({ pathname: '/login', state: { error: 'Inicio de sesión cancelado o fallido.' } });
    expect(screen.getByText('Inicio de sesión cancelado o fallido.')).toBeInTheDocument();
  });
});
