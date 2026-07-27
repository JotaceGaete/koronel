import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from 'components/ui/Button';
import FeaturedContentCarousel from 'components/ui/FeaturedContentCarousel';
import { adService } from '../../../services/adService';
import { useCity } from '../../../contexts/CityContext';

export default function RecentClassifiedAds() {
  const { communityCityId } = useCity();
  const [ads, setAds] = useState([]);

  useEffect(() => {
    let cancelled = false;

    // Al iniciar cada carga (incluida la de un cambio de ciudad) se limpia
    // de inmediato, para no dejar visibles los clasificados reales de la
    // ciudad anterior mientras resuelve la nueva.
    setAds([]);

    adService?.getRecent({ limit: 6, communityCityId })?.then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data?.length > 0) {
        setAds(data?.map(ad => adService?.formatAd(ad)));
      }
    });

    return () => { cancelled = true; };
  }, [communityCityId]);

  return (
    <section className="w-full py-12 md:py-14 lg:py-16 px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {ads?.length > 0 ? (
          <FeaturedContentCarousel
            items={ads}
            type="classified"
            title="Clasificados Recientes" />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground font-caption mb-4">Aún no hay clasificados recientes en esta ciudad.</p>
          </div>
        )}
        <div className="mt-6 text-center">
          <Link to="/classified-ads-listing">
            <Button variant="outline" iconName="Tag" iconPosition="left" iconSize={16}>
              Ver todos los clasificados
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}