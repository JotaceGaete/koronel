// Route: /dashboard-negocio
// Protected: requires authentication
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { businessService } from '../../services/businessService';
import { supabase } from '../../lib/supabase';
import OwnerBusinessCard from './components/OwnerBusinessCard';
import EditBusinessModal from '../user-business-dashboard/components/EditBusinessModal';
import ReviewsTab from './components/ReviewsTab';
import StatsTab from './components/StatsTab';
import MessagesTab from './components/MessagesTab';

const TABS = [
  { id: 'businesses', label: 'Mis Negocios', icon: 'Building2' },
  { id: 'reviews', label: 'Reseñas', icon: 'Star' },
  { id: 'stats', label: 'Estadísticas', icon: 'BarChart2' },
  { id: 'messages', label: 'Mensajes', icon: 'MessageSquare' },
];

export default function BusinessOwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('businesses');
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [unansweredCount, setUnansweredCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/dashboard-negocio' } });
      return;
    }
    loadBusinesses();
  }, [user]);

  const loadBusinesses = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await businessService?.getByOwner(user?.id);
    if (err) {
      setError('Error al cargar tus negocios. Intenta de nuevo.');
    } else {
      setBusinesses(data || []);
      // Load unanswered reviews count
      if (data?.length > 0) {
        const ids = data?.map(b => b?.id);
        const { count } = await supabase
          ?.from('business_reviews')
          ?.select('*', { count: 'exact', head: true })
          ?.in('business_id', ids)
          ?.is('owner_reply', null);
        setUnansweredCount(count || 0);
      }
    }
    setLoading(false);
  }, [user]);

  const handleEditSave = async (id, payload, logoFile, photoFiles) => {
    const { error: updateErr } = await businessService?.update(id, payload);
    if (updateErr) throw new Error(updateErr?.message || 'Error al actualizar.');
    if (logoFile) {
      const { path, error: uploadErr } = await businessService?.uploadImage(logoFile, id);
      if (!uploadErr && path) {
        await businessService?.addImage({ businessId: id, storagePath: path, altText: `Logo de ${payload?.name}`, isPrimary: true, sortOrder: 0 });
      }
    }
    if (photoFiles?.length > 0) {
      for (let i = 0; i < photoFiles?.length; i++) {
        const { path, error: uploadErr } = await businessService?.uploadImage(photoFiles?.[i], id);
        if (!uploadErr && path) {
          await businessService?.addImage({ businessId: id, storagePath: path, altText: `Foto ${i + 1}`, isPrimary: false, sortOrder: i + 10 });
        }
      }
    }
    setEditingBusiness(null);
    setSuccessMsg('Negocio actualizado correctamente.');
    setTimeout(() => setSuccessMsg(null), 4000);
    loadBusinesses();
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')?.[0] || 'Propietario';

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Page Header */}
        <div style={{ background: 'var(--color-primary)' }} className="px-4 md:px-6 py-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="font-heading font-bold text-xl text-white">Panel de Propietario</h1>
              <p className="text-white/80 text-sm font-caption mt-0.5">Bienvenido, {displayName}</p>
            </div>
            <Link
              to="/publicar-negocio"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
            >
              <Icon name="Plus" size={16} color="currentColor" />
              <span className="hidden sm:inline">Publicar negocio</span>
              <span className="sm:hidden">Nuevo</span>
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: '#dcfce7', color: '#166534' }}>
              <Icon name="CheckCircle" size={16} color="currentColor" />
              {successMsg}
            </div>
          )}

          <div className="flex gap-6 flex-col md:flex-row">
            {/* Sidebar Tabs */}
            <aside className="md:w-52 flex-shrink-0">
              <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                {TABS?.map(tab => (
                  <button
                    key={tab?.id}
                    onClick={() => setActiveTab(tab?.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 md:flex-shrink md:w-full ${
                      activeTab === tab?.id
                        ? 'text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    style={activeTab === tab?.id ? { background: 'var(--color-primary)' } : {}}
                  >
                    <Icon name={tab?.icon} size={16} color="currentColor" />
                    <span>{tab?.label}</span>
                    {tab?.id === 'reviews' && unansweredCount > 0 && (
                      <span
                        className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          activeTab === tab?.id ? 'bg-white' : 'bg-primary text-white'
                        }`}
                        style={activeTab === tab?.id ? { color: 'var(--color-primary)' } : { background: 'var(--color-primary)' }}
                      >
                        {unansweredCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {/* Tab: Mis Negocios */}
              {activeTab === 'businesses' && (
                <div>
                  {loading ? (
                    <div className="py-16 text-center">
                      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                      <p className="text-sm text-muted-foreground">Cargando tus negocios...</p>
                    </div>
                  ) : error ? (
                    <div className="py-12 text-center">
                      <Icon name="AlertCircle" size={40} color="var(--color-error)" className="mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">{error}</p>
                      <button onClick={loadBusinesses} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--color-primary)' }}>Reintentar</button>
                    </div>
                  ) : businesses?.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-muted)' }}>
                        <Icon name="Building2" size={32} color="var(--color-muted-foreground)" />
                      </div>
                      <h3 className="font-heading font-semibold text-foreground mb-2">Aún no tienes negocios registrados</h3>
                      <p className="text-sm text-muted-foreground mb-6">Publica tu negocio en el directorio de Coronel y llega a más clientes.</p>
                      <Link
                        to="/publicar-negocio"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-colors"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        <Icon name="Plus" size={18} color="white" />
                        Publicar mi primer negocio
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {businesses?.map(biz => (
                        <OwnerBusinessCard
                          key={biz?.id}
                          business={biz}
                          onEdit={() => setEditingBusiness(biz)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Reseñas */}
              {activeTab === 'reviews' && (
                <ReviewsTab businesses={businesses} />
              )}

              {/* Tab: Estadísticas */}
              {activeTab === 'stats' && (
                <StatsTab businesses={businesses} />
              )}

              {/* Tab: Mensajes */}
              {activeTab === 'messages' && (
                <MessagesTab />
              )}
            </main>
          </div>
        </div>
      </div>

      {editingBusiness && (
        <EditBusinessModal
          business={editingBusiness}
          onClose={() => setEditingBusiness(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
