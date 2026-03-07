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

const BUSINESS = {
  id: 1,
  name: "Restaurante El Rincón Chileno",
  claimed: false,
  category_key: "restaurantes",
  rating: 4.3,
  reviewCount: 87,
  address: "Av. Capitán Ávalos 1245, Coronel, Biobío, Chile",
  phone: "+56 41 261 4500",
  whatsapp: "+56 9 8765 4321",
  email: "contacto@rinconchileno.cl",
  website: "https://rinconchileno.cl",
  description: `Bienvenidos a El Rincón Chileno, el restaurante familiar más tradicional de Coronel. Llevamos más de 20 años sirviendo la auténtica cocina chilena con ingredientes frescos y locales.\n\nNuestro menú incluye cazuela de vacuno, pastel de choclo, empanadas al horno, y los mejores mariscos frescos del Golfo de Arauco. Contamos con salón para eventos y celebraciones familiares.\n\nAceptamos reservas para grupos de más de 8 personas. Estacionamiento disponible en el local.`,
  lat: -37.0297,
  lng: -73.1597,
  hours: {
    monday: { open: '12:00', close: '22:00' },
    tuesday: { open: '12:00', close: '22:00' },
    wednesday: { open: '12:00', close: '22:00' },
    thursday: { open: '12:00', close: '22:00' },
    friday: { open: '12:00', close: '23:00' },
    saturday: { open: '11:00', close: '23:00' },
    sunday: { open: '11:00', close: '21:00' }
  },
  images: [
  {
    src: "https://img.rocket.new/generatedImages/rocket_gen_img_18e375330-1772638689943.png",
    alt: "Interior acogedor del restaurante con mesas de madera y decoración chilena tradicional con cuadros en las paredes"
  },
  {
    src: "https://images.unsplash.com/photo-1571681686550-12fabad16788",
    alt: "Plato de cazuela de vacuno chilena con papas, zanahoria y carne servida en bowl de barro artesanal"
  },
  {
    src: "https://img.rocket.new/generatedImages/rocket_gen_img_1c3f2ddaa-1772088788103.png",
    alt: "Empanadas al horno doradas y crujientes recién salidas del horno sobre tabla de madera rústica"
  },
  {
    src: "https://images.unsplash.com/photo-1691496750571-6a2b42d979a3",
    alt: "Salón del restaurante con iluminación cálida, mesas con manteles blancos y sillas de madera para familias"
  },
  {
    src: "https://img.rocket.new/generatedImages/rocket_gen_img_10cae551f-1772638690262.png",
    alt: "Plato de mariscos frescos con machas, choritos y camarones sobre cama de arroz blanco con limón"
  }]

};

const REVIEWS = [
{
  id: 1,
  author: "María González",
  avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1453e1878-1763300003100.png",
  avatarAlt: "Mujer chilena de mediana edad con cabello oscuro y sonrisa amable en foto de perfil",
  rating: 5,
  date: "15/02/2026",
  comment: "Excelente atención y comida deliciosa. La cazuela de vacuno es la mejor que he probado en Coronel. Muy recomendado para almuerzo familiar."
},
{
  id: 2,
  author: "Carlos Muñoz",
  avatar: "https://images.unsplash.com/photo-1513835621271-c19c122e8fec",
  avatarAlt: "Hombre joven con barba corta y camisa azul en fotografía de perfil casual",
  rating: 4,
  date: "28/01/2026",
  comment: "Buena comida y ambiente familiar. El servicio fue rápido y los precios son muy razonables para la calidad que ofrecen."
},
{
  id: 3,
  author: "Ana Pérez",
  avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1ab326d20-1772164190408.png",
  avatarAlt: "Mujer adulta con cabello castaño y expresión alegre en foto de perfil profesional",
  rating: 5,
  date: "10/01/2026",
  comment: "Las empanadas son increíbles, crujientes por fuera y jugosas por dentro. Volveré pronto con toda la familia."
},
{
  id: 4,
  author: "Roberto Silva",
  avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1203f053b-1763294451770.png",
  avatarAlt: "Hombre mayor con cabello gris y bigote en fotografía de perfil con fondo neutro",
  rating: 4,
  date: "05/01/2026",
  comment: "Muy buen restaurante tradicional. La atención es cordial y el local está muy limpio. Los mariscos frescos son el punto fuerte."
},
{
  id: 5,
  author: "Valentina Torres",
  avatar: "https://images.unsplash.com/photo-1532369802437-77915edfbd6a",
  avatarAlt: "Mujer joven con cabello largo y sonrisa en fotografía de perfil con fondo claro",
  rating: 3,
  date: "20/12/2025",
  comment: "La comida está rica pero el servicio fue un poco lento el día que fui. Igual lo recomiendo para probar la comida chilena auténtica."
}];


const RELATED = [
{
  id: 2,
  name: "Picada La Costanera",
  category: "Restaurante",
  rating: 4.1,
  image: "https://images.unsplash.com/photo-1655132663689-094d942f5b86",
  imageAlt: "Fachada de restaurante costero con mesas al aire libre y vista al mar en día soleado"
},
{
  id: 3,
  name: "Café Central Coronel",
  category: "Café y Pastelería",
  rating: 4.5,
  image: "https://images.unsplash.com/photo-1677306963569-1b488022cfff",
  imageAlt: "Interior de café moderno con barra de madera, máquina de espresso y pasteles en vitrina iluminada"
},
{
  id: 4,
  name: "Marisquería Don Pedro",
  category: "Mariscos",
  rating: 4.7,
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1b8e310fb-1772249430013.png",
  imageAlt: "Plato de mariscos frescos con langostinos y choritos sobre mesa de restaurante con decoración marina"
}];


export default function BusinessProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [shareToast, setShareToast] = useState(false);
  const [business, setBusiness] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);

  const businessId = searchParams?.get('id');

  // Load real business data if id param present, else fall back to mock
  useEffect(() => {
    if (!businessId) return;
    setLoadingBusiness(true);
    businessService?.getById(businessId)?.then(({ data }) => {
      if (data) setBusiness(data);
    })?.finally(() => setLoadingBusiness(false));
  }, [businessId]);

  // Build category labels from real hierarchy (category + parent from DB)
  const catRow = business?.category;
  const parentCatName = catRow?.parent?.name ?? (catRow?.name || business?.category) ?? null;
  const subCatName = catRow?.parent_id && catRow?.name ? catRow?.name : null;

  // Merge real data over mock for display
  const DISPLAY = business ? {
    ...BUSINESS,
    ...business,
    lat: business?.lat ?? business?.latitude ?? BUSINESS?.lat,
    lng: business?.lng ?? business?.longitude ?? BUSINESS?.lng,
    hours: business?.opening_hours ?? BUSINESS?.hours,
    images: business?.business_images?.length
      ? business?.business_images?.map((img) => ({
          src: businessService?.getImageUrl(img?.storage_path),
          alt: img?.alt_text || business?.name,
        }))
      : BUSINESS?.images,
    logoUrl: business?.logo_url || null,
    socialLinks: Array.isArray(business?.social_links) ? business?.social_links : [],
    websiteUrl: business?.website || null,
    parentCategoryName: parentCatName,
    subCategoryName: subCatName,
    category: parentCatName || business?.category,
    reviewCount: business?.review_count ?? BUSINESS?.reviewCount,
  } : { ...BUSINESS, logoUrl: null, socialLinks: [], websiteUrl: BUSINESS?.website };

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
                  { icon: 'Star', label: 'Negocio recomendado CoronelLocal', color: 'var(--color-accent)' }]?.
                  map(({ icon, label, color }) =>
                  <div key={label} className="flex items-center gap-2.5">
                      <Icon name={icon} size={16} color={color} />
                      <span className="text-sm font-caption text-card-foreground">{label}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Businesses */}
              <RelatedBusinesses businesses={RELATED} />

              {/* Post Ad CTA */}
              <div
                className="rounded-lg p-4 md:p-5 text-center"
                style={{ background: 'var(--color-primary)' }}>
                
                <Icon name="Tag" size={28} color="white" className="mx-auto mb-2" />
                <h3 className="font-heading font-semibold text-base text-white mb-1">¿Tienes algo que vender?</h3>
                <p className="text-xs font-caption text-white/80 mb-3">Publica tu aviso clasificado gratis en CoronelLocal</p>
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
                &copy; {new Date()?.getFullYear()} CoronelLocal. Todos los derechos reservados.
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