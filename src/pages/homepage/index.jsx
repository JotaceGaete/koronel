import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import HeroSection from './components/HeroSection';
import RecentContentSection from './components/RecentContentSection';
import FeaturedBusinesses from './components/FeaturedBusinesses';
import UpcomingEvents from './components/UpcomingEvents';
import PostAdCTA from './components/PostAdCTA';
import FooterSection from './components/FooterSection';
import WelcomePopup from './components/WelcomePopup';
import { cityConfig } from 'config/cityConfig';

function CommunityHighlight() {
  return (
    <section className="w-full py-8 px-4 md:px-6 lg:px-8 border-b border-border/60">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-base text-foreground">
            Comunidad
          </h2>
          <Link to="/comunidad" className="text-xs text-primary hover:underline font-caption">
            Ver todo
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-caption text-foreground font-medium mb-1">
              ¿Buscás algo en {cityConfig.name}?
            </p>
            <p className="text-xs text-muted-foreground">
              Pregunta a la comunidad — negocios, servicios, recomendaciones. Alguien sabe.
            </p>
          </div>
          <Link
            to="/comunidad/nueva"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-caption font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            Hacer una pregunta
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Homepage() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col w-full max-w-full overflow-x-hidden" style={{ background: 'var(--color-background)' }}>
      <PageMeta
        title="Inicio"
        description={`Descubre negocios y emprendimientos en ${cityConfig.name}. ${cityConfig.heroSubtitle}`}
        path={location.pathname}
      />
      <Header />
      <WelcomePopup />

      <main className="flex-1 flex flex-col" style={{ paddingTop: '64px' }}>
        <HeroSection />
        <CommunityHighlight />
        <RecentContentSection />
        <FeaturedBusinesses />
        <UpcomingEvents />
        <PostAdCTA />
        <FooterSection />
      </main>
    </div>
  );
}
