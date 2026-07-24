import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { consumeReturnTo } from '../../lib/authReturnTo';

/**
 * OAuth callback: Supabase redirects here after Google sign-in.
 * Session is restored from URL hash (detectSessionInUrl). Uses current site
 * origin only (no hardcoded URLs) — beta.koronel.cl and koronel.cl both work
 * unchanged because redirectTo is built from window.location.origin.
 * Destino: la ruta interna que originó el login (auth_return_to) si existe y
 * es segura, o "/" por defecto. Nunca /dashboard fijo.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  // consumeReturnTo() borra la key al leerla: se resuelve una sola vez y se
  // cachea, porque dos efectos pueden intentar navegar (evita que el segundo
  // sobrescriba el destino correcto con el fallback "/").
  const destinationRef = useRef(null);
  const hasRedirectedRef = useRef(false);

  const resolveDestination = () => {
    if (destinationRef.current === null) {
      destinationRef.current = consumeReturnTo('/');
    }
    return destinationRef.current;
  };

  const goToDestination = () => {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    setStatus('success');
    navigate(resolveDestination(), { replace: true });
  };

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const hash = window.location.hash || '';
    const hashError = hash.includes('error=');

    if (errorParam || hashError) {
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;
      setStatus('error');
      navigate('/login', { replace: true, state: { error: 'Inicio de sesión cancelado o fallido.' } });
      return;
    }

    if (user) {
      goToDestination();
      return;
    }

    const checkSession = async () => {
      if (hasRedirectedRef.current) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (hasRedirectedRef.current) return;
      if (session) {
        goToDestination();
      } else {
        hasRedirectedRef.current = true;
        setStatus('error');
        navigate('/login', { replace: true });
      }
    };

    const t = setTimeout(checkSession, 800);
    return () => clearTimeout(t);
  }, [user, navigate, searchParams]);

  useEffect(() => {
    if (user && status === 'loading') {
      goToDestination();
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
