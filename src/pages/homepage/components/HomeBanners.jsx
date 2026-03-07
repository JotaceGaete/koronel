import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bannerService } from '../../../services/bannerService';

const POSITION_HOME_TOP = 'homepage_top';
const MAX_BANNERS = 2;

export default function HomeBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await bannerService.getActiveByPosition(POSITION_HOME_TOP, MAX_BANNERS);
      if (!cancelled) {
        setBanners(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || banners?.length === 0) return null;

  return (
    <section className="w-full px-4 md:px-6 lg:px-8 py-6 md:py-8" aria-label="Banners destacados">
      <div className="max-w-7xl mx-auto">
        <div className={`grid gap-4 md:gap-6 ${banners?.length === 1 ? 'grid-cols-1 max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
          {banners?.map((b) => {
            const img = b?.image_url;
            const content = (
              <div className="group relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 aspect-[21/9] min-h-[120px] md:min-h-[140px]">
                {img ? (
                  <img
                    src={img}
                    alt={b?.title || 'Banner'}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50" aria-hidden>
                    <span className="text-sm text-muted-foreground font-caption">Sin imagen</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {b?.title && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <span className="text-sm font-caption font-medium drop-shadow-md">{b.title}</span>
                  </div>
                )}
              </div>
            );
            if (b?.link_url?.trim()) {
              const isExternal = /^https?:\/\//i.test(b.link_url.trim());
              if (isExternal) {
                return (
                  <a
                    key={b?.id}
                    href={b.link_url.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
                  >
                    {content}
                  </a>
                );
              }
              return (
                <Link key={b?.id} to={b.link_url.trim()} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl">
                  {content}
                </Link>
              );
            }
            return <div key={b?.id}>{content}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
