import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import OficioProfilePhoto from './components/OficioProfilePhoto';
import OficioPortfolio from './components/OficioPortfolio';
import OficioForm from './components/OficioForm';
import OficioPreviewCard from './components/OficioPreviewCard';
import OficioSuccessModal from './components/OficioSuccessModal';
import GuestInfoModal from '../post-classified-ad/components/GuestInfoModal';
import { useAuth } from '../../contexts/AuthContext';
import { adService } from '../../services/adService';

const EMPTY_FORM = {
  title: '',
  category: '',
  description: '',
  priceType: '',
  price: '',
  phone: '',
  whatsapp: false,
  scheduleNote: '',
  zones: [],
  otherZones: '',
};

function validate(form) {
  const errs = {};
  if (!form.title?.trim()) errs.title = 'Contale a la gente a qué te dedicás';
  else if (form.title.trim().length < 5) errs.title = 'Escribe al menos 5 caracteres';
  if (!form.category) errs.category = 'Seleccioná una categoría';
  if (!form.description?.trim()) errs.description = 'Escribí algo sobre vos y tu trabajo';
  else if (form.description.trim().length < 20) errs.description = 'Escribí al menos 20 caracteres';
  if (!form.phone?.trim()) errs.phone = 'El teléfono de contacto es obligatorio';
  else if (form.phone.replace(/\D/g, '').length < 9) errs.phone = 'Ingresá un número chileno válido (+56 9 XXXX XXXX)';
  const allZones = [
    ...(form.zones || []),
    ...(form.otherZones ? form.otherZones.split(',').map(z => z.trim()).filter(Boolean) : []),
  ];
  if (allZones.length === 0) errs.zones = 'Indicá al menos una zona de trabajo';
  return errs;
}

function isAdminUser(user, userProfile) {
  if (!user) return false;
  const meta = user?.user_metadata || {};
  const appMeta = user?.app_metadata || {};
  return meta?.role === 'admin' || appMeta?.role === 'admin' || userProfile?.role === 'admin';
}

async function getClientIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const json = await res?.json();
    return json?.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

export default function PostOficioForm() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [successIsGuest, setSuccessIsGuest] = useState(false);
  const [successGuestEmail, setSuccessGuestEmail] = useState('');
  const [successVerificationCode, setSuccessVerificationCode] = useState('');

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      document.querySelector('[data-oficio-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!user) {
      setShowGuestModal(true);
      return;
    }
    const isAdmin = isAdminUser(user, userProfile);
    if (!isAdmin) {
      const ok = await adService.checkDailyLimit(user.id, 'user_id', user.id);
      if (!ok) {
        setSubmitError('Has alcanzado el límite de publicaciones por día.');
        return;
      }
    }
    await doSubmit(null);
  };

  const handleGuestConfirm = async (guestInfo) => {
    const ok = await adService.checkDailyLimit(guestInfo.email, 'email');
    if (!ok) {
      setSubmitError('Este email ya alcanzó el límite de publicaciones por día.');
      setShowGuestModal(false);
      return;
    }
    await doSubmit(guestInfo);
  };

  const doSubmit = async (guestInfo) => {
    setIsSubmitting(true);
    setSubmitError('');
    setShowGuestModal(false);

    try {
      const ipAddress = await getClientIP();
      const isAdmin = isAdminUser(user, userProfile);
      if (!isAdmin) {
        const ipOk = await adService.checkDailyLimit(ipAddress, 'ip');
        if (!ipOk) {
          setSubmitError('Se alcanzó el límite de publicaciones desde esta IP. Intentá mañana.');
          setIsSubmitting(false);
          return;
        }
      }

      // Upload photos: profile first, then portfolio
      const allPhotoFiles = [profilePhoto, ...portfolioPhotos].filter(Boolean);
      const photoPaths = [];
      for (const photo of allPhotoFiles) {
        if (photo.file) {
          const { path, error } = await adService.uploadPhoto(photo.file, user?.id || null);
          if (!error && path) photoPaths.push(path);
        }
      }

      // Build location string from zones
      const allZones = [
        ...(form.zones || []),
        ...(form.otherZones ? form.otherZones.split(',').map(z => z.trim()).filter(Boolean) : []),
      ];

      const formData = {
        title: form.title.trim(),
        categoryName: form.category,
        categoryKey: form.category.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, ''),
        description: form.description.trim(),
        phone: form.phone,
        whatsapp: form.whatsapp,
        location: allZones.join(', ') || 'Coronel',
        price: form.priceType === 'from' || form.priceType === 'hourly' ? form.price?.replace(/\D/g, '') : '',
        duration: '365',
        listing_type: 'oficio',
        price_type: form.priceType || null,
        schedule_note: form.scheduleNote?.trim() || null,
      };

      const { data: ad, error: createError, isGuest, verificationToken } = await adService.create({
        userId: user?.id || null,
        formData,
        photoPaths,
        guestInfo,
        ipAddress,
      });

      if (createError) {
        setSubmitError('Error al publicar. Por favor intentá de nuevo.');
      } else {
        if (!isAdmin) {
          if (user?.id) await adService.incrementDailyCount(user.id, 'user_id');
          else if (guestInfo?.email) await adService.incrementDailyCount(guestInfo.email, 'email');
          await adService.incrementDailyCount(ipAddress, 'ip');
        }
        setSuccessIsGuest(isGuest);
        setSuccessGuestEmail(guestInfo?.email || '');
        if (isGuest && verificationToken) {
          setSuccessVerificationCode(verificationToken.slice(0, 8).toUpperCase());
        }
        setShowSuccess(true);
      }
    } catch {
      setSubmitError('Error inesperado. Por favor intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setForm(EMPTY_FORM);
    setProfilePhoto(null);
    setPortfolioPhotos([]);
    setErrors({});
    navigate('/oficios');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      <div style={{ paddingTop: '64px' }}>

        {/* Breadcrumb */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3">
            <nav className="flex items-center gap-2 text-sm font-caption text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/homepage" className="hover:text-primary transition-colors">Inicio</Link>
              <Icon name="ChevronRight" size={14} color="currentColor" />
              <Link to="/oficios" className="hover:text-primary transition-colors">Oficios</Link>
              <Icon name="ChevronRight" size={14} color="currentColor" />
              <span className="text-foreground font-medium">Presentarme</span>
            </nav>
          </div>
        </div>

        {/* Page Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-5 md:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
                  <Icon name="Wrench" size={28} color="var(--color-primary)" />
                  Presentate en Koronel
                </h1>
                <p className="text-sm md:text-base font-body text-muted-foreground mt-1">
                  Creá tu ficha profesional y llegá a vecinos que necesitan tu trabajo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(v => !v)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-muted text-sm font-caption text-foreground hover:bg-primary hover:text-primary-foreground transition-all shrink-0 min-h-[44px]"
                aria-expanded={previewOpen}
              >
                <Icon name="Eye" size={16} color="currentColor" />
                <span className="hidden sm:inline">Ver ficha</span>
              </button>
            </div>
          </div>
        </div>

        {/* Guest banner */}
        {!user && (
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4">
            <div className="flex items-start gap-3 p-3 rounded-md border"
              style={{ background: 'rgba(44,82,130,0.06)', borderColor: 'rgba(44,82,130,0.2)' }}>
              <Icon name="UserCheck" size={17} color="var(--color-primary)" className="shrink-0 mt-0.5" />
              <p className="text-sm font-caption text-foreground">
                Podés publicar sin cuenta. Al finalizar te pediremos tu email para activar tu ficha.
                <Link to="/login" className="ml-1 font-semibold underline" style={{ color: 'var(--color-primary)' }}>Iniciar sesión</Link>
              </p>
            </div>
          </div>
        )}

        {/* Main */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

              {/* Left: Form */}
              <div className="flex-1 min-w-0 space-y-6">

                {/* Sección: Tu foto */}
                <section className="bg-card border border-border rounded-xl p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                      style={{ background: 'var(--color-primary)' }}>1</span>
                    <h2 className="font-heading font-semibold text-base text-foreground">Tu foto</h2>
                  </div>
                  <OficioProfilePhoto photo={profilePhoto} onChange={setProfilePhoto} />
                </section>

                {/* Sección: Datos del oficio + contacto */}
                <section className="bg-card border border-border rounded-xl p-4 md:p-6">
                  <OficioForm form={form} errors={errors} onChange={setField} />
                </section>

                {/* Sección: Portfolio */}
                <section className="bg-card border border-border rounded-xl p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                      style={{ background: 'var(--color-primary)' }}>6</span>
                    <h2 className="font-heading font-semibold text-base text-foreground">Trabajos realizados</h2>
                  </div>
                  <OficioPortfolio photos={portfolioPhotos} onChange={setPortfolioPhotos} />
                </section>

                {/* Vista previa mobile (toggle) */}
                {previewOpen && (
                  <section className="lg:hidden">
                    <OficioPreviewCard form={form} profilePhoto={profilePhoto} portfolioPhotos={portfolioPhotos} />
                  </section>
                )}

                {/* Acciones */}
                <div className="bg-card border border-border rounded-xl p-4 md:p-6">
                  {submitError && (
                    <div className="mb-4 flex items-center gap-2 p-3 rounded-md text-sm font-caption"
                      style={{ background: '#E53E3E18', color: 'var(--color-error)' }}
                      data-oficio-error>
                      <Icon name="AlertCircle" size={15} color="currentColor" />
                      {submitError}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="submit"
                      variant="default"
                      size="lg"
                      loading={isSubmitting}
                      iconName="User"
                      iconPosition="left"
                      iconSize={18}
                      className="flex-1 sm:flex-none sm:min-w-[200px]"
                    >
                      {isSubmitting ? 'Publicando...' : 'Publicar mi ficha'}
                    </Button>
                    <Link to="/oficios">
                      <Button type="button" variant="ghost" size="lg">
                        Cancelar
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs font-caption text-muted-foreground mt-3 flex items-start gap-1.5">
                    <Icon name="Shield" size={13} color="var(--color-success)" className="shrink-0 mt-0.5" />
                    Al publicar aceptás nuestros términos. Tu número de contacto solo será visible para usuarios registrados.
                  </p>
                </div>
              </div>

              {/* Right: Preview (desktop) */}
              <div className="hidden lg:block w-80 xl:w-96 shrink-0">
                <div className="sticky top-20">
                  <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Vista previa de tu ficha
                  </h3>
                  <OficioPreviewCard form={form} profilePhoto={profilePhoto} portfolioPhotos={portfolioPhotos} />
                </div>
              </div>

            </div>
          </form>
        </div>
      </div>

      {showGuestModal && (
        <GuestInfoModal
          onConfirm={handleGuestConfirm}
          onCancel={() => setShowGuestModal(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {showSuccess && (
        <OficioSuccessModal
          onClose={handleSuccessClose}
          isGuest={successIsGuest}
          guestEmail={successGuestEmail}
          verificationCode={successVerificationCode}
          title={form.title}
          phone={form.phone}
        />
      )}
    </div>
  );
}
