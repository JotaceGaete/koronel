// Route: /acciones/:slug — Detalle público de acción comercial
import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import Image from 'components/AppImage';
import Icon from 'components/AppIcon';
import { actionService } from '../../services/actionService';
import { ACTION_TYPE_LABELS } from '../../lib/intentToSuggestion';
import UrgencyBar from './components/UrgencyBar';

function RedemptionMeter({ count, max }) {
  if (!max) return null;
  const pct = Math.min(100, Math.round((count / max) * 100));
  const remaining = max - count;
  return (
    <div>
      <div className="flex justify-between text-xs font-caption text-muted-foreground mb-1">
        <span>{remaining > 0 ? `${remaining} cupos disponibles` : 'Sin cupos'}</span>
        <span>{pct}% canjeado</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : 'var(--color-primary)' }}
        />
      </div>
    </div>
  );
}

export default function ActionDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const justCreated = searchParams.get('created') === '1';

  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [relatedActions, setRelatedActions] = useState([]);

  useEffect(() => {
    async function load() {
      const { data, error } = await actionService.getBySlug(slug);
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setAction(data);
      setLoading(false);
      actionService.incrementViews(data.id);
      if (data.business_id) {
        const { data: related } = await actionService.getByBusiness(data.business_id, slug, 3);
        setRelatedActions(related || []);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div style={{ paddingTop: '64px' }} className="max-w-lg mx-auto px-4 py-8 space-y-4">
          <div className="aspect-video rounded-2xl bg-muted animate-pulse" />
          <div className="h-8 w-3/4 bg-muted rounded-xl animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <Header />
        <Icon name="SearchX" size={48} color="var(--color-muted-foreground)" />
        <p className="mt-4 text-sm font-caption text-muted-foreground">Acción no encontrada</p>
        <Link to="/acciones" className="mt-4 text-sm font-semibold font-caption text-primary">← Volver al listado</Link>
      </div>
    );
  }

  const formatted = actionService.formatAction(action);
  const business = action?.business;
  const typeLabel = ACTION_TYPE_LABELS[action?.action_type] || 'Acción';
  const whatsappNumber = business?.whatsapp || business?.phone;
  const whatsappMsg = encodeURIComponent(`Hola, vi tu acción "${action?.title}" en Koronel y me interesa.`);
  const hasWalinka = formatted?.dist_walinka && (business?.walinka_catalog_url || business?.walinka_enabled);
  const walinkaCatalogUrl = action?.walinka_catalog_url || business?.walinka_catalog_url;

  const handleWhatsapp = () => {
    actionService.trackWhatsappClick(action.id);
    window.open(`https://wa.me/${whatsappNumber?.replace(/\D/g, '')}?text=${whatsappMsg}`, '_blank');
  };

  const handleCatalogClick = () => {
    actionService.trackCatalogClick(action.id);
    window.open(walinkaCatalogUrl, '_blank');
  };

  const handleShare = async () => {
    actionService.trackShare(action.id);
    if (navigator.share) {
      await navigator.share({ title: action.title, url: window.location.href }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta
        title={action?.title}
        description={action?.headline || action?.description}
        path={`/acciones/${slug}`}
      />
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Success banner if just created */}
        {justCreated && (
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#22c55e' }}>
            <Icon name="CheckCircle2" size={18} color="white" />
            <p className="text-sm font-caption font-semibold text-white flex-1">¡Tu acción está publicada y ya es visible en Koronel!</p>
            <Link to="/crecer" className="text-xs font-caption font-semibold text-white underline">Ver en mi centro</Link>
          </div>
        )}

        {/* Urgency bar */}
        <UrgencyBar endsAt={action?.ends_at} showCountdown={action?.show_countdown !== false} />

        {/* Back nav */}
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <Link to="/acciones" className="flex items-center gap-1.5 text-sm font-caption text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="ArrowLeft" size={16} />
              Volver
            </Link>
            <button onClick={handleShare} className="flex items-center gap-1.5 text-sm font-caption text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="Share2" size={16} />
              Compartir
            </button>
          </div>

          {/* Cover image */}
          {formatted?.coverUrl && (
            <div className="aspect-video rounded-2xl overflow-hidden bg-muted mb-5">
              <Image src={formatted.coverUrl} alt={action?.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Business mini */}
          {business && (
            <Link
              to={`/business-profile-page?id=${business.id}`}
              className="flex items-center gap-2 mb-4 group"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon name="Store" size={16} color="var(--color-muted-foreground)" />
              </div>
              <div>
                <p className="text-sm font-semibold font-caption text-foreground group-hover:text-primary transition-colors">{business.name}</p>
                {business.address && <p className="text-xs font-caption text-muted-foreground">{business.address}</p>}
              </div>
            </Link>
          )}

          {/* Type badge */}
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-caption font-semibold mb-2 bg-primary/10 text-primary">
            {typeLabel}
          </span>

          {/* Title */}
          <h1 className="font-heading font-bold text-2xl text-foreground mb-1">{action?.title}</h1>
          {action?.headline && (
            <p className="text-base font-caption text-muted-foreground mb-4">{action.headline}</p>
          )}

          {/* Price block */}
          {(action?.original_price || action?.promo_price || formatted?.discountDisplay) && (
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              {formatted?.discountDisplay && (
                <span className="inline-block px-3 py-1 rounded-full text-sm font-caption font-bold text-white mb-3" style={{ background: 'var(--color-primary)' }}>
                  {formatted.discountDisplay}
                </span>
              )}
              {action?.original_price && action?.promo_price && (
                <div className="flex items-end gap-3">
                  <p className="font-data font-bold text-3xl" style={{ color: 'var(--color-primary)' }}>
                    ${Number(action.promo_price).toLocaleString('es-CL')}
                  </p>
                  <p className="font-caption text-muted-foreground line-through mb-1">
                    ${Number(action.original_price).toLocaleString('es-CL')}
                  </p>
                </div>
              )}
              {action?.promo_code && (
                <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-muted">
                  <Icon name="Tag" size={14} color="var(--color-muted-foreground)" />
                  <p className="text-xs font-caption text-muted-foreground">Código:</p>
                  <code className="text-sm font-data font-bold text-foreground">{action.promo_code}</code>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {action?.description && (
            <div className="mb-4">
              <h2 className="font-heading font-semibold text-sm text-foreground mb-1">Detalles</h2>
              <p className="text-sm font-caption text-muted-foreground whitespace-pre-wrap">{action.description}</p>
            </div>
          )}

          {/* Redemption meter */}
          {action?.max_redemptions > 0 && (
            <div className="mb-4">
              <RedemptionMeter count={action.redemptions_count || 0} max={action.max_redemptions} />
            </div>
          )}

          {/* Validity */}
          <div className="flex items-center gap-2 text-xs font-caption text-muted-foreground mb-6">
            <Icon name="Calendar" size={14} />
            <span>
              {new Date(action?.starts_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
              {' — '}
              {new Date(action?.ends_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3 mb-8">
            {whatsappNumber && (
              <button
                onClick={handleWhatsapp}
                className="h-12 rounded-xl flex items-center justify-center gap-2.5 text-sm font-semibold font-caption text-white transition-opacity hover:opacity-90"
                style={{ background: '#25D366' }}
              >
                <Icon name="MessageCircle" size={18} color="white" />
                Consultar por WhatsApp
              </button>
            )}
            {hasWalinka && walinkaCatalogUrl && (
              <button
                onClick={handleCatalogClick}
                className="h-12 rounded-xl flex items-center justify-center gap-2.5 text-sm font-semibold font-caption border border-border bg-card text-foreground transition-colors hover:bg-muted"
              >
                <Icon name="BookOpen" size={18} color="var(--color-primary)" />
                Ver catálogo
              </button>
            )}
          </div>

          {/* Related actions */}
          {relatedActions.length > 0 && (
            <div className="mb-8">
              <h2 className="font-heading font-semibold text-base text-foreground mb-3">
                Más acciones de {business?.name}
              </h2>
              <div className="space-y-2">
                {relatedActions.map(a => {
                  const f = actionService.formatAction(a);
                  return (
                    <Link
                      key={a.id}
                      to={`/acciones/${a.slug}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                    >
                      {f.coverUrl && (
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                          <Image src={f.coverUrl} alt={a.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold font-caption text-foreground line-clamp-2">{a.title}</p>
                        {f.discountDisplay && <p className="text-xs font-caption font-bold mt-0.5" style={{ color: 'var(--color-primary)' }}>{f.discountDisplay}</p>}
                      </div>
                      <Icon name="ChevronRight" size={16} color="var(--color-muted-foreground)" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
