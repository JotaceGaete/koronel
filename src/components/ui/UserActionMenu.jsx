import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';

const MENU_ITEMS = [
  { label: 'Mi Panel', path: '/user-account-dashboard', icon: 'LayoutDashboard' },
  { label: 'Mi Negocio', path: '/business-profile-page', icon: 'Building2' },
  { label: 'Mis Avisos', path: '/user-account-dashboard?tab=ads', icon: 'Tag' },
  { label: 'Publicar Aviso', path: '/post-classified-ad', icon: 'PlusCircle', highlight: true },
];

export default function UserActionMenu({
  user = null, // { name, email, avatar } or null for guest
  onLogout,
  className = '',
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  const isLoggedIn = !!user;
  const displayName = user?.name || 'Usuario';
  const initials = displayName?.split(' ')?.map((n) => n?.[0])?.join('')?.slice(0, 2)?.toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef?.current && !menuRef?.current?.contains(e?.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMobileOpen(false);
  }, [location?.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = () => {
    setOpen(false);
    setMobileOpen(false);
    onLogout?.();
  };

  if (!isLoggedIn) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Link to="/user-account-dashboard">
          <Button variant="outline" size="sm">
            Iniciar Sesión
          </Button>
        </Link>
        <Link to="/user-account-dashboard" className="hidden sm:block">
          <Button variant="default" size="sm">
            Registrarse
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Dropdown */}
      <div className={`relative hidden md:block ${className}`} ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Menú de usuario"
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-caption font-semibold text-primary-foreground shrink-0"
            style={{ background: 'var(--color-primary)' }}
          >
            {user?.avatar ? (
              <Image src={user?.avatar} alt={`Avatar de ${displayName}`} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <span className="text-sm font-caption font-medium text-foreground max-w-[100px] truncate">
            {displayName}
          </span>
          <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} color="var(--color-secondary)" />
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-[150] py-1"
            role="menu"
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-caption font-semibold text-card-foreground truncate">{displayName}</p>
              {user?.email && (
                <p className="text-xs font-caption text-muted-foreground truncate mt-0.5">{user?.email}</p>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {MENU_ITEMS?.map((item) => (
                <Link
                  key={item?.path}
                  to={item?.path}
                  className={`
                    flex items-center gap-2.5 px-4 py-2.5 text-sm font-caption transition-colors duration-150 min-h-[44px]
                    ${item?.highlight
                      ? 'text-primary font-medium hover:bg-muted' :'text-card-foreground hover:bg-muted'
                    }
                  `}
                  role="menuitem"
                >
                  <Icon
                    name={item?.icon}
                    size={16}
                    color={item?.highlight ? 'var(--color-primary)' : 'currentColor'}
                  />
                  {item?.label}
                </Link>
              ))}
            </div>

            <hr className="border-border" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-caption text-error hover:bg-muted transition-colors duration-150 min-h-[44px]"
              role="menuitem"
            >
              <Icon name="LogOut" size={16} color="currentColor" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
      {/* Mobile Trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`md:hidden flex items-center justify-center w-10 h-10 rounded-full overflow-hidden text-sm font-caption font-semibold text-primary-foreground shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
        style={{ background: 'var(--color-primary)' }}
        aria-label="Abrir menú de usuario"
      >
        {user?.avatar ? (
          <Image src={user?.avatar} alt={`Avatar de ${displayName}`} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </button>
      {/* Mobile Slide-out Panel */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[200] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Panel de usuario"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-foreground opacity-40"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-72 bg-card shadow-xl flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-caption font-semibold text-primary-foreground shrink-0"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {user?.avatar ? (
                    <Image src={user?.avatar} alt={`Avatar de ${displayName}`} className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-caption font-semibold text-card-foreground truncate max-w-[160px]">
                    {displayName}
                  </p>
                  {user?.email && (
                    <p className="text-xs font-caption text-muted-foreground truncate max-w-[160px]">
                      {user?.email}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Cerrar panel"
              >
                <Icon name="X" size={18} color="currentColor" />
              </button>
            </div>

            {/* Panel Items */}
            <nav className="flex-1 px-3 py-3 flex flex-col gap-1 overflow-y-auto">
              {MENU_ITEMS?.map((item) => (
                <Link
                  key={item?.path}
                  to={item?.path}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-md text-base font-caption font-medium
                    transition-all duration-150 min-h-[44px]
                    ${item?.highlight
                      ? 'bg-primary text-primary-foreground'
                      : 'text-card-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Icon name={item?.icon} size={20} color="currentColor" />
                  {item?.label}
                </Link>
              ))}
            </nav>

            {/* Logout */}
            <div className="px-3 py-4 border-t border-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-base font-caption text-error hover:bg-muted transition-colors duration-150 min-h-[44px]"
              >
                <Icon name="LogOut" size={20} color="currentColor" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}