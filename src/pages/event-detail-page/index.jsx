import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';
import { eventService } from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';
import ShareButtons from 'components/ui/ShareButtons';

const CATEGORY_CONFIG = {
  church: { label: 'Iglesia', color: '#7c3aed', bg: '#f3e8ff', icon: 'Church' },
  courses: { label: 'Cursos', color: '#0891b2', bg: '#e0f2fe', icon: 'BookOpen' },
  meetups: { label: 'Encuentros', color: '#059669', bg: '#d1fae5', icon: 'Users' },
  other: { label: 'Otro', color: '#d97706', bg: '#fef3c7', icon: 'Tag' }
};

const FALLBACK_EVENT = {
  id: '1',
  title: 'Feria Gastronómica de Coronel',
  description: 'Gran feria con los mejores sabores de la región. Disfruta de comida típica chilena, mariscos frescos y empanadas artesanales. Entrada liberada para toda la familia.\n\nHabrá stands de más de 30 emprendedores locales, música en vivo y actividades para niños.',
  category: 'meetups',
  start_datetime: new Date(Date.now() + 3 * 86400000)?.toISOString(),
  end_datetime: new Date(Date.now() + 3 * 86400000 + 6 * 3600000)?.toISOString(),
  venue_name: 'Plaza de Armas de Coronel',
  address: 'Plaza de Armas, Coronel, Biobío',
  address_text: 'Plaza de Armas, Coronel, Biobío',
  image_url: "https://img.rocket.new/generatedImages/rocket_gen_img_14d5880d2-1772645297822.png",
  contact_whatsapp: '+56912345678',
  status: 'approved',
  organizer: { name: 'Municipalidad de Coronel' }
};

function formatFullDate(dtStr) {
  if (!dtStr) return '';
  try {
    return new Date(dtStr)?.toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  } catch {return '';}
}

function formatTime(dtStr) {
  if (!dtStr) return '';
  try {
    return new Date(dtStr)?.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  } catch {return '';}
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    eventService?.getById(id)?.then(({ data, error }) => {
      setEvent(error || !data ? FALLBACK_EVENT : data);
      setLoading(false);
    });
    eventService?.getUpcoming(4)?.then(({ data }) => {
      if (data) setRelatedEvents(data?.filter((e) => e?.id !== id)?.slice(0, 3));
    });
  }, [id]);

  const handleWhatsApp = () => {
    if (!event?.contact_whatsapp) return;
    const phone = event?.contact_whatsapp?.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hola, vi el evento "${event?.title}" en CoronelLocal y me gustaría más información.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleShare = async () => {
    try {
      if (navigator?.share) {
        await navigator?.share({ title: event?.title, url: window?.location?.href });
      } else {
        await navigator?.clipboard?.writeText(window?.location?.href);
        setShareMsg('¡Enlace copiado!');
        setTimeout(() => setShareMsg(''), 2000);
      }
    } catch (e) {
      try {
        await navigator?.clipboard?.writeText(window?.location?.href);
        setShareMsg('¡Enlace copiado!');
        setTimeout(() => setShareMsg(''), 2000);
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div style={{ paddingTop: '64px' }}>
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 animate-pulse space-y-4">
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

  if (!event) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div className="flex items-center justify-center min-h-screen" style={{ paddingTop: '64px' }}>
          <div className="text-center">
            <Icon name="CalendarOff" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
            <h2 className="font-heading font-bold text-foreground mb-2">Evento no encontrado</h2>
            <Link to="/eventos"><Button variant="outline">Ver todos los eventos</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const cat = CATEGORY_CONFIG?.[event?.category];
  const address = event?.address_text || event?.address || '';
  const isOwner = user?.id && event?.user_id === user?.id;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3">
          <nav className="flex items-center gap-1.5 text-xs font-caption text-muted-foreground flex-wrap">
            <Link to="/homepage" className="hover:text-primary transition-colors">Inicio</Link>
            <Icon name="ChevronRight" size={12} color="currentColor" />
            <Link to="/eventos" className="hover:text-primary transition-colors">Eventos</Link>
            <Icon name="ChevronRight" size={12} color="currentColor" />
            <span className="text-foreground truncate max-w-[200px]">{event?.title}</span>
          </nav>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6 pb-16">
          {/* Status Banners */}
          {event?.status === 'pending' && (isOwner || true) &&
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg border" style={{ background: '#fef3c7', borderColor: '#fcd34d' }}>
              <Icon name="Clock" size={16} color="#d97706" />
              <p className="text-sm font-medium" style={{ color: '#92400e' }}>Este evento está pendiente de aprobación por nuestro equipo.</p>
            </div>
          }
          {event?.status === 'rejected' &&
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg border" style={{ background: '#fee2e2', borderColor: '#fca5a5' }}>
              <Icon name="XCircle" size={16} color="#dc2626" />
              <p className="text-sm font-medium" style={{ color: '#991b1b' }}>Este evento fue rechazado y no está disponible públicamente.</p>
            </div>
          }

          {/* Hero Image */}
          {event?.image_url &&
          <div className="rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '16/7' }}>
              <Image
              src={event?.image_url}
              alt={`Imagen del evento: ${event?.title}`}
              className="w-full h-full object-cover" />
            </div>
          }

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Category + Title */}
              <div className="mb-4">
                {cat &&
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-3"
                  style={{ background: cat?.bg, color: cat?.color }}>
                  
                    <Icon name={cat?.icon} size={14} color="currentColor" />
                    {cat?.label}
                  </span>
                }
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground leading-tight">
                  {event?.title}
                </h1>
                {event?.organizer?.name &&
                <p className="text-sm text-muted-foreground mt-1">
                    Organizado por{' '}
                    {event?.organizer_business_id ?
                  <Link
                    to={`/negocios/${event?.organizer_business_id}`}
                    className="font-medium hover:underline"
                    style={{ color: 'var(--color-primary)' }}>
                    
                        {event?.organizer?.name}
                      </Link> :

                  <span className="font-medium text-foreground">{event?.organizer?.name}</span>
                  }
                  </p>
                }
              </div>

              {/* Date/Time/Venue Block */}
              <div className="bg-card border border-border rounded-xl p-4 mb-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-muted)' }}>
                    <Icon name="Calendar" size={18} color="var(--color-primary)" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de inicio</p>
                    <p className="text-sm font-medium text-foreground capitalize">{formatFullDate(event?.start_datetime)}</p>
                    <p className="text-sm text-muted-foreground">{formatTime(event?.start_datetime)} hrs</p>
                  </div>
                </div>
                {event?.end_datetime &&
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-muted)' }}>
                      <Icon name="CalendarCheck" size={18} color="var(--color-primary)" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha de término</p>
                      <p className="text-sm font-medium text-foreground capitalize">{formatFullDate(event?.end_datetime)}</p>
                      <p className="text-sm text-muted-foreground">{formatTime(event?.end_datetime)} hrs</p>
                    </div>
                  </div>
                }
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-muted)' }}>
                    <Icon name="MapPin" size={18} color="var(--color-primary)" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lugar</p>
                    <p className="text-sm font-medium text-foreground">{event?.venue_name}</p>
                    {address && <p className="text-sm text-muted-foreground">{address}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <Link
                        to="/mapa"
                        className="inline-flex items-center gap-1 text-xs hover:underline"
                        style={{ color: 'var(--color-primary)' }}>
                        
                        <Icon name="Map" size={11} color="currentColor" />
                        Ver en mapa
                      </Link>
                      {address &&
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs hover:underline"
                        style={{ color: 'var(--color-primary)' }}>
                        
                          <Icon name="ExternalLink" size={11} color="currentColor" />
                          Google Maps
                        </a>
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {event?.description &&
              <div className="bg-card border border-border rounded-xl p-4 mb-5">
                  <h2 className="font-heading font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                    <Icon name="FileText" size={17} color="var(--color-primary)" />
                    Descripción
                  </h2>
                  <div className="space-y-3">
                    {event?.description?.split('\n')?.filter(Boolean)?.map((para, i) =>
                  <p key={i} className="text-sm text-card-foreground leading-relaxed">{para}</p>
                  )}
                  </div>
                </div>
              }
            </div>

            {/* Sidebar */}
            <div className="lg:w-72 shrink-0 space-y-4">
              {/* WhatsApp CTA */}
              {event?.contact_whatsapp &&
              <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Contacto</h3>
                  <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ background: '#25d366' }}>
                  
                    <Icon name="MessageCircle" size={16} color="white" />
                    Contactar por WhatsApp
                  </button>
                </div>
              }

              {/* Share */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Compartir</h3>
                <ShareButtons
                  title={event?.title ? `Evento: ${event?.title}` : ''}
                  url={window?.location?.href}
                />
              </div>

              {/* Ver en mapa */}
              <Link
                to="/mapa"
                className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl hover:bg-muted transition-colors">
                
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-muted)' }}>
                  <Icon name="Map" size={16} color="var(--color-primary)" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Ver en mapa interactivo</p>
                  <p className="text-xs text-muted-foreground">Explorar negocios y eventos</p>
                </div>
                <Icon name="ChevronRight" size={16} color="var(--color-muted-foreground)" className="ml-auto" />
              </Link>
            </div>
          </div>

          {/* Related Events */}
          {relatedEvents?.length > 0 &&
          <div className="mt-10">
              <h2 className="font-heading font-bold text-lg text-foreground mb-4">Otros eventos próximos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedEvents?.map((rel) => {
                const relCat = CATEGORY_CONFIG?.[rel?.category];
                const relAddr = rel?.address_text || rel?.address || '';
                return (
                  <Link
                    key={rel?.id}
                    to={`/eventos/${rel?.id}`}
                    className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
                    
                      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--color-muted)' }}>
                        {rel?.image_url ?
                      <Image src={rel?.image_url} alt={`Imagen: ${rel?.title}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> :

                      <div className="w-full h-full flex items-center justify-center">
                            <Icon name="CalendarDays" size={24} color="var(--color-muted-foreground)" />
                          </div>
                      }
                        {relCat &&
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: relCat?.bg, color: relCat?.color }}>
                            {relCat?.label}
                          </span>
                      }
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">{rel?.title}</h3>
                        {rel?.venue_name &&
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Icon name="MapPin" size={11} color="currentColor" />
                            {rel?.venue_name}
                          </p>
                      }
                      </div>
                    </Link>
                );
              })}
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  );
}