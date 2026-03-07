import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';
import { businessService } from '../../../services/businessService';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: 'Clock', bg: '#fef3c7', color: '#92400e' },
  published: { label: 'Publicado', icon: 'CheckCircle', bg: '#dcfce7', color: '#166534' },
  premium: { label: 'Premium', icon: 'Star', bg: '#ede9fe', color: '#5b21b6' },
  rejected: { label: 'Rechazado', icon: 'XCircle', bg: '#fee2e2', color: '#991b1b' },
};

const CLAIM_STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: 'Clock', bg: '#fef3c7', color: '#92400e' },
  approved: { label: 'Aprobado', icon: 'CheckCircle', bg: '#dcfce7', color: '#166534' },
  rejected: { label: 'Rechazado', icon: 'XCircle', bg: '#fee2e2', color: '#991b1b' },
};

export default function MyBusinessesTab({ userId }) {
  const [businesses, setBusinesses] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    Promise.all([
      businessService?.getByOwner(userId),
      businessService?.getMyClaimRequests(userId),
    ]).then(([bizRes, claimRes]) => {
      if (!mounted) return;
      if (!bizRes?.error) setBusinesses(bizRes?.data || []);
      if (!claimRes?.error) setClaims(claimRes?.data || []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [userId]);

  const myApprovedBusinesses = businesses?.filter((b) => b?.status === 'published' || b?.status === 'premium') || [];
  const myPendingApprovalBusinesses = businesses?.filter((b) => b?.status === 'pending') || [];

  const getImage = (b) => {
    const primaryImg = b?.business_images?.find(img => img?.is_primary) || b?.business_images?.[0];
    if (!primaryImg?.storage_path) return null;
    return primaryImg?.storage_path?.startsWith('http') ? primaryImg?.storage_path : businessService?.getImageUrl(primaryImg?.storage_path);
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        <p className="text-sm font-caption text-muted-foreground">Cargando negocios...</p>
      </div>
    );
  }

  const renderBusinessCard = (biz) => {
    const image = getImage(biz);
    const status = biz?.status || 'pending';
    const sc = STATUS_CONFIG?.[status] || STATUS_CONFIG?.pending;
    const premiumUntil = biz?.premium_until
      ? new Date(biz.premium_until)?.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
      : null;
    return (
      <div key={biz?.id} className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
        <div className="h-36 overflow-hidden bg-muted flex items-center justify-center relative">
          {image ? (
            <Image src={image} alt={`${biz?.name} - negocio en Coronel`} className="w-full h-full object-cover" />
          ) : (
            <Icon name="Building2" size={40} color="var(--color-muted-foreground)" />
          )}
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: sc?.bg, color: sc?.color }}>
            <Icon name={sc?.icon} size={11} color="currentColor" />
            {sc?.label}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-heading font-semibold text-foreground text-base line-clamp-1 mb-0.5">{biz?.name}</h3>
          <p className="text-xs font-caption text-muted-foreground mb-1">{biz?.category} · {biz?.address}</p>
          {status === 'premium' && premiumUntil && (
            <p className="text-xs font-medium mb-2" style={{ color: '#5b21b6' }}>Premium hasta el {premiumUntil}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <Link to="/mis-negocios">
              <Button variant="default" size="sm" iconName="Pencil" iconPosition="left" iconSize={13}>
                Gestionar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm font-caption text-muted-foreground">Gestiona tus negocios, reclamos y publicaciones pendientes.</p>
        <Link to="/publicar-negocio">
          <Button variant="outline" size="sm" iconName="Plus" iconPosition="left" iconSize={14}>
            Publicar negocio
          </Button>
        </Link>
      </div>

      {/* 1. Mis negocios (publicados / premium) */}
      <section>
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
          <Icon name="Building2" size={18} color="var(--color-primary)" />
          Mis negocios
        </h3>
        <p className="text-xs font-caption text-muted-foreground mb-3">Negocios que publicaste o que te fueron asignados tras aprobar un reclamo.</p>
        {myApprovedBusinesses?.length === 0 ? (
          <div className="bg-muted/50 border border-dashed border-border rounded-md p-4 text-center">
            <p className="text-sm font-caption text-muted-foreground">Aún no tienes negocios publicados. Publica uno o reclama un negocio existente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myApprovedBusinesses?.map(renderBusinessCard)}
          </div>
        )}
      </section>

      {/* 2. Solicitudes de reclamo */}
      <section>
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
          <Icon name="Flag" size={18} color="var(--color-accent)" />
          Solicitudes de reclamo
        </h3>
        <p className="text-xs font-caption text-muted-foreground mb-3">Solicitudes que enviaste para reclamar un negocio sin dueño.</p>
        {claims?.length === 0 ? (
          <div className="bg-muted/50 border border-dashed border-border rounded-md p-4 text-center">
            <p className="text-sm font-caption text-muted-foreground">No tienes solicitudes de reclamo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {claims?.map((c) => {
              const csc = CLAIM_STATUS_CONFIG?.[c?.claim_status] || CLAIM_STATUS_CONFIG?.pending;
              const biz = c?.business;
              return (
                <div key={c?.id} className="bg-card border border-border rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{biz?.name || 'Negocio'}</p>
                    <p className="text-xs font-caption text-muted-foreground">{biz?.category} · {biz?.address}</p>
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: csc?.bg, color: csc?.color }}>
                      <Icon name={csc?.icon} size={11} color="currentColor" />
                      {csc?.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(c?.created_at)?.toLocaleDateString('es-CL')}</span>
                  {biz?.id && (
                    <Link to={`/business-profile-page?id=${biz?.id}`}>
                      <Button variant="ghost" size="sm">Ver ficha</Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Negocios pendientes de aprobación */}
      <section>
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
          <Icon name="Clock" size={18} color="#92400e" />
          Negocios pendientes de aprobación
        </h3>
        <p className="text-xs font-caption text-muted-foreground mb-3">Negocios que creaste y están en revisión por el equipo.</p>
        {myPendingApprovalBusinesses?.length === 0 ? (
          <div className="bg-muted/50 border border-dashed border-border rounded-md p-4 text-center">
            <p className="text-sm font-caption text-muted-foreground">No tienes negocios pendientes de aprobación.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPendingApprovalBusinesses?.map(renderBusinessCard)}
          </div>
        )}
      </section>

      <div className="pt-2">
        <Link to="/mis-negocios">
          <Button variant="outline" fullWidth iconName="Building2" iconPosition="left" iconSize={16}>
            Ver todos mis negocios
          </Button>
        </Link>
      </div>
    </div>
  );
}