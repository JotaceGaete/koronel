import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import ServiceCard from './components/ServiceCard';
import { publicServicesService, PUBLIC_SERVICE_CATEGORIES } from '../../services/publicServicesService';

export default function PublicServicesListing() {
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);

  const fetchServices = useCallback(async (categoryKey) => {
    setLoading(true);
    const { data } = await publicServicesService?.getAll({
      categoryKey: categoryKey === 'all' ? undefined : categoryKey,
    });
    setServices(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices(selectedCategory);
  }, [selectedCategory, fetchServices]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta
        title="Servicios para la comunidad"
        description="Instituciones públicas y servicios esenciales de Coronel: municipalidad, salud, emergencias y atención ciudadana."
        path={location.pathname}
      />
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Page Header */}
        <div style={{ background: 'var(--color-primary)' }} className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Icon name="Landmark" size={18} color="white" />
              </div>
              <h1 className="font-heading font-bold text-xl md:text-2xl lg:text-3xl text-white">
                Servicios para la comunidad
              </h1>
            </div>
            <p className="text-white/80 text-sm ml-12">
              Instituciones públicas y servicios esenciales de Coronel.
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto py-3" role="tablist" aria-label="Categorías de servicios">
              <button
                onClick={() => setSelectedCategory('all')}
                role="tab"
                aria-selected={selectedCategory === 'all'}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-caption font-medium transition-colors duration-150 ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-secondary hover:text-foreground'
                }`}
              >
                Todas
              </button>
              {PUBLIC_SERVICE_CATEGORIES?.map((cat) => (
                <button
                  key={cat?.key}
                  onClick={() => setSelectedCategory(cat?.key)}
                  role="tab"
                  aria-selected={selectedCategory === cat?.key}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-caption font-medium transition-colors duration-150 ${
                    selectedCategory === cat?.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-secondary hover:text-foreground'
                  }`}
                >
                  {cat?.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 })?.map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : services?.length === 0 ? (
            <div className="text-center py-16">
              <Icon name="Landmark" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
              <p className="text-sm font-caption text-muted-foreground">
                Aún no hay instituciones publicadas en esta categoría.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {services?.map((service) => (
                <ServiceCard key={service?.id} service={service} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
