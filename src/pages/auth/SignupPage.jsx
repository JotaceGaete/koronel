import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Logo from 'components/Logo';
import Button from 'components/ui/Button';
import Input from 'components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    if (!form?.fullName?.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!form?.email?.trim()) { setError('El correo es obligatorio.'); return; }
    if (form?.password?.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (form?.password !== form?.confirm) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    const { error: signUpError } = await signUp(form?.email, form?.password, form?.fullName);
    setLoading(false);
    if (signUpError) {
      setError(signUpError?.message || 'Error al crear la cuenta. Intenta de nuevo.');
    } else {
      navigate('/homepage', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-background)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo variant="auth" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Crear Cuenta</h1>
          <p className="text-sm font-caption text-muted-foreground mt-1">Únete a la comunidad de CoronelLocal</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-md p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Nombre completo"
              type="text"
              placeholder="Tu nombre completo"
              value={form?.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e?.target?.value }))}
              required
            />
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
              placeholder="Mínimo 6 caracteres"
              value={form?.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e?.target?.value }))}
              required
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="Repite tu contraseña"
              value={form?.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e?.target?.value }))}
              required
            />
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md text-sm font-caption" style={{ background: '#E53E3E18', color: 'var(--color-error)' }}>
                <Icon name="AlertCircle" size={15} color="currentColor" />
                {error}
              </div>
            )}
            <Button type="submit" variant="default" fullWidth loading={loading} size="lg">
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm font-caption text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                Inicia sesión
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
