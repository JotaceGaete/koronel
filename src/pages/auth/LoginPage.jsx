import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import Input from 'components/ui/Input';
import GoogleLoginButton from 'components/GoogleLoginButton';
import Logo from 'components/Logo';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const msg = location?.state?.error;
    if (msg) setError(msg);
  }, [location?.state?.error]);

  const from = (typeof location?.state?.from === 'string'
    ? location.state.from
    : (location?.state?.from?.pathname && (location.state.from.pathname + (location.state.from.search || '')))) || '/homepage';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    if (!form?.email || !form?.password) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setLoading(true);
    const { error: signInError } = await signIn(form?.email, form?.password);
    setLoading(false);
    if (signInError) {
      setError(signInError?.message || 'Credenciales incorrectas. Intenta de nuevo.');
    } else {
      navigate(from, { replace: true });
    }
  };

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
            Accede a tu cuenta de Koronel
          </p>
        </div>

        {/* Card del formulario */}
        <div
          className="rounded-2xl p-6 sm:p-8 shadow-lg border border-border/80"
          style={{
            background: 'var(--color-card)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@email.com"
              value={form?.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e?.target?.value }))}
              required
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="Tu contraseña"
              value={form?.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e?.target?.value }))}
              required
              autoComplete="current-password"
            />
            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-sm font-caption"
                style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-error)' }}
              >
                <Icon name="AlertCircle" size={16} color="currentColor" />
                {error}
              </div>
            )}
            <Button type="submit" variant="default" fullWidth loading={loading} size="lg" className="rounded-xl">
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs font-caption text-muted-foreground bg-[var(--color-card)]">
                  o continúa con
                </span>
              </div>
            </div>
            <GoogleLoginButton />
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm font-caption text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link
                to="/signup"
                className="font-semibold hover:underline transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                Regístrate gratis
              </Link>
            </p>
          </div>
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
