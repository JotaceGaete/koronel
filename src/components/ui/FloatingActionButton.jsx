import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from 'components/AppIcon';

const ACTIONS = [
  { label: 'Publicar aviso', path: '/post-classified-ad', icon: 'Tag' },
  { label: 'Agregar negocio', path: '/publicar-negocio', icon: 'Building2' },
];

const HIDE_PATHS = ['/post-classified-ad', '/publicar-negocio', '/publish-business-form', '/login', '/signup'];

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();

  const isHidden = HIDE_PATHS.some((p) => location?.pathname?.startsWith(p) || location?.pathname === p);

  useEffect(() => {
    const close = (e) => {
      if (menuRef?.current && !menuRef?.current?.contains(e?.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close, { passive: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, []);

  useEffect(() => setOpen(false), [location?.pathname]);

  if (isHidden) return null;

  return (
    <div
      ref={menuRef}
      className="group fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[90] flex flex-col items-end gap-3"
      aria-label="Acciones rápidas"
    >
      {/* Menú: móvil al tocar; escritorio al hover o tocar */}
      <div
        className={`flex flex-col gap-2 rounded-xl border border-border bg-card shadow-lg overflow-hidden min-w-[180px] transition-opacity duration-200 ${
          open ? 'flex' : 'hidden md:flex md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto'
        }`}
        role="menu"
      >
          {ACTIONS.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="flex items-center gap-3 min-h-[44px] px-4 py-3 text-sm font-caption font-semibold text-foreground hover:bg-muted transition-colors"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Icon name={action.icon} size={20} color="var(--color-primary)" className="shrink-0" />
              {action.label}
            </Link>
          ))}
      </div>

      {/* Botón principal */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full text-white shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ background: 'var(--color-primary)' }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? 'Cerrar menú' : 'Publicar aviso o agregar negocio'}
      >
        <Icon name="Plus" size={28} color="white" strokeWidth={2.5} className="shrink-0" />
      </button>
    </div>
  );
}
