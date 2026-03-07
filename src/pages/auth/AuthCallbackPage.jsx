import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

/**
 * OAuth callback: Supabase redirects here after Google sign-in.
 * Session is restored from URL hash (detectSessionInUrl). We then send the user to /dashboard.
 * Uses current site origin only (no hardcoded URLs).
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const hash = window.location.hash || '';
    const hashError = hash.includes('error=');

    if (errorParam || hashError) {
      setStatus('error');
      navigate('/login', { replace: true, state: { error: 'Inicio de sesión cancelado o fallido.' } });
      return;
    }

    if (user) {
      setStatus('success');
      navigate('/dashboard', { replace: true });
      return;
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('success');
        navigate('/dashboard', { replace: true });
      } else {
        setStatus('error');
        navigate('/login', { replace: true });
      }
    };

    const t = setTimeout(checkSession, 800);
    return () => clearTimeout(t);
  }, [user, navigate, searchParams]);

  useEffect(() => {
    if (user && status === 'loading') {
      setStatus('success');
      navigate('/dashboard', { replace: true });
    }
  }, [user, status, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--color-background)' }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm font-caption text-muted-foreground">
          Completando inicio de sesión…
        </p>
      </div>
    </div>
  );
}
