import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';

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
            <Icon name="PlusCircle" size={28} color="white" />
          </div>
          <h2 className="font-heading font-bold text-xl md:text-2xl lg:text-3xl text-white mb-2">
            ¿Tienes algo que vender o ofrecer?
          </h2>
          <p className="text-sm md:text-base mb-6" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Publica tu aviso gratis y llega a miles de personas en Coronel.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/post-classified-ad">
              <Button
                variant="secondary"
                size="lg"
                iconName="Plus"
                iconPosition="left"
                iconSize={18}
                className="min-w-[180px]"
              >
                Publicar Aviso Gratis
              </Button>
            </Link>
            <Link to="/business-directory-listing">
              <Button
                variant="ghost"
                size="lg"
                iconName="Building2"
                iconPosition="left"
                iconSize={18}
                className="text-white border-white border min-w-[180px]"
              >
                Registrar Negocio
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Floating FAB */}
      <Link
        to="/post-classified-ad"
        className="fixed bottom-6 right-6 z-[90] flex items-center gap-2 px-4 py-3 rounded-full shadow-xl text-white font-caption font-semibold text-sm transition-all duration-250 hover:scale-105 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ background: 'var(--color-primary)' }}
        aria-label="Publicar aviso clasificado"
      >
        <Icon name="Plus" size={20} color="white" />
        <span className="hidden sm:inline">Publicar Aviso</span>
      </Link>
    </>
  );
}