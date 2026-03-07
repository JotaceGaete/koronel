import React, { useState, useCallback } from 'react';
import Image from 'components/AppImage';
import Icon from 'components/AppIcon';

export default function ImageGallery({ images = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const prev = useCallback(() => setActiveIndex((i) => (i === 0 ? images?.length - 1 : i - 1)), [images?.length]);
  const next = useCallback(() => setActiveIndex((i) => (i === images?.length - 1 ? 0 : i + 1)), [images?.length]);

  if (!images?.length) return null;

  return (
    <>
      <div className="w-full">
        {/* Main Image */}
        <div className="relative w-full h-56 md:h-80 lg:h-96 overflow-hidden rounded-lg bg-muted">
          <Image
            src={images?.[activeIndex]?.src}
            alt={images?.[activeIndex]?.alt}
            className="w-full h-full object-cover"
          />
          {images?.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-card/80 border border-border shadow hover:bg-card transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Imagen anterior"
              >
                <Icon name="ChevronLeft" size={18} color="currentColor" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-card/80 border border-border shadow hover:bg-card transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Imagen siguiente"
              >
                <Icon name="ChevronRight" size={18} color="currentColor" />
              </button>
            </>
          )}
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card/80 border border-border text-xs font-caption text-foreground hover:bg-card transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Ver galería completa"
          >
            <Icon name="Maximize2" size={14} color="currentColor" />
            <span className="hidden sm:inline">Ver galería</span>
          </button>
          <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-card/80 text-xs font-data text-foreground">
            {activeIndex + 1} / {images?.length}
          </div>
        </div>

        {/* Thumbnails */}
        {images?.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {images?.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`shrink-0 w-16 h-12 md:w-20 md:h-14 rounded-md overflow-hidden border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  i === activeIndex ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                aria-label={`Ver imagen ${i + 1}`}
                aria-pressed={i === activeIndex}
              >
                <Image src={img?.src} alt={img?.alt} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Lightbox: z-[9999] para quedar siempre por encima del mapa (Leaflet usa ~1000) */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Galería de imágenes"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative z-[9999] max-w-4xl w-full"
            onClick={(e) => e?.stopPropagation()}
            role="presentation"
          >
            <button
              type="button"
              onClick={(e) => { e?.stopPropagation(); setLightboxOpen(false); }}
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-black hover:bg-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-lg"
              aria-label="Cerrar galería"
            >
              <Icon name="X" size={22} color="currentColor" />
            </button>
            <div className="relative w-full h-64 md:h-[500px] overflow-hidden rounded-lg">
              <Image
                src={images?.[activeIndex]?.src}
                alt={images?.[activeIndex]?.alt}
                className="w-full h-full object-contain bg-black"
              />
              {/* Flechas de navegación sobre la imagen (solo si hay más de una) */}
              {images?.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e?.stopPropagation(); prev(); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-lg"
                    aria-label="Imagen anterior"
                  >
                    <Icon name="ChevronLeft" size={28} color="white" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e?.stopPropagation(); next(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-lg"
                    aria-label="Imagen siguiente"
                  >
                    <Icon name="ChevronRight" size={28} color="white" />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 px-2">
              <button
                type="button"
                onClick={(e) => { e?.stopPropagation(); prev(); }}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white/90 text-black hover:bg-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-lg"
                aria-label="Imagen anterior"
              >
                <Icon name="ChevronLeft" size={22} color="currentColor" />
              </button>
              <span className="text-white text-sm font-data font-medium">{activeIndex + 1} / {images?.length}</span>
              <button
                type="button"
                onClick={(e) => { e?.stopPropagation(); next(); }}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white/90 text-black hover:bg-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-lg"
                aria-label="Imagen siguiente"
              >
                <Icon name="ChevronRight" size={22} color="currentColor" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}