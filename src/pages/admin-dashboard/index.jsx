import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import AdminBusinesses from './components/AdminBusinesses';
import AdminCategories from './components/AdminCategories';
import AdminClaimRequests from './components/AdminClaimRequests';
import AdminClassifiedAds from './components/AdminClassifiedAds';
import AdminFeaturedListings from './components/AdminFeaturedListings';
import AdminBanners from './components/AdminBanners';
import AdminPopups from './components/AdminPopups';
import AdminEvents from './components/AdminEvents';
import AdminCommunity from './components/AdminCommunity';
import AdminEmpleos from './components/AdminEmpleos';
import AdminIncompleteBusinesses from './components/AdminIncompleteBusinesses';
import AdminNotificationsPanel from 'components/admin/AdminNotificationsPanel';

const NAV_ITEMS = [
  { id: 'businesses', label: 'Negocios', icon: 'Building2' },
  { id: 'incomplete', label: 'Negocios incompletos', icon: 'FileText' },
  { id: 'categories', label: 'Categorías', icon: 'LayoutGrid' },
  { id: 'claims', label: 'Reclamaciones', icon: 'FileCheck' },
  { id: 'ads', label: 'Clasificados', icon: 'Tag' },
  { id: 'featured', label: 'Destacados', icon: 'Star' },
  { id: 'banners', label: 'Banners', icon: 'Image' },
  { id: 'popups', label: 'Popups', icon: 'MessageSquare' },
  { id: 'events', label: 'Eventos', icon: 'CalendarDays' },
  { id: 'community', label: 'Comunidad', icon: 'MessageCircle' },
  { id: 'empleos', label: 'Empleos', icon: 'Briefcase' },
];

const SECTION_MAP = {
  businesses: AdminBusinesses,
  incomplete: AdminIncompleteBusinesses,
  categories: AdminCategories,
  claims: AdminClaimRequests,
  ads: AdminClassifiedAds,
  featured: AdminFeaturedListings,
  banners: AdminBanners,
  popups: AdminPopups,
  events: AdminEvents,
  community: AdminCommunity,
  empleos: AdminEmpleos,
};

function isAdminUser(user) {
  if (!user) return false;
  const meta = user?.user_metadata || {};
  const appMeta = user?.app_metadata || {};
  return meta?.role === 'admin' || appMeta?.role === 'admin';
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('businesses');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location?.search || '');
    const section = params.get('section');
    if (section && SECTION_MAP?.[section]) setActiveSection(section);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeSection]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdminUser(user)) {
    return <Navigate to="/login" replace />;
  }

  const ActiveComponent = SECTION_MAP?.[activeSection] || AdminBusinesses;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ paddingTop: '64px' }}>
      {/* Admin Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-[90] h-16 bg-card border-b border-border flex items-center px-4 gap-3" style={{ marginTop: '0' }}>
        <div className="flex items-center gap-3 flex-1">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-md border border-border bg-muted hover:bg-primary hover:text-primary-foreground transition-all"
            aria-label="Abrir menú"
          >
            <Icon name="Menu" size={18} color="currentColor" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md" style={{ background: 'var(--color-primary)' }}>
              <Icon name="ShieldCheck" size={15} color="white" />
            </div>
            <span className="font-heading font-bold text-foreground text-sm">Panel de Administración</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/ingreso-rapido" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Icon name="Camera" size={14} color="currentColor" />
            Ingreso rápido
          </a>
          <AdminNotificationsPanel onNavigate={(section) => setActiveSection(section)} />
          <a href="/homepage" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="ArrowLeft" size={14} color="currentColor" />
            Volver al sitio
          </a>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden" style={{ marginTop: '64px' }}>
        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-[80] bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static top-[128px] bottom-0 left-0 z-[85]
            w-56 bg-card border-r border-border flex flex-col
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="flex-1 py-4 overflow-y-auto">
            <p className="px-4 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Gestión</p>
            {NAV_ITEMS?.map(item => (
              <button
                key={item?.id}
                onClick={() => setActiveSection(item?.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150
                  ${activeSection === item?.id
                    ? 'text-white' :'text-secondary hover:bg-muted hover:text-foreground'
                  }
                `}
                style={activeSection === item?.id ? { background: 'var(--color-primary)' } : {}}
              >
                <Icon name={item?.icon} size={17} color="currentColor" />
                {item?.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-6xl mx-auto">
            <ActiveComponent />
          </div>
        </main>
      </div>
    </div>
  );
}
