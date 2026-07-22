import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageMeta from 'components/PageMeta';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import ReportIssueLink from './components/ReportIssueLink';
import { publicServicesService, getPublicServiceCategoryLabel } from '../../services/publicServicesService';

function formatVerifiedDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(`${dateStr}T00:00:00`)?.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function PublicServiceDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    publicServicesService?.getById(id)?.then(({ data }) => {
      if (active) {
        setService(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [id]);

  const verifiedDate = formatVerifiedDate(service?.verified_at);
  const mapsUrl = service?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service?.address)}`
    : null;
  const websiteUrl = service?.website
    ? (service?.website?.startsWith('http') ? service?.website : `https://${service?.website}`)
    : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <PageMeta
        title={service?.name || 'Servicio para la comunidad'}
        description={service?.description}
        path={`/servicios/${id || ''}`}
      />
      <Header />
      <div style={{ paddingTop: '64px' }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <Link
            to="/servicios"
            className="inline-flex items-center gap-1.5 text-sm font-caption text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <Icon name="ArrowLeft" size={16} color="currentColor" />
            Volver a Servicios
          </Link>

          {loading ? (
            <div className="h-40 rounded-lg bg-muted animate-pulse" />
          ) : !service ? (
            <div className="text-center py-16">
              <Icon name="SearchX" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
              <p className="text-sm font-caption text-muted-foreground">
                No encontramos esta institución.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-5 md:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon name="Landmark" size={22} color="var(--color-primary)" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-heading font-bold text-lg md:text-xl text-foreground">
                    {service?.name}
                  </h1>
                  <p className="text-sm font-caption text-muted-foreground mt-0.5">
                    {service?.institution_type} · {getPublicServiceCategoryLabel(service?.category_key)}
                  </p>
                </div>
              </div>

              {service?.description && (
                <p className="text-sm font-caption text-foreground mb-5">{service?.description}</p>
              )}

              <div className="space-y-2.5 mb-5">
                {service?.address && (
                  <div className="flex items-start gap-2.5 text-sm font-caption text-foreground">
                    <Icon name="MapPin" size={16} color="var(--color-secondary)" className="shrink-0 mt-0.5" />
                    <span>{service?.address}</span>
                  </div>
                )}
                {service?.phone && (
                  <div className="flex items-start gap-2.5 text-sm font-caption text-foreground">
                    <Icon name="Phone" size={16} color="var(--color-secondary)" className="shrink-0 mt-0.5" />
                    <span>{service?.phone}</span>
                  </div>
                )}
                {service?.email && (
                  <div className="flex items-start gap-2.5 text-sm font-caption text-foreground">
                    <Icon name="Mail" size={16} color="var(--color-secondary)" className="shrink-0 mt-0.5" />
                    <span>{service?.email}</span>
                  </div>
                )}
                {service?.schedule_note && (
                  <div className="flex items-start gap-2.5 text-sm font-caption text-foreground">
                    <Icon name="Clock" size={16} color="var(--color-secondary)" className="shrink-0 mt-0.5" />
                    <span>{service?.schedule_note}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {service?.phone && (
                  <Button asChild variant="default" size="sm" iconName="Phone" iconPosition="left">
                    <a href={`tel:${service?.phone?.replace(/[^\d+]/g, '')}`}>Llamar</a>
                  </Button>
                )}
                {mapsUrl && (
                  <Button asChild variant="outline" size="sm" iconName="Map" iconPosition="left">
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">Ver en el mapa</a>
                  </Button>
                )}
                {websiteUrl && (
                  <Button asChild variant="outline" size="sm" iconName="ExternalLink" iconPosition="left">
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer">Sitio oficial</a>
                  </Button>
                )}
              </div>

              {verifiedDate && (
                <p className="text-xs font-caption text-muted-foreground mb-3">
                  Última verificación: {verifiedDate}
                </p>
              )}

              <div className="pt-3 border-t border-border">
                <ReportIssueLink serviceId={service?.id} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
