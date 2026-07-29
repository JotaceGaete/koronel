import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import ImageGallery from './components/ImageGallery';
import BusinessInfo from './components/BusinessInfo';
import OpeningHours from './components/OpeningHours';
import ContactDetails from './components/ContactDetails';
import BusinessMap from './components/BusinessMap';
import ReviewsSection from './components/ReviewsSection';
import ClaimBusiness from './components/ClaimBusiness';
import RelatedBusinesses from './components/RelatedBusinesses';
import ChurchDetails from './components/ChurchDetails';
import ShareButtons from 'components/ui/ShareButtons';
import BusinessJobs from './components/BusinessJobs';
import { businessService } from '../../services/businessService';
import { siteConfig } from '../../config/siteConfig';
import { useCity } from '../../contexts/CityContext';

export default function BusinessProfilePage() {
  const { city, communityCityId } = useCity();
  const brandName = city?.brand_name ?? siteConfig?.brandName;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [shareToast, setShareToast] = useState(false);
  const [business, setBusiness] = useState(null);
  const [businessNotFound, setBusinessNotFound] = useState(false);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [relatedBusinesses, setRelatedBusinesses] = useState([]);

  const businessId = searchParams?.get('id');

  useEffect(() => {
    if (!businessId) {
      setBusiness(null);
      setBusinessNotFound(true);
      setLoadingBusiness(false);
      return;
    }
    let cancelled = false;
    setBusiness(null);
    setBusinessNotFound(false);
    setLoadingBusiness(true);
    businessService?.getById(businessId)?.then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setBusinessNotFound(true);
      } else {
        setBusiness(data);
      }
    })?.finally(() => { if (!cancelled) setLoadingBusiness(false); });
    return () => { cancelled = true; };
  }, [businessId]);

  // Negocios similares reales, misma categoría, excluyendo el negocio actual.
  useEffect(() => {
    if (!business?.category_key || !business?.id) {
      setRelatedBusinesses([]);
      return;
    }
    let cancelled = false;
    businessService?.getAll({ category: business?.category_key, communityCityId, pageSize: 4 })?.then(({ data }) => {
      if (cancelled) return;
      const mapped = (data || [])
        ?.filter((b) => String(b?.id) !== String(business?.id))
        ?.slice(0, 3)
        ?.map((b) => {
          const primaryImg = b?.business_images?.find((img) => img?.is_primary) || b?.business_images?.[0];
          const image = primaryImg?.storage_path
            ? (primaryImg?.storage_path?.startsWith('http') ? primaryImg?.storage_path : businessService?.getImageUrl(primaryImg?.storage_path))
            : null;
          return {
            id: b?.id,
            name: b?.name,
            category: b?.category,
            rating: b?.rating,
            image,
            imageAlt: b?.name ? `Foto de ${b?.name}` : '',
          };
        });
      setRelatedBusinesses(mapped);
    });
    return () => { cancelled = true; };
  }, [business?.category_key, business?.id, communityCityId]);

  // Build category labels from real hierarchy (category + parent from DB)
  const catRow = business?.category_ref;
  const parentCatName = catRow?.parent?.name ?? (catRow?.name || business?.category) ?? null;
  const subCatName = catRow?.parent_id && catRow?.name ? catRow?.name : null;

  const DISPLAY = business ? {
    ...business,
    lat: business?.lat ?? business?.latitude,
    lng: business?.lng ?? business?.longitude,
    hours: business?.opening_hours,
    images: business?.business_images?.length
      ? business?.business_images?.map((img) => ({
          src: businessService?.getImageUrl(img?.storage_path),
          alt: img?.alt_text || business?.name,
        }))
      : [],
    logoUrl: business?.logo_url || null,
    socialLinks: Array.isArray(business?.social_links) ? business?.social_links : [],
    websiteUrl: business?.website || null,
    parentCategoryName: parentCatName,
    subCategoryName: subCatName,
    category: parentCatName || business?.category,
    reviewCount: business?.review_count ?? 0,
  } : null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: DISPLAY?.name, url: window.location?.href });
    } else {
      navigator.clipboard?.writeText(window.location?.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const handleCall = () => {window.location.href = `tel:${DISPLAY?.phone}`;};
  const handleWhatsApp = () => {window.open(`https://wa.me/${DISPLAY?.whatsapp?.replace(/\D/g, '')}`, '_blank');};
  const handleDirections = () => {window.open(`https://www.google.com/maps?q=${DISPLAY?.lat},${DISPLAY?.lng}`, '_blank');};

  if (loadingBusiness) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div style={{ paddingTop: '64px' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="bg-muted rounded-xl" style={{ aspectRatio: '16/7' }} />
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (businessNotFound || !business) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div className="flex items-center justify-center min-h-screen" style={{ paddingTop: '64px' }}>
          <div className="text-center">
            <Icon name="Store" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
            <h2 className="font-heading font-bold text-foreground mb-2">Negocio no encontrado</h2>
            <Link to="/business-directory-listing"><Button variant="outline">Ver todos los negocios</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      {/* Page offset for fixed header */}
      <div style={{ paddingTop: '64px' }}>
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs font-caption text-muted-foreground flex-wrap" aria-label="Breadcrumb">
            <Link to="/homepage" className="hover:text-primary transition-colors duration-150">Inicio</Link>
            <Icon name="ChevronRight" size={12} color="currentColor" />
            <Link to="/business-directory-listing" className="hover:text-primary transition-colors duration-150">Negocios</Link>
            <Icon name="ChevronRight" size={12} color="currentColor" />
            <span className="text-foreground truncate max-w-[200px]">{DISPLAY?.name}</span>
          </nav>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

            {/* Left / Main Column */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* Logo + Name header (shown when logo exists) */}
              {DISPLAY?.logoUrl && (
                <div className="flex items-center gap-4 bg-card border border-border rounded-lg p-4">
                  <img
                    src={DISPLAY?.logoUrl}
                    alt={`Logo de ${DISPLAY?.name}`}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover border border-border shrink-0"
                  />
                  <div>
                    <h1 className="font-heading font-bold text-xl md:text-2xl text-foreground">{DISPLAY?.name}</h1>
                    {DISPLAY?.category && <p className="text-sm text-muted-foreground mt-0.5">{DISPLAY?.category}</p>}
                  </div>
                </div>
              )}

              {/* Gallery */}
              <ImageGallery images={DISPLAY?.images} />

              {/* Business Info */}
              <BusinessInfo
                business={DISPLAY}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
                onDirections={handleDirections}
                onShare={handleShare} />
              

              {/* Description */}
              <div className="bg-card border border-border rounded-lg p-4 md:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="FileText" size={18} color="var(--color-primary)" />
                  <h3 className="font-heading font-semibold text-base text-foreground">Descripción</h3>
                </div>
                <div className="space-y-3">
                  {DISPLAY?.description?.split('\n')?.filter(Boolean)?.map((para, i) =>
                  <p key={i} className="text-sm md:text-base font-body text-card-foreground leading-relaxed">{para}</p>
                  )}
                </div>
              </div>

              {/* Opening Hours */}
              <OpeningHours hours={DISPLAY?.hours} />

              {/* Church Details - only for Iglesias y Templos */}
              {(DISPLAY?.category_key === 'iglesias-templos' || DISPLAY?.category === 'Iglesias y Templos') && (
                <ChurchDetails
                  businessId={String(DISPLAY?.id)}
                  canEdit={false}
                />
              )}

              {/* Reviews */}
              <ReviewsSection
                businessId={businessId || String(DISPLAY?.id)}
                ownerId={DISPLAY?.owner_id}
              />

              {/* Jobs linked to this business */}
              {businessId && <BusinessJobs businessId={businessId} />}

              
            </div>

            {/* Right / Sidebar Column */}
            <div className="w-full lg:w-80 xl:w-96 space-y-5 shrink-0">
              {/* Contact Details */}
              <ContactDetails
                phone={DISPLAY?.phone}
                whatsapp={DISPLAY?.whatsapp}
                email={DISPLAY?.email}
                website={DISPLAY?.websiteUrl}
                address={DISPLAY?.address}
                socialLinks={DISPLAY?.socialLinks}
              />
              

              {/* Map */}
              <BusinessMap
                lat={DISPLAY?.lat}
                lng={DISPLAY?.lng}
                businessName={DISPLAY?.name} />
              

              {/* Claim Business: solo si hay id real; claimed = columna o owner_id presente */}
              {businessId && (
                <ClaimBusiness
                  businessId={businessId}
                  businessName={DISPLAY?.name}
                  claimed={DISPLAY?.claimed ?? !!DISPLAY?.owner_id}
                />
              )}

              {/* Share */}
              <div className="bg-card border border-border rounded-lg p-4 md:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Share2" size={18} color="var(--color-primary)" />
                  <h3 className="font-heading font-semibold text-base text-foreground">Compartir</h3>
                </div>
                <ShareButtons
                  title={DISPLAY?.name ? `Negocio: ${DISPLAY?.name}` : ''}
                  url={window?.location?.href}
                />
              </div>

              {/* Quick Actions */}
              <div className="bg-card border border-border rounded-lg p-4 md:p-5">
                <h3 className="font-heading font-semibold text-base text-foreground mb-3">Acciones rápidas</h3>
                <div className="space-y-2">
                  <Button
                    variant="default"
                    fullWidth
                    iconName="Phone"
                    iconPosition="left"
                    iconSize={16}
                    onClick={handleCall}>
                    
                    Llamar ahora
                  </Button>
                  <Button
                    variant="success"
                    fullWidth
                    iconName="MessageCircle"
                    iconPosition="left"
                    iconSize={16}
                    onClick={handleWhatsApp}>
                    
                    Enviar WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    iconName="Navigation"
                    iconPosition="left"
                    iconSize={16}
                    onClick={handleDirections}>
                    
                    Cómo llegar
                  </Button>
                </div>
              </div>

              {/* Certifications */}
              <div className="bg-card border border-border rounded-lg p-4 md:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Award" size={18} color="var(--color-accent)" />
                  <h3 className="font-heading font-semibold text-base text-foreground">Certificaciones</h3>
                </div>
                <div className="space-y-2">
                  {[
                  { icon: 'ShieldCheck', label: 'Resolución Sanitaria vigente', color: 'var(--color-success)' },
                  { icon: 'FileCheck', label: 'Patente Municipal 2026', color: 'var(--color-primary)' },
                  { icon: 'Star', label: `Negocio recomendado ${brandName}`, color: 'var(--color-accent)' }]?.
                  map(({ icon, label, color }) =>
                  <div key={label} className="flex items-center gap-2.5">
                      <Icon name={icon} size={16} color={color} />
                      <span className="text-sm font-caption text-card-foreground">{label}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Businesses */}
              <RelatedBusinesses businesses={relatedBusinesses} />

              {/* Post Ad CTA */}
              <div
                className="rounded-lg p-4 md:p-5 text-center"
                style={{ background: 'var(--color-primary)' }}>
                
                <Icon name="Tag" size={28} color="white" className="mx-auto mb-2" />
                <h3 className="font-heading font-semibold text-base text-white mb-1">¿Tienes algo que vender?</h3>
                <p className="text-xs font-caption text-white/80 mb-3">Publica tu aviso clasificado gratis en {brandName}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  iconName="Plus"
                  iconPosition="left"
                  iconSize={14}
                  onClick={() => navigate('/post-classified-ad')}>
                  
                  Publicar aviso
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-card mt-8">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: 'var(--color-primary)' }}>
                  
                  <Icon name="MapPin" size={14} color="white" />
                </div>
                <span className="font-heading font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
                  Coronel<span style={{ color: 'var(--color-accent)' }}>Local</span>
                </span>
              </div>
              <p className="text-xs font-caption text-muted-foreground text-center">
                &copy; {new Date()?.getFullYear()} {brandName}. Todos los derechos reservados.
              </p>
              <div className="flex items-center gap-4">
                <Link to="/business-directory-listing" className="text-xs font-caption text-muted-foreground hover:text-primary transition-colors duration-150">Negocios</Link>
                <Link to="/classified-ads-listing" className="text-xs font-caption text-muted-foreground hover:text-primary transition-colors duration-150">Clasificados</Link>
                <Link to="/post-classified-ad" className="text-xs font-caption text-muted-foreground hover:text-primary transition-colors duration-150">Publicar</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
      {/* Share Toast */}
      {shareToast &&
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-2 px-4 py-3 rounded-lg bg-foreground text-background text-sm font-caption shadow-xl animate-fade-in-up">
          <Icon name="Check" size={16} color="currentColor" />
          Enlace copiado al portapapeles
        </div>
      }
    </div>
  );

}