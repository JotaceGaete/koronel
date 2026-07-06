import React, { useEffect, useState } from 'react';
import Icon from 'components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { formatDate } from '../../../utils/format';
import { getBusinessCompleteness } from '../../../utils/businessCompleteness';
import { buildWalinkaCreateCatalogUrl, getBusinessCatalogUrl } from '../../../utils/walinkaCatalog';

const STATUS_LABELS = {
  published: 'Publicado',
  premium: 'Premium',
  pending: 'Pendiente de aprobación',
  rejected: 'Rechazado',
};

async function fetchPendingReviewCounts(businessIds) {
  if (!businessIds?.length) return {};
  try {
    const { data, error } = await supabase
      ?.from('business_reviews')
      ?.select('business_id')
      ?.in('business_id', businessIds)
      ?.is('owner_reply', null);
    if (error) throw error;
    return (data || [])?.reduce((acc, row) => {
      acc[row.business_id] = (acc?.[row.business_id] || 0) + 1;
      return acc;
    }, {});
  } catch (error) {
    console.error('SummaryTab.fetchPendingReviewCounts error:', error);
    return {};
  }
}

function buildRecommendations({ business, completeness, pendingReviews, walinkaLink }) {
  const recs = [];

  if (pendingReviews > 0) {
    recs.push({
      key: 'reviews',
      severity: 'high',
      text: pendingReviews === 1
        ? 'Tienes 1 reseña sin responder'
        : `Tienes ${pendingReviews} reseñas sin responder`,
      cta: 'Responder reseñas',
      tab: 'reviews',
    });
  }

  const canOfferWalinka = business?.claimed === true && walinkaLink?.status !== 'connected';
  if (canOfferWalinka) {
    recs.push({
      key: 'walinka',
      severity: 'medium',
      text: walinkaLink?.status === 'pending'
        ? 'Tu catálogo Walinka quedó a medio conectar'
        : 'Aún no conectas tu catálogo Walinka',
      cta: walinkaLink?.status === 'pending' ? 'Continuar en Walinka' : 'Conectar catálogo',
      href: getBusinessCatalogUrl(business) || buildWalinkaCreateCatalogUrl(business),
    });
  }

  const missingKeys = new Set(completeness?.missing?.map((m) => m.key));
  if (missingKeys.has('hours')) {
    recs.push({ key: 'hours', severity: 'medium', text: 'Completa tus horarios de atención', cta: 'Completar horarios', tab: 'businesses' });
  }
  if (missingKeys.has('cover')) {
    recs.push({ key: 'photos', severity: 'medium', text: 'Sube fotos de tu negocio', cta: 'Subir fotos', tab: 'businesses' });
  }
  if (missingKeys.has('address')) {
    recs.push({ key: 'address', severity: 'medium', text: 'Revisa tu dirección y ubicación en el mapa', cta: 'Revisar ubicación', tab: 'businesses' });
  }

  return recs;
}

function ChecklistItem({ label, done }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon
        name={done ? 'CheckCircle2' : 'Circle'}
        size={16}
        color={done ? 'var(--color-success, #16a34a)' : 'var(--color-muted-foreground)'}
      />
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

function RecommendationRow({ rec, onGoToTab }) {
  const severityColor = rec?.severity === 'high' ? 'var(--color-error, #dc2626)' : 'var(--color-accent)';
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: severityColor }} />
      <span className="flex-1 text-sm text-foreground">{rec?.text}</span>
      {rec?.href ? (
        <a
          href={rec.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium whitespace-nowrap"
          style={{ color: 'var(--color-primary)' }}
        >
          {rec?.cta} →
        </a>
      ) : (
        <button
          onClick={() => onGoToTab?.(rec?.tab)}
          className="text-xs font-medium whitespace-nowrap"
          style={{ color: 'var(--color-primary)' }}
        >
          {rec?.cta} →
        </button>
      )}
    </div>
  );
}

export default function SummaryTab({ businesses, walinkaLinks = {}, onGoToTab }) {
  const [pendingReviewsByBusiness, setPendingReviewsByBusiness] = useState({});

  useEffect(() => {
    let mounted = true;
    const ids = businesses?.map((b) => b?.id)?.filter(Boolean);
    if (ids?.length) {
      fetchPendingReviewCounts(ids).then((counts) => {
        if (mounted) setPendingReviewsByBusiness(counts);
      });
    }
    return () => { mounted = false; };
  }, [businesses]);

  if (!businesses?.length) {
    return (
      <div className="py-12 text-center">
        <Icon name="Sparkles" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Aún no tienes negocios registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {businesses?.map((biz) => {
        const completeness = getBusinessCompleteness(biz);
        const pendingReviews = pendingReviewsByBusiness?.[biz?.id] || 0;
        const walinkaLink = walinkaLinks?.[biz?.id] || null;
        const recommendations = buildRecommendations({ business: biz, completeness, pendingReviews, walinkaLink });
        const lastUpdated = biz?.updated_at ? formatDate(biz.updated_at, { day: 'numeric', month: 'long' }) : null;

        return (
          <div key={biz?.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-border">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-heading font-semibold text-foreground text-base">{biz?.name}</h3>
                {biz?.verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#166534' }}>
                    <Icon name="BadgeCheck" size={11} color="currentColor" />
                    Verificado
                  </span>
                )}
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {STATUS_LABELS?.[biz?.status] || 'Reclamado'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {lastUpdated ? `Actualizado el ${lastUpdated}` : 'Sin actualizaciones registradas todavía'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x md:divide-border">
              {/* Completitud */}
              <div className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">Perfil completo</p>
                  <span className="font-heading font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                    {completeness?.percent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${completeness?.percent}%`, background: 'var(--color-primary)' }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {completeness?.items?.map((item) => (
                    <ChecklistItem key={item?.key} label={item?.label} done={item?.done} />
                  ))}
                </div>
              </div>

              {/* Recomendaciones */}
              <div className="p-4 md:p-5">
                <p className="text-sm font-semibold text-foreground mb-3">Recomendado para ti</p>
                {recommendations?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tu perfil está al día. Sin acciones pendientes por ahora.</p>
                ) : (
                  <div className="space-y-2">
                    {recommendations?.map((rec) => (
                      <RecommendationRow key={rec?.key} rec={rec} onGoToTab={onGoToTab} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
