import React from 'react';
import { useLocation } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import HeroSection from './components/HeroSection';
import RecentContentSection from './components/RecentContentSection';
import FeaturedBusinesses from './components/FeaturedBusinesses';
import RecentClassifiedAds from './components/RecentClassifiedAds';
import UpcomingEvents from './components/UpcomingEvents';
import PostAdCTA from './components/PostAdCTA';
import FooterSection from './components/FooterSection';
import WelcomePopup from './components/WelcomePopup';
import LatestJobs from './components/LatestJobs';

export default function Homepage() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col w-full max-w-full overflow-x-hidden" style={{ background: 'var(--color-background)' }}>
      <PageMeta title="Inicio" description="Descubre negocios, clasificados, eventos, empleos y comunidad en Coronel y la región." path={location.pathname} />
      <Header />
      <WelcomePopup />

      {/* Main content offset for fixed header */}
      <main className="flex-1 flex flex-col" style={{ paddingTop: '64px' }}>
        <HeroSection />
        <RecentContentSection />
        <FeaturedBusinesses />
        <UpcomingEvents />
        <LatestJobs />
        <RecentClassifiedAds />
        <PostAdCTA />
        <FooterSection />
      </main>
    </div>
  );
}