import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from 'components/AppIcon';
import GoogleLoginButton from 'components/GoogleLoginButton';
import Logo from 'components/Logo';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Koronel solo permite iniciar sesión con Google. Email/password, registro
 * manual y recuperación de contraseña se eliminaron de la interfaz (Supabase
 * Auth se mantiene sin cambios; signIn/signUp siguen disponibles en
 * AuthContext para una futura limpieza de backend, pero no se exponen aquí).
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const msg = location?.state?.error;
    if (msg) setError(msg);
  }, [location?.state?.error]);

  // Ruta que originó el login (guardada por ProtectedRoute en location.state.from);
  // se persiste en sessionStorage vía authReturnTo antes del redirect a Google.
  const rawFrom = typeof location?.state?.from === 'string'
    ? location.state.from
    : (location?.state?.from?.pathname && (location.state.from.pathname + (location.state.from.search || '')));

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: 'linear-gradient(160deg, var(--color-background) 0%, var(--color-muted) 100%)',
      }}
    >
      <div className="w-full max-w-[400px]">
        {/* Logo + título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Logo variant="auth" />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
            Iniciar sesión
          </h1>
          <p className="text-sm font-caption text-muted-foreground mt-2">
            Accede con tu cuenta de Google para publicar, administrar y participar en Koronel.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 sm:p-8 shadow-lg border border-border/80"
          style={{
            background: 'var(--color-card)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
          }}
        >
          {error && (
            <div
              className="flex items-center gap-2 p-3 mb-5 rounded-xl text-sm font-caption"
              style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-error)' }}
            >
              <Icon name="AlertCircle" size={16} color="currentColor" />
              {error}
            </div>
          )}
          <GoogleLoginButton returnTo={rawFrom} />
          <p className="text-xs font-caption text-muted-foreground text-center mt-4">
            Usamos Google como único método de acceso para ofrecer una experiencia más simple y segura.
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/homepage"
            className="inline-flex items-center gap-1.5 text-sm font-caption text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="ArrowLeft" size={14} color="currentColor" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
