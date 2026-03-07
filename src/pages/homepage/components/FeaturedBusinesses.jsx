import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from 'components/ui/Button';
import Icon from 'components/AppIcon';
import FeaturedContentCarousel from 'components/ui/FeaturedContentCarousel';
import { businessService } from '../../../services/businessService';

function formatBusiness(b) {
  const primaryImg = b?.business_images?.find(img => img?.is_primary) || b?.business_images?.[0];
  const image = primaryImg?.storage_path
    ? (primaryImg?.storage_path?.startsWith('http') ? primaryImg?.storage_path : businessService?.getImageUrl(primaryImg?.storage_path))
    : null;
  return {
    id: b?.id,
    name: b?.name,
    category: b?.category,
    rating: b?.rating,
    address: b?.address,
    phone: b?.phone,
    whatsapp: b?.whatsapp,
    featured: b?.featured,
    image: image ?? null,
    imageAlt: primaryImg?.alt_text || `${b?.name} - negocio en Coronel`,
  };
}

export default function FeaturedBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: featured, error: featError } = await businessService?.getFeatured(6) ?? {};
      if (!mounted) return;
      if (!featError && Array.isArray(featured) && featured?.length > 0) {
        setBusinesses(featured?.map(formatBusiness) ?? []);
        setLoading(false);
        return;
      }
      // Si no hay destacados, mostrar los últimos negocios publicados
      const { data: recent, error: recentError } = await businessService?.getAll({ page: 1, pageSize: 6, sort: 'newest' }) ?? {};
      if (!mounted) return;
      if (!recentError && Array.isArray(recent) && recent?.length > 0) {
        setBusinesses(recent?.map(formatBusiness) ?? []);
      }
      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="w-full py-12 md:py-14 lg:py-16 px-4 md:px-6 lg:px-8" style={{ background: 'var(--color-muted)' }}>
      <div className="max-w-7xl mx-auto">
        {loading || !businesses?.length ? (
          <>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2 mb-4">
              <Icon name="Building2" size={22} color="var(--color-accent)" />
              Negocios Destacados
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm font-caption">Cargando destacados…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground font-caption mb-4">Aún no hay negocios destacados. Revisa el directorio completo.</p>
              </div>
            )}
          </>
        ) : (
          <FeaturedContentCarousel
            items={businesses}
            type="business"
            title="Negocios Destacados"
            autoPlay
            autoPlayInterval={5000}
          />
        )}

        <div className="mt-6 text-center">
          <Link to="/business-directory-listing" className="inline-flex min-h-[44px] items-center justify-center">
            <Button variant="outline" size="lg" iconName="Building2" iconPosition="left" iconSize={16} className="min-h-[44px]">
              Ver todos los negocios
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}