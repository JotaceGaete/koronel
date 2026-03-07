import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from 'components/ui/Button';
import FeaturedContentCarousel from 'components/ui/FeaturedContentCarousel';
import { adService } from '../../../services/adService';

const FALLBACK_ADS = [
  { id: 1, title: 'Toyota Corolla 2019 - Excelente estado', price: 9500000, category: 'Vehículos', image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1868ff5f6-1772638689088.png', imageAlt: 'Silver Toyota Corolla 2019 sedan in excellent condition parked on street in Coronel Chile', timeAgo: 'Hace 2 horas', featured: true },
  { id: 2, title: 'Departamento 2D/1B en arriendo - Centro Coronel', price: 280000, category: 'Inmuebles', image: 'https://img.rocket.new/generatedImages/rocket_gen_img_1c2c53dd8-1772638690545.png', imageAlt: 'Modern two bedroom apartment interior with natural light and contemporary furnishings in Coronel center', timeAgo: 'Hace 5 horas', featured: true },
  { id: 3, title: 'iPhone 13 Pro 256GB - Como nuevo', price: 650000, category: 'Electrónica', image: 'https://images.unsplash.com/photo-1664114780064-41d0dd873e92', imageAlt: 'iPhone 13 Pro in pristine condition with original box and accessories displayed on white background', timeAgo: 'Hace 1 día', featured: false },
  { id: 4, title: 'Bicicleta de montaña Trek - Poco uso', price: 180000, category: 'Deportes', image: 'https://images.unsplash.com/photo-1668793392852-c7280b553aa6', imageAlt: 'Trek mountain bike in good condition with minimal use leaning against wall outdoors in Coronel', timeAgo: 'Hace 2 días', featured: false },
];

export default function RecentClassifiedAds() {
  const [ads, setAds] = useState(FALLBACK_ADS);

  useEffect(() => {
    let mounted = true;
    adService?.getRecent(6)?.then(({ data, error }) => {
      if (!mounted) return;
      if (!error && data?.length > 0) {
        setAds(data?.map(ad => adService?.formatAd(ad)));
      }
    });
    return () => { mounted = false; };
  }, []);

  return (
    <section className="w-full py-12 md:py-14 lg:py-16 px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <FeaturedContentCarousel
          items={ads}
          type="classified"
          title="Clasificados Recientes" />
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