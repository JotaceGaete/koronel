import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import Input from 'components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-background)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/homepage" className="inline-flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center rounded-md w-10 h-10" style={{ background: 'var(--color-primary)' }}>
              <Icon name="MapPin" size={22} color="white" strokeWidth={2.5} />
            </div>
            <span className="font-heading font-bold text-2xl" style={{ color: 'var(--color-primary)' }}>
              Coronel<span style={{ color: 'var(--color-accent)' }}>Local</span>
            </span>
          </Link>
          <h1 className="font-heading font-bold text-2xl text-foreground">Iniciar Sesión</h1>
          <p className="text-sm font-caption text-muted-foreground mt-1">Accede a tu cuenta de CoronelLocal</p>
        </div>

        {/* Demo credentials */}
        <div className="mb-4 p-3 rounded-md border text-sm font-caption" style={{ background: 'rgba(44,82,130,0.06)', borderColor: 'rgba(44,82,130,0.2)' }}>
          <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <Icon name="Info" size={14} color="var(--color-primary)" />
            Credenciales de prueba:
          </p>
          <p className="text-muted-foreground">Email: <span className="font-medium text-foreground">carlos@coronellocal.cl</span></p>
          <p className="text-muted-foreground">Contraseña: <span className="font-medium text-foreground">coronel2026</span></p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-md p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@email.com"
              value={form?.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e?.target?.value }))}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="Tu contraseña"
              value={form?.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e?.target?.value }))}
              required
            />
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md text-sm font-caption" style={{ background: '#E53E3E18', color: 'var(--color-error)' }}>
                <Icon name="AlertCircle" size={15} color="currentColor" />
                {error}
              </div>
            )}
            <Button type="submit" variant="default" fullWidth loading={loading} size="lg">
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm font-caption text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link to="/signup" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/homepage" className="text-sm font-caption text-muted-foreground hover:text-foreground transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
