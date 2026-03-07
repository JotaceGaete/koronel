import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';
import { adService } from '../../services/adService';
import { messageService } from '../../services/messageService';
import { useAuth } from '../../contexts/AuthContext';

export default function ClassifiedAdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [adOwner, setAdOwner] = useState(null);
  const [similarAds, setSimilarAds] = useState([]);
  const [linkCopied, setLinkCopied] = useState(false);
  // Messaging state
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [msgError, setMsgError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('ID de aviso no válido');
      setLoading(false);
      return;
    }
    const fetchAd = async () => {
      setLoading(true);
      const { data, error: fetchError } = await adService?.getById(id);
      if (fetchError || !data) {
        setError('No se encontró el aviso o fue eliminado.');
      } else {
        const formatted = adService?.formatAd(data);
        setAd(formatted);
        adService?.incrementViews(id);
        // Fetch owner info for last seen
        const { data: ownerData } = await messageService?.getAdOwner(id);
        setAdOwner(ownerData);
        // Fetch similar ads by category
        if (data?.category_key) {
          const { data: simData } = await adService?.getByCategory(data?.category_key, id, 4);
          if (simData?.length > 0) {
            setSimilarAds(simData?.map(a => adService?.formatAd(a)));
          }
        }
      }
      setLoading(false);
    };
    fetchAd();
  }, [id]);

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location?.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  };

  const handleShareWhatsApp = () => {
    const url = encodeURIComponent(window.location?.href);
    const text = encodeURIComponent(`Mira este aviso: ${ad?.title}`);
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard?.writeText(window.location?.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (e) {
      const el = document.createElement('textarea');
      el.value = window.location?.href;
      document.body?.appendChild(el);
      el?.select();
      document.execCommand('copy');
      document.body?.removeChild(el);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const phone = ad?.phone?.replace(/\D/g, '');
    const fullPhone = phone?.startsWith('56') ? phone : `56${phone}`;
    window.open(`https://wa.me/${fullPhone}?text=Hola, vi tu aviso "${ad?.title}" en CoronelLocal`, '_blank');
  };

  const handleCall = () => {
    const phone = ad?.phone?.replace(/\D/g, '');
    const fullPhone = phone?.startsWith('56') ? `+${phone}` : `+56${phone}`;
    window.location.href = `tel:${fullPhone}`;
  };

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard?.writeText(ad?.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const el = document.createElement('textarea');
      el.value = ad?.phone;
      document.body?.appendChild(el);
      el?.select();
      document.execCommand('copy');
      document.body?.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!msgText?.trim() || !adOwner?.user_id || !user?.id) return;
    if (adOwner?.user_id === user?.id) {
      setMsgError('No puedes enviarte mensajes a ti mismo.');
      return;
    }
    setMsgSending(true);
    setMsgError(null);
    const { error: sendErr } = await messageService?.sendMessage({
      adId: id,
      senderId: user?.id,
      receiverId: adOwner?.user_id,
      body: msgText?.trim()
    });
    if (sendErr) {
      setMsgError('No se pudo enviar el mensaje. Intenta de nuevo.');
    } else {
      setMsgSent(true);
      setMsgText('');
    }
    setMsgSending(false);
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone?.trim();
    if (cleaned?.length >= 4) {
      return cleaned?.slice(0, -4) + '****';
    }
    return '****';
  };

  const formatPrice = (price) => {
    if (!price) return 'Precio a convenir';
    return `$${Number(price)?.toLocaleString('es-CL')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr)?.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const images = ad?.ad_images?.length > 0
    ? ad?.ad_images?.map(img => ({
        url: adService?.getImageUrl(img?.storage_path),
        alt: img?.alt_text || ad?.title
      }))
    : ad?.image
      ? [{ url: ad?.image, alt: ad?.imageAlt || ad?.title }]
      : [];

  const lastSeen = adOwner?.user_profiles?.updated_at
    ? messageService?.formatLastSeen(adOwner?.user_profiles?.updated_at)
    : null;

  const isOwnAd = isAuthenticated && user?.id && adOwner?.user_id && user?.id === adOwner?.user_id;

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div style={{ paddingTop: '64px' }} className="max-w-4xl mx-auto px-4 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-72 bg-muted rounded" />
            <div className="h-6 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div style={{ paddingTop: '64px' }} className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Icon name="AlertCircle" size={48} color="var(--color-muted-foreground)" className="mx-auto mb-4" />
          <h2 className="font-heading font-bold text-xl text-foreground mb-2">Aviso no encontrado</h2>
          <p className="text-muted-foreground mb-6">{error || 'Este aviso no existe o fue eliminado.'}</p>
          <Button variant="default" onClick={() => navigate('/classified-ads-listing')}>
            Ver todos los clasificados
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Breadcrumb */}
        <div className="border-b border-border bg-card">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/classified-ads-listing" className="hover:text-foreground transition-colors">Clasificados</Link>
            <Icon name="ChevronRight" size={14} color="currentColor" />
            <span className="text-foreground line-clamp-1">{ad?.title}</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Images + Description */}
            <div className="lg:col-span-2 space-y-5">
              {/* Image Gallery */}
              {images?.length > 0 ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden bg-muted" style={{ height: '360px' }}>
                    {ad?.featured && (
                      <span
                        className="absolute top-3 left-3 z-10 px-2 py-1 text-xs font-semibold rounded"
                        style={{ background: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
                      >
                        Destacado
                      </span>
                    )}
                    <Image
                      src={images?.[activeImage]?.url}
                      alt={images?.[activeImage]?.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {images?.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {images?.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImage(idx)}
                          className={`shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                            activeImage === idx ? 'border-primary' : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          <Image src={img?.url} alt={img?.alt} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-muted flex items-center justify-center" style={{ height: '280px' }}>
                  <Icon name="Image" size={48} color="var(--color-muted-foreground)" />
                </div>
              )}

              {/* Title + Price */}
              <div>
                <div className="flex flex-wrap items-start gap-2 mb-1">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-caption rounded"
                    style={{ background: 'var(--color-muted)', color: 'var(--color-secondary)' }}
                  >
                    <Icon name="Tag" size={11} color="currentColor" />
                    {ad?.category}
                  </span>
                  {ad?.condition && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-caption rounded border border-border text-muted-foreground">
                      {ad?.condition}
                    </span>
                  )}
                </div>
                <h1 className="font-heading font-bold text-xl md:text-2xl text-foreground mt-2 mb-2">
                  {ad?.title}
                </h1>
                <p className="text-2xl font-data font-bold" style={{ color: 'var(--color-primary)' }}>
                  {formatPrice(ad?.price)}
                  {ad?.price_negotiable && (
                    <span className="ml-2 text-sm font-caption font-normal text-muted-foreground">(Precio negociable)</span>
                  )}
                </p>
              </div>

              {/* Description */}
              {ad?.description && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h2 className="font-heading font-semibold text-base text-foreground mb-2">Descripción</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{ad?.description}</p>
                </div>
              )}

              {/* Share Buttons */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h2 className="font-heading font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                  <Icon name="Share2" size={15} color="currentColor" />
                  Compartir aviso
                </h2>
                <div className="flex flex-wrap gap-2">
                  {/* Facebook */}
                  <button
                    onClick={handleShareFacebook}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors text-white"
                    style={{ background: '#1877F2' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </button>

                  {/* WhatsApp */}
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors text-white"
                    style={{ background: '#25D366' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </button>

                  {/* Copy Link */}
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name={linkCopied ? 'Check' : 'Link'} size={14} color={linkCopied ? '#22c55e' : 'currentColor'} />
                    {linkCopied ? '¡Enlace copiado!' : 'Copiar enlace'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Contact + Meta */}
            <div className="space-y-4">
              {/* Seller Info Card */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--color-primary)', color: 'white' }}>
                    {adOwner?.user_profiles?.full_name?.charAt(0)?.toUpperCase() || <Icon name="User" size={16} color="white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {adOwner?.user_profiles?.full_name || 'Anunciante'}
                    </p>
                    {lastSeen && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        <span className="text-xs text-muted-foreground">Última conexión: {lastSeen}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h2 className="font-heading font-semibold text-base text-foreground">Contacto</h2>
                {ad?.phone ? (
                  isAuthenticated ? (
                    <>
                      {/* Call button */}
                      <Button
                        variant="outline"
                        size="md"
                        iconName="Phone"
                        iconPosition="left"
                        iconSize={16}
                        onClick={handleCall}
                        className="w-full"
                      >
                        Llamar: {ad?.phone}
                      </Button>

                      {/* WhatsApp button */}
                      <Button
                        variant="default"
                        size="md"
                        iconName="MessageCircle"
                        iconPosition="left"
                        iconSize={16}
                        onClick={handleWhatsApp}
                        className="w-full"
                        style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                      >
                        WhatsApp
                      </Button>

                      {/* Copy phone button */}
                      <button
                        onClick={handleCopyPhone}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Icon name={copied ? 'Check' : 'Copy'} size={14} color="currentColor" />
                        {copied ? '¡Número copiado!' : 'Copiar número'}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Masked phone for guests */}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted border border-border">
                        <Icon name="Phone" size={15} color="var(--color-muted-foreground)" />
                        <span className="font-data text-sm text-muted-foreground tracking-widest select-none">
                          {maskPhone(ad?.phone)}
                        </span>
                      </div>

                      {/* Login prompt */}
                      <p className="text-xs text-muted-foreground text-center leading-snug">
                        Inicia sesión para ver el teléfono completo y contactar al anunciante.
                      </p>

                      {/* Auth buttons */}
                      <Button
                        variant="default"
                        size="md"
                        iconName="LogIn"
                        iconPosition="left"
                        iconSize={15}
                        onClick={() => navigate('/login')}
                        className="w-full"
                      >
                        Iniciar sesión
                      </Button>
                      <Button
                        variant="outline"
                        size="md"
                        iconName="UserPlus"
                        iconPosition="left"
                        iconSize={15}
                        onClick={() => navigate('/signup')}
                        className="w-full"
                      >
                        Crear cuenta
                      </Button>
                    </>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Sin datos de contacto</p>
                )}
              </div>

              {/* Send Message Card */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h2 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
                  <Icon name="Mail" size={15} color="currentColor" />
                  Enviar mensaje
                </h2>

                {isAuthenticated ? (
                  isOwnAd ? (
                    <p className="text-xs text-muted-foreground">Este es tu propio aviso.</p>
                  ) : msgSent ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
                        <Icon name="Check" size={18} color="white" />
                      </div>
                      <p className="text-sm font-medium text-foreground">¡Mensaje enviado!</p>
                      <p className="text-xs text-muted-foreground text-center">El anunciante recibirá tu mensaje. Revisa tus respuestas en "Mis mensajes".</p>
                      <button
                        onClick={() => setMsgSent(false)}
                        className="text-xs text-primary hover:underline"
                      >
                        Enviar otro mensaje
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="space-y-2">
                      <textarea
                        value={msgText}
                        onChange={e => setMsgText(e?.target?.value)}
                        placeholder="Escribe tu mensaje al anunciante..."
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        disabled={msgSending}
                      />
                      {msgError && (
                        <p className="text-xs text-red-500">{msgError}</p>
                      )}
                      <Button
                        variant="default"
                        size="md"
                        iconName="Send"
                        iconPosition="left"
                        iconSize={14}
                        className="w-full"
                        disabled={msgSending || !msgText?.trim()}
                      >
                        {msgSending ? 'Enviando...' : 'Enviar mensaje'}
                      </Button>
                    </form>
                  )
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center leading-snug">
                      Inicia sesión para contactar al anunciante sin usar el teléfono.
                    </p>
                    <Button
                      variant="default"
                      size="md"
                      iconName="LogIn"
                      iconPosition="left"
                      iconSize={15}
                      onClick={() => navigate('/login')}
                      className="w-full"
                    >
                      Iniciar sesión para contactar
                    </Button>
                  </div>
                )}
              </div>

              {/* Details Card */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h2 className="font-heading font-semibold text-base text-foreground">Detalles</h2>
                <div className="space-y-2 text-sm">
                  {ad?.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon name="MapPin" size={14} color="currentColor" />
                      <span>{ad?.location}</span>
                    </div>
                  )}
                  {ad?.created_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon name="Calendar" size={14} color="currentColor" />
                      <span>Publicado el {formatDate(ad?.created_at)}</span>
                    </div>
                  )}
                  {ad?.views !== undefined && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon name="Eye" size={14} color="currentColor" />
                      <span>{ad?.views} visitas</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                iconName="ArrowLeft"
                iconPosition="left"
                iconSize={14}
                onClick={() => navigate('/classified-ads-listing')}
                className="w-full"
              >
                Volver a clasificados
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Avisos Similares */}
      {similarAds?.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 pb-10">
          <div className="border-t border-border pt-8">
            <h2 className="font-heading font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <Icon name="LayoutGrid" size={18} color="var(--color-primary)" />
              Avisos similares
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similarAds?.map(similar => (
                <Link
                  key={similar?.id}
                  to={`/clasificados/${similar?.id}`}
                  className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative overflow-hidden bg-muted" style={{ height: '140px' }}>
                    {similar?.image ? (
                      <Image
                        src={similar?.image}
                        alt={similar?.imageAlt || similar?.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="Image" size={32} color="var(--color-muted-foreground)" />
                      </div>
                    )}
                    {similar?.featured && (
                      <span
                        className="absolute top-2 left-2 px-1.5 py-0.5 text-xs font-semibold rounded"
                        style={{ background: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
                      >
                        Destacado
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">{similar?.category}</p>
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {similar?.title}
                    </h3>
                    <p className="mt-1.5 text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                      {similar?.price ? `$${Number(similar?.price)?.toLocaleString('es-CL')}` : 'Precio a convenir'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{similar?.timeAgo}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
