import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import { businessService } from '../../../services/businessService';
import { adService } from '../../../services/adService';

const LIMIT = 8;

function humanizeCategory(key) {
  if (!key || typeof key !== 'string') return '';
  return key
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function useRecentContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [businessRes, adsRes] = await Promise.all([
        businessService?.getAll({ sort: 'newest', page: 1, pageSize: LIMIT }),
        adService?.getRecent(LIMIT),
      ]);

      if (cancelled) return;

      const businessList = (businessRes?.data || []).map((b) => {
        const primaryImg = b?.business_images?.find((i) => i?.is_primary) || b?.business_images?.[0];
        const image = primaryImg?.storage_path
          ? primaryImg?.storage_path?.startsWith('http')
            ? primaryImg?.storage_path
            : businessService?.getImageUrl(primaryImg?.storage_path)
          : null;
        return {
          type: 'business',
          id: b?.id,
          title: b?.name,
          category: b?.category_key ? humanizeCategory(b.category_key) : 'Negocio',
          sector: 'Coronel',
          image,
          imageAlt: primaryImg?.alt_text || b?.name,
          link: `/business-profile-page?id=${b?.id}`,
          phone: b?.phone,
          whatsapp: b?.whatsapp,
          created_at: b?.created_at,
        };
      });

      const adsRaw = adsRes?.data || [];
      const adList = adsRaw?.map((ad) => {
        const formatted = adService?.formatAd?.(ad) || ad;
        return {
          type: 'classified',
          id: ad?.id,
          title: ad?.title,
          category: ad?.category_key ? humanizeCategory(ad.category_key) : 'Clasificado',
          image: formatted?.image,
          imageAlt: formatted?.imageAlt || ad?.title,
          link: `/clasificados/${ad?.id}`,
          ctaLabel: 'Ver aviso',
          created_at: ad?.created_at,
        };
      });

      const merged = [...businessList, ...adList]
        .filter((x) => x?.created_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, LIMIT * 2);

      setItems(merged);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { items, loading };
}

function BusinessCard({ item }) {
  const hasContact = item?.phone || item?.whatsapp;
  return (
    <article className="flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Imagen protagonista — relación 3:2, bordes suaves */}
      <div className="relative aspect-[3/2] overflow-hidden bg-muted shrink-0 rounded-t-2xl">
        {item?.image ? (
          <Image
            src={item.image}
            alt={item?.imageAlt || item?.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted" aria-hidden>
            <Icon name="Building2" size={36} color="var(--color-muted-foreground)" />
          </div>
        )}
        <span className="absolute top-2 left-2 px-2 py-1 text-xs font-caption font-medium rounded-lg bg-card/95 text-card-foreground backdrop-blur-sm">
          {item?.category}
        </span>
      </div>
      <div className="p-3 flex flex-col flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-base text-card-foreground line-clamp-1 mb-0.5">{item?.title}</h3>
        {item?.sector && <p className="text-xs text-muted-foreground mb-3">{item.sector}</p>}
        <div className="mt-auto flex flex-col gap-2">
          <Link
            to={item?.link}
            className="min-h-[44px] w-full inline-flex items-center justify-center px-4 rounded-xl text-sm font-caption font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
          >
            Ver negocio
          </Link>
          {hasContact && (
            <div className="flex gap-2">
              {item?.phone && (
                <a
                  href={`tel:${item.phone}`}
                  className="flex-1 min-h-[44px] min-w-0 inline-flex items-center justify-center gap-2 px-3 rounded-xl border border-border text-sm font-caption font-semibold text-foreground hover:bg-muted transition-colors"
                  aria-label="Llamar"
                >
                  <Icon name="Phone" size={18} color="currentColor" className="shrink-0" />
                  <span className="truncate">Llamar</span>
                </a>
              )}
              <a
                href={`https://wa.me/${(item?.whatsapp || item?.phone)?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] min-w-0 inline-flex items-center justify-center gap-2 px-3 rounded-xl text-sm font-caption font-semibold text-white hover:opacity-90 transition-opacity shrink-0"
                style={{ background: '#25D366' }}
                aria-label="WhatsApp"
              >
                <Icon name="MessageCircle" size={18} color="white" className="shrink-0" />
                <span className="truncate">WhatsApp</span>
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
    <article className="flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="relative aspect-[3/2] overflow-hidden bg-muted shrink-0 rounded-t-2xl">
        {item?.image ? (
          <Image src={item.image} alt={item?.imageAlt || item?.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted" aria-hidden>
            <Icon name="Tag" size={36} color="var(--color-muted-foreground)" />
          </div>
        )}
        <span className="absolute top-2 left-2 px-2 py-1 text-xs font-caption font-medium rounded-lg bg-card/95 text-card-foreground backdrop-blur-sm">
          {item?.category}
        </span>
      </div>
      <div className="p-3 flex flex-col flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-base text-card-foreground line-clamp-2 mb-0.5">{item?.title}</h3>
        <Link
          to={item?.link}
          className="mt-auto min-h-[44px] inline-flex items-center justify-center px-4 rounded-xl text-sm font-caption font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
        >
          Ver aviso
        </Link>
      </div>
    </article>
  );
}

function Card({ item }) {
  return item?.type === 'business' ? <BusinessCard item={item} /> : <ClassifiedCard item={item} />;
}

export default function RecentContentSection() {
  const { items, loading } = useRecentContent();

  if (loading) {
    return (
      <section className="w-full py-10 md:py-14 px-4 md:px-6 lg:px-8" aria-label="Contenido reciente">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading font-bold text-xl md:text-2xl text-foreground mb-6">Reciente</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 lg:grid-cols-4 scrollbar-hide">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="shrink-0 w-[280px] md:w-auto h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!items?.length) return null;

  return (
    <section className="w-full py-10 md:py-14 px-4 md:px-6 lg:px-8" style={{ background: 'var(--color-background)' }} aria-label="Contenido reciente">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5 md:mb-6">
          <div>
            <h2 className="font-heading font-bold text-xl md:text-2xl text-foreground">
              Reciente
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Negocios y avisos recién agregados</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/business-directory-listing"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-sm font-caption font-semibold text-primary hover:underline py-2"
            >
              Negocios
            </Link>
            <Link
              to="/classified-ads-listing"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-sm font-caption font-semibold text-primary hover:underline py-2"
            >
              Clasificados
            </Link>
          </div>
        </div>

        {/* Mobile: horizontal scroll con snap, sin JS pesado */}
        <div
          className="flex gap-5 overflow-x-auto overflow-y-hidden pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {items.map((item) => (
            <div
              key={`${item?.type}-${item?.id}`}
              className="shrink-0 w-[280px] md:w-auto snap-start"
            >
              <Card item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
