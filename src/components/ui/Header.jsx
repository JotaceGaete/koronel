import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { label: 'Inicio', path: '/homepage', icon: 'Home' },
  { label: 'Negocios', path: '/business-directory-listing', icon: 'Building2' },
  { label: 'Clasificados', path: '/classified-ads-listing', icon: 'Tag' },
  { label: 'Eventos', path: '/eventos', icon: 'CalendarDays' },
  { label: 'Empleos', path: '/empleos', icon: 'Briefcase' },
  { label: 'Comunidad', path: '/comunidad', icon: 'MessageCircle' },
  { label: 'Mapa', path: '/mapa', icon: 'Map' },
];

function isAdminUser(user) {
  if (!user) return false;
  const meta = user?.user_metadata || {};
  const appMeta = user?.app_metadata || {};
  return meta?.role === 'admin' || appMeta?.role === 'admin';
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const isActive = (path) => location?.pathname === path;

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await signOut();
    navigate('/homepage');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef?.current && !userMenuRef?.current?.contains(e?.target)) {
        setUserMenuOpen(false);
      }
      if (mobileMenuRef?.current && !mobileMenuRef?.current?.contains(e?.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location?.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const displayName = userProfile?.full_name || user?.email?.split('@')?.[0] || 'Usuario';
  const isAdmin = isAdminUser(user);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[100] bg-card border-b border-border shadow-sm"
        style={{ height: '64px' }}
      >
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          {/* Logo: móvil = solo pin; escritorio = pin + CoronelLocal */}
          <Link
            to="/homepage"
            className="flex items-center gap-2 shrink-0 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            aria-label="Ir al inicio"
          >
            <div
              className="flex items-center justify-center rounded-md shrink-0"
              style={{ width: '40px', height: '40px', background: 'var(--color-primary)' }}
            >
              <Icon name="MapPin" size={22} color="white" strokeWidth={2.5} />
            </div>
            <span
              className="font-heading font-700 text-lg leading-tight hidden sm:block"
              style={{ color: 'var(--color-primary)' }}
            >
              Coronel<span style={{ color: 'var(--color-accent)' }}>Local</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
            {navItems?.map((item) => (
              <Link
                key={item?.path}
                to={item?.path}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-caption font-medium
                  transition-all duration-250 ease-smooth
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${isActive(item?.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-secondary hover:bg-muted hover:text-foreground'
                  }
                `}
                aria-current={isActive(item?.path) ? 'page' : undefined}
              >
                <Icon name={item?.icon} size={16} color="currentColor" />
                {item?.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin-dashboard"
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-caption font-medium
                  transition-all duration-250 ease-smooth
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${isActive('/admin-dashboard')
                    ? 'bg-primary text-primary-foreground' :'text-secondary hover:bg-muted hover:text-foreground'
                  }
                `}
                aria-current={isActive('/admin-dashboard') ? 'page' : undefined}
              >
                <Icon name="ShieldCheck" size={16} color="currentColor" />
                Admin
              </Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Post Ad CTA */}
            <Link to="/post-classified-ad" className="hidden sm:block">
              <Button
                variant="default"
                size="sm"
                iconName="Plus"
                iconPosition="left"
                iconSize={16}
                className="btn-hover transition-all duration-250"
              >
                Publicar Aviso
              </Button>
            </Link>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-full border border-border bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Menú de usuario"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <Icon name="User" size={18} color="currentColor" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 bg-popover border border-border rounded-md shadow-lg z-[150] py-1"
                  role="menu"
                >
                  {user ? (
                    <>
                      <div className="px-4 py-2.5 border-b border-border">
                        <p className="text-xs font-caption font-semibold text-foreground truncate">{displayName}</p>
                        <p className="text-xs font-caption text-muted-foreground truncate">{user?.email}</p>
                      </div>
                      <Link
                        to="/user-account-dashboard"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-caption text-card-foreground hover:bg-muted transition-colors duration-150"
                        role="menuitem"
                      >
                        <Icon name="User" size={16} color="currentColor" />
                        Mi cuenta
                      </Link>
                      <Link
                        to="/dashboard-negocio"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-caption text-card-foreground hover:bg-muted transition-colors duration-150"
                        role="menuitem"
                      >
                        <Icon name="LayoutDashboard" size={16} color="currentColor" />
                        Mi negocio
                      </Link>
                      <Link
                        to="/mis-negocios"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-caption text-card-foreground hover:bg-muted transition-colors duration-150"
                        role="menuitem"
                      >
                        <Icon name="Building2" size={16} color="currentColor" />
                        Mis negocios
                      </Link>
                      <Link
                        to="/publicar-negocio"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-caption text-card-foreground hover:bg-muted transition-colors duration-150"
                        role="menuitem"
                      >
                        <Icon name="PlusCircle" size={16} color="currentColor" />
                        Publicar negocio
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin-dashboard"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-caption text-card-foreground hover:bg-muted transition-colors duration-150"
                          role="menuitem"
                        >
                          <Icon name="ShieldCheck" size={16} color="currentColor" />
                          Panel Admin
                        </Link>
                      )}
                      <hr className="my-1 border-border" />
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-caption text-error hover:bg-muted transition-colors duration-150"
                        role="menuitem"
                        onClick={handleSignOut}
                        style={{ color: 'var(--color-error)' }}
                      >
                        <Icon name="LogOut" size={16} color="currentColor" />
                        Cerrar sesión
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-caption text-card-foreground hover:bg-muted transition-colors duration-150"
                        role="menuitem"
                      >
                        <Icon name="LogIn" size={16} color="currentColor" />
                        Iniciar Sesión
                      </Link>
                      <Link
                        to="/signup"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-caption text-card-foreground hover:bg-muted transition-colors duration-150"
                        role="menuitem"
                      >
                        <Icon name="UserPlus" size={16} color="currentColor" />
                        Crear Cuenta
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Hamburger: 44px área táctil */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-md border border-border bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileOpen}
            >
              <Icon name={mobileOpen ? 'X' : 'Menu'} size={22} color="currentColor" />
            </button>
          </div>
        </div>
      </header>
      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[150] bg-background md:hidden"
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación móvil"
        >
          {/* Mobile Menu Header */}
          <div
            className="flex items-center justify-between px-4 border-b border-border bg-card"
            style={{ height: '64px' }}
          >
            <Link
              to="/homepage"
              className="flex items-center gap-2"
              onClick={() => setMobileOpen(false)}
            >
              <div
                className="flex items-center justify-center rounded-md"
                style={{ width: '36px', height: '36px', background: 'var(--color-primary)' }}
              >
                <Icon name="MapPin" size={20} color="white" strokeWidth={2.5} />
              </div>
              <span className="font-heading font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                Coronel<span style={{ color: 'var(--color-accent)' }}>Local</span>
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center w-10 h-10 rounded-md border border-border bg-muted transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cerrar menú"
            >
              <Icon name="X" size={20} color="currentColor" />
            </button>
          </div>

          {/* Mobile Nav Items */}
          <nav className="px-4 py-4 flex flex-col gap-1" aria-label="Navegación móvil">
            {navItems?.map((item, index) => (
              <Link
                key={item?.path}
                to={item?.path}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-md text-base font-caption font-medium
                  transition-all duration-250 ease-smooth min-h-[44px]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  animate-fade-in-up
                  ${isActive(item?.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                  }
                `}
                style={{ animationDelay: `${index * 50}ms` }}
                aria-current={isActive(item?.path) ? 'page' : undefined}
              >
                <Icon name={item?.icon} size={20} color="currentColor" />
                {item?.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin-dashboard"
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-md text-base font-caption font-medium
                  transition-all duration-250 ease-smooth min-h-[44px]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${isActive('/admin-dashboard')
                    ? 'bg-primary text-primary-foreground' :'text-foreground hover:bg-muted'
                  }
                `}
              >
                <Icon name="ShieldCheck" size={20} color="currentColor" />
                Admin
              </Link>
            )}
          </nav>

          {/* Mobile Post Ad CTA */}
          <div className="px-4 pt-2">
            <Link to="/post-classified-ad" onClick={() => setMobileOpen(false)}>
              <Button
                variant="default"
                fullWidth
                iconName="Plus"
                iconPosition="left"
                iconSize={18}
                className="min-h-[48px]"
              >
                Publicar Aviso
              </Button>
            </Link>
          </div>

          {/* Mobile User Actions */}
          <div className="px-4 pt-4 border-t border-border mt-4 mx-4 flex flex-col gap-1">
            <p className="text-xs font-caption text-muted-foreground uppercase tracking-wider mb-2 px-4">
              Mi Cuenta
            </p>
            {user ? (
              <>
                <div className="px-4 py-2">
                  <p className="text-sm font-caption font-semibold text-foreground">{displayName}</p>
                  <p className="text-xs font-caption text-muted-foreground">{user?.email}</p>
                </div>
                <Link
                  to="/user-account-dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-caption text-foreground hover:bg-muted transition-colors duration-150 min-h-[44px]"
                >
                  <Icon name="User" size={20} color="currentColor" />
                  Mi cuenta
                </Link>
                <Link
                  to="/dashboard-negocio"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-caption text-foreground hover:bg-muted transition-colors duration-150 min-h-[44px]"
                >
                  <Icon name="LayoutDashboard" size={20} color="currentColor" />
                  Mi negocio
                </Link>
                <Link
                  to="/mis-negocios"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-caption text-foreground hover:bg-muted transition-colors duration-150 min-h-[44px]"
                >
                  <Icon name="Building2" size={20} color="currentColor" />
                  Mis negocios
                </Link>
                <Link
                  to="/publicar-negocio"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-caption text-foreground hover:bg-muted transition-colors duration-150 min-h-[44px]"
                >
                  <Icon name="PlusCircle" size={20} color="currentColor" />
                  Publicar negocio
                </Link>
                <button
                  className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-caption hover:bg-muted transition-colors duration-150 min-h-[44px] w-full text-left"
                  onClick={handleSignOut}
                  style={{ color: 'var(--color-error)' }}
                >
                  <Icon name="LogOut" size={20} color="currentColor" />
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-caption text-foreground hover:bg-muted transition-colors duration-150 min-h-[44px]"
                >
                  <Icon name="LogIn" size={20} color="currentColor" />
                  Iniciar Sesión
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-caption text-foreground hover:bg-muted transition-colors duration-150 min-h-[44px]"
                >
                  <Icon name="UserPlus" size={20} color="currentColor" />
                  Crear Cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}