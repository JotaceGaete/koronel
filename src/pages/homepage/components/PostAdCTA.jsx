import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { cityConfig } from 'config/cityConfig';

export default function PostAdCTA() {
  return (
    <>
      {/* Inline CTA Banner */}
      <section
        className="w-full py-10 md:py-12 lg:py-14 px-4 md:px-6 lg:px-8"
        style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, #b7851f 100%)' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white bg-opacity-20 mx-auto mb-4">
            <Icon name="Store" size={28} color="white" />
          </div>
          <h2 className="font-heading font-bold text-xl md:text-2xl lg:text-3xl text-white mb-2">
            ¿Tenés un negocio o emprendimiento en {cityConfig.name}?
          </h2>
          <p className="text-sm md:text-base mb-6" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Aparece en el directorio gratis. Solo necesitas nombre, categoría y teléfono.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/publicar-negocio">
              <Button
                variant="secondary"
                size="lg"
                iconName="Plus"
                iconPosition="left"
                iconSize={18}
                className="min-w-[220px]"
              >
                Publicar mi negocio o emprendimiento
              </Button>
            </Link>
            <Link to="/directorio-negocios">
              <Button
                variant="ghost"
                size="lg"
                iconName="Search"
                iconPosition="left"
                iconSize={18}
                className="text-white border-white border min-w-[180px]"
              >
                Ver el directorio
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Floating FAB */}
      <Link
        to="/publicar-negocio"
        className="fixed bottom-6 right-6 z-[90] flex items-center gap-2 px-4 py-3 rounded-full shadow-xl text-white font-caption font-semibold text-sm transition-all duration-250 hover:scale-105 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ background: 'var(--color-primary)' }}
        aria-label="Publicar negocio o emprendimiento"
      >
        <Icon name="Plus" size={20} color="white" />
        <span className="hidden sm:inline">Publicar negocio</span>
      </Link>
    </>
  );
}
