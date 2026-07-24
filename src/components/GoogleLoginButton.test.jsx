import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GoogleLoginButton from './GoogleLoginButton';

const signInWithGoogleMock = vi.fn(() => Promise.resolve({ error: null }));
let mockUser = null;

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, signInWithGoogle: signInWithGoogleMock }),
}));

function renderButton(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <GoogleLoginButton />
    </MemoryRouter>
  );
}

describe('GoogleLoginButton', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockUser = null;
    signInWithGoogleMock.mockClear();
  });

  it('guarda la ruta actual en auth_return_to antes de iniciar el flujo de Google', async () => {
    renderButton('/publicar-aviso');
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión con google/i }));
    expect(window.sessionStorage.getItem('auth_return_to')).toBe('/publicar-aviso');
    expect(signInWithGoogleMock).toHaveBeenCalled();
  });

  it('no guarda nada inseguro si se pasa un returnTo externo explícito', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <GoogleLoginButton returnTo="https://evil.com" />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión con google/i }));
    expect(window.sessionStorage.getItem('auth_return_to')).toBeNull();
  });
});
