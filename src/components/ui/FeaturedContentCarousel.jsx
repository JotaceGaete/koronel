import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';

export default function FeaturedContentCarousel({
  items = [],
  type = 'business', // 'business' | 'classified'
  title = 'Destacados',
  autoPlay = true,
  autoPlayInterval = 4000,
  className = '',
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1); // mobile: 1, desktop: 3
  const autoPlayRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setVisibleCount(mq.matches ? 3 : 1);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const maxIndex = Math.max(0, items?.length - visibleCount);

  const goTo = useCallback((index) => {
    setCurrentIndex(Math.max(0, Math.min(index, maxIndex)));
  }, [maxIndex]);

  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  useEffect(() => {
    if (!autoPlay || items?.length <= visibleCount) return;
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, autoPlayInterval);
    return () => clearInterval(autoPlayRef?.current);
  }, [autoPlay, autoPlayInterval, maxIndex, items?.length]);

  const handleTouchStart = (e) => {
    setDragStart(e?.touches?.[0]?.clientX);
    setIsDragging(true);
    clearInterval(autoPlayRef?.current);
  };

  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    const delta = dragStart - e?.changedTouches?.[0]?.clientX;
    if (Math.abs(delta) > 50) {
      delta > 0 ? next() : prev();
    }
    setIsDragging(false);
  };

  if (!items?.length) return null;

  return (
    <section className={`w-full ${className}`} aria-label={title}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
          <Icon
            name={type === 'business' ? 'Building2' : 'Tag'}
            size={22}
            color="var(--color-accent)"
          />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            disabled={currentIndex === 0}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-md border border-border bg-card text-secondary hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Anterior"
          >
            <Icon name="ChevronLeft" size={18} color="currentColor" />
          </button>
          <button
            onClick={next}
            disabled={currentIndex >= maxIndex}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-md border border-border bg-card text-secondary hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Siguiente"
          >
            <Icon name="ChevronRight" size={18} color="currentColor" />
          </button>
        </div>
      </div>
      {/* Track */}
      <div
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        ref={trackRef}
      >
        <div
          className="flex gap-5 transition-transform duration-250 ease-smooth"
          style={{ transform: `translateX(calc(-${currentIndex} * (100% / ${visibleCount})))` }}
        >
          {items?.map((item, index) => (
            <div
              key={item?.id || index}
              className="shrink-0 animate-fade-in-up"
              style={{
                width: `calc(100% / ${visibleCount} - ${(visibleCount - 1) * 20 / visibleCount}px)`,
                animationDelay: `${index * 100}ms`,
              }}
            >
              {type === 'business' ? (
                <BusinessCard item={item} />
              ) : (
                <ClassifiedCard item={item} />
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Dots */}
      {items?.length > visibleCount && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 mt-4" role="tablist" aria-label="Indicadores de carrusel">
          {Array.from({ length: maxIndex + 1 })?.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                i === currentIndex ? 'bg-primary' : 'bg-border hover:bg-secondary'
              }`}
              style={{ width: i === currentIndex ? 24 : 8, height: 8 }}
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`Ir a elemento ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BusinessCard({ item }) {
  const hasContact = item?.phone || item?.whatsapp;
  return (
    <article className="flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="relative aspect-[3/2] overflow-hidden bg-muted shrink-0 rounded-t-2xl">
        {item?.image ? (
          <Image
            src={item.image}
            alt={item?.imageAlt || `Imagen de ${item?.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted" aria-hidden>
            <Icon name="Building2" size={36} color="var(--color-muted-foreground)" />
          </div>
        )}
        {item?.featured && (
          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-caption font-semibold rounded-lg bg-card/95 backdrop-blur-sm" style={{ color: 'var(--color-accent-foreground)', background: 'var(--color-accent)' }}>
            Destacado
          </span>
        )}
        {item?.category && (
          <span className="absolute top-2 right-2 px-2 py-1 text-xs font-caption font-medium rounded-lg bg-card/95 text-card-foreground backdrop-blur-sm">
            {item.category}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-base text-card-foreground line-clamp-1 mb-0.5">{item?.name}</h3>
        <p className="text-xs text-muted-foreground mb-3">Coronel</p>
        <div className="mt-auto flex flex-col gap-2">
          <Link
            to={`/business-profile-page?id=${item?.id}`}
            className="min-h-[44px] w-full inline-flex items-center justify-center px-4 rounded-xl text-sm font-caption font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
          >
            Ver negocio
          </Link>
          {hasContact && (
            <div className="flex gap-2 min-w-0">
              {item?.phone && (
                <a
                  href={`tel:${item.phone}`}
                  className="flex-1 min-h-[44px] min-w-0 inline-flex items-center justify-center gap-2 px-3 rounded-xl border border-border text-sm font-caption font-semibold text-foreground hover:bg-muted transition-colors"
                  aria-label="Llamar"
                >
                  <Icon name="Phone" size={18} color="currentColor" className="shrink-0" />
                  <span>Llamar</span>
                </a>
              )}
              <a
                href={`https://wa.me/${(item?.whatsapp || item?.phone)?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] min-w-0 inline-flex items-center justify-center gap-2 px-3 rounded-xl text-sm font-caption font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: '#25D366' }}
                aria-label="WhatsApp"
              >
                <Icon name="MessageCircle" size={18} color="white" className="shrink-0" />
                <span>WhatsApp</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ClassifiedCard({ item }) {
  return (
    <Link
      to={`/clasificados/${item?.id}`}
      className="block bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-muted rounded-t-2xl">
        <Image
          src={item?.image}
          alt={item?.imageAlt || `Imagen de ${item?.title}`}
          className="w-full h-full object-cover"
        />
        {item?.featured && (
          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-caption font-semibold rounded-lg bg-card/95 backdrop-blur-sm" style={{ background: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}>
            Destacado
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-heading font-semibold text-base text-card-foreground line-clamp-2 mb-0.5">{item?.title}</h3>
        <p className="text-xs text-muted-foreground">{item?.price ? `$${item?.price?.toLocaleString('es-CL')}` : 'Precio a convenir'}</p>
      </div>
    </Link>
  );
}