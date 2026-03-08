import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import PhotoUpload from './components/PhotoUpload';
import AdForm from './components/AdForm';
import AdPreviewPanel from './components/AdPreviewPanel';
import SuccessModal from './components/SuccessModal';
import GuestInfoModal from './components/GuestInfoModal';
import { useAuth } from '../../contexts/AuthContext';
import { adService } from '../../services/adService';

const INITIAL_FORM = {
  title: '',
  category: '',
  description: '',
  price: '',
  priceNegotiable: false,
  phone: '',
  whatsapp: false,
  location: '',
  duration: '30',
};

function validate(formData) {
  const errs = {};
  if (!formData?.title?.trim()) errs.title = 'El título es obligatorio';
  else if (formData?.title?.trim()?.length < 10) errs.title = 'El título debe tener al menos 10 caracteres';
  if (!formData?.category) errs.category = 'Selecciona una categoría';
  if (!formData?.description?.trim()) errs.description = 'La descripción es obligatoria';
  else if (formData?.description?.trim()?.length < 20) errs.description = 'La descripción debe tener al menos 20 caracteres';
  if (!formData?.phone?.trim()) errs.phone = 'El teléfono de contacto es obligatorio';
  else if (formData?.phone?.replace(/\D/g, '')?.length < 9) errs.phone = 'Ingresa un número chileno válido (+56 9 XXXX XXXX)';
  return errs;
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

function isAdminUser(user, userProfile) {
  if (!user) return false;
  const meta = user?.user_metadata || {};
  const appMeta = user?.app_metadata || {};
  const authAdmin = meta?.role === 'admin' || appMeta?.role === 'admin';
  const profileAdmin = userProfile?.role === 'admin';
  return authAdmin || profileAdmin;
}

export default function PostClassifiedAd() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [successIsGuest, setSuccessIsGuest] = useState(false);
  const [successGuestEmail, setSuccessGuestEmail] = useState('');
  const [successVerificationCode, setSuccessVerificationCode] = useState('');
  const [successAdTitle, setSuccessAdTitle] = useState('');
  const [successAdPhone, setSuccessAdPhone] = useState('');

  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(null);
    adService?.getAdCategories()?.then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setCategoriesError(error?.message || 'Error al cargar categorías');
      } else {
        setCategories(data);
      }
      setCategoriesLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = validate(formData);
    if (Object.keys(errs)?.length > 0) {
      setErrors(errs);
      const firstErrEl = document.querySelector('[data-error]');
      firstErrEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // If user is not logged in, show guest info modal
    if (!user) {
      setShowGuestModal(true);
      return;
    }

    // Administradores sin límite por usuario
    const isAdmin = isAdminUser(user, userProfile);
    if (!isAdmin) {
      const withinLimit = await adService?.checkDailyLimit(user?.id, 'user_id', user?.id);
      if (!withinLimit) {
        setSubmitError('Has alcanzado el límite de 20 avisos por día. Intenta mañana.');
        return;
      }
    }

    await doSubmit(null);
  };

  const handleGuestConfirm = async (guestInfo) => {
    // Check rate limit by email (guest, no userId)
    const emailLimit = await adService?.checkDailyLimit(guestInfo?.email, 'email');
    if (!emailLimit) {
      setSubmitError('Este email ya alcanzó el límite de avisos por día.');
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

      // Administradores sin límite por IP (comprobar también userProfile por si el rol está solo ahí)
      const isAdmin = isAdminUser(user, userProfile);
      if (!isAdmin) {
        const ipLimit = await adService?.checkDailyLimit(ipAddress, 'ip');
        if (!ipLimit) {
          setSubmitError('Se ha alcanzado el límite de publicaciones desde esta dirección IP. Intenta mañana.');
          setIsSubmitting(false);
          return;
        }
      }

      const photoPaths = [];
      for (const photo of photos) {
        if (photo?.file) {
          const { path, error: uploadError } = await adService?.uploadPhoto(photo?.file, user?.id || null);
          if (!uploadError && path) photoPaths?.push(path);
        }
      }

      const selectedCategory = categories?.find(c => c?.id === formData?.category);
      const enrichedFormData = {
        ...formData,
        categoryName: selectedCategory?.name || formData?.category,
        categoryKey: selectedCategory?.name_key || formData?.category?.toLowerCase()?.replace(/\s+/g, '-'),
      };

      const { data: ad, error: createError, isGuest, verificationToken } = await adService?.create({
        userId: user?.id || null,
        formData: enrichedFormData,
        photoPaths,
        guestInfo,
        ipAddress,
      });

      if (createError) {
        setSubmitError('Error al publicar el aviso. Por favor intenta de nuevo.');
      } else {
        // Increment daily counters (administradores no suman a los límites)
        const isAdmin = isAdminUser(user, userProfile);
        if (!isAdmin) {
          if (user?.id) {
            await adService?.incrementDailyCount(user?.id, 'user_id');
          } else if (guestInfo?.email) {
            await adService?.incrementDailyCount(guestInfo?.email, 'email');
          }
          await adService?.incrementDailyCount(ipAddress, 'ip');
        }

        setSuccessIsGuest(isGuest);
        setSuccessGuestEmail(guestInfo?.email || '');
        if (isGuest && verificationToken) {
          setSuccessVerificationCode(verificationToken?.slice(0, 8)?.toUpperCase());
          setSuccessAdTitle(ad?.title || formData?.title || '');
          setSuccessAdPhone(guestInfo?.phone || formData?.phone || '');
        }
        setShowSuccess(true);
      }
    } catch (err) {
      setSubmitError('Error inesperado. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSavingDraft(false);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setFormData(INITIAL_FORM);
    setPhotos([]);
    setErrors({});
    navigate('/classified-ads-listing');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Breadcrumb */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3">
            <nav className="flex items-center gap-2 text-sm font-caption text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/homepage" className="hover:text-primary transition-colors duration-150">Inicio</Link>
              <Icon name="ChevronRight" size={14} color="currentColor" />
              <Link to="/classified-ads-listing" className="hover:text-primary transition-colors duration-150">Clasificados</Link>
              <Icon name="ChevronRight" size={14} color="currentColor" />
              <span className="text-foreground font-medium">Publicar aviso</span>
            </nav>
          </div>
        </div>

        {/* Page Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-5 md:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
                  <Icon name="PlusCircle" size={28} color="var(--color-primary)" />
                  Publicar aviso
                </h1>
                <p className="text-sm md:text-base font-body text-muted-foreground mt-1">
                  Llega a miles de vecinos de Coronel con tu aviso clasificado
                </p>
              </div>
              <button
                onClick={() => setPreviewOpen(v => !v)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-muted text-sm font-caption text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 shrink-0 min-h-[44px]"
                aria-expanded={previewOpen}
              >
                <Icon name="Eye" size={16} color="currentColor" />
                <span className="hidden sm:inline">Vista previa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Guest info banner */}
        {!user && (
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4">
            <div className="flex items-start gap-3 p-3 rounded-md border"
              style={{ background: 'rgba(44,82,130,0.06)', borderColor: 'rgba(44,82,130,0.2)' }}>
              <Icon name="UserCheck" size={17} color="var(--color-primary)" className="shrink-0 mt-0.5" />
              <p className="text-sm font-caption text-foreground">
                Puedes publicar sin cuenta. Al finalizar te pediremos tu email para verificar el aviso.
                <Link to="/login" className="ml-1 font-semibold underline" style={{ color: 'var(--color-primary)' }}>Iniciar sesión</Link>
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Left: Form */}
              <div className="flex-1 min-w-0 space-y-6">
                {/* Tips Banner */}
                <div className="flex items-start gap-3 p-4 rounded-md border"
                  style={{ background: 'rgba(44,82,130,0.06)', borderColor: 'rgba(44,82,130,0.2)' }}>
                  <Icon name="Lightbulb" size={18} color="var(--color-primary)" className="shrink-0 mt-0.5" />
                  <p className="text-sm font-caption text-foreground">
                    <strong>Consejo:</strong> Los avisos con fotos y descripción detallada reciben hasta 5x más contactos.
                    Incluye el estado del artículo y el motivo de venta.
                  </p>
                </div>

                {/* Section: Photos */}
                <section className="bg-card border border-border rounded-md p-4 md:p-6">
                  <h2 className="font-heading font-semibold text-base md:text-lg text-foreground mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                      style={{ background: 'var(--color-primary)' }}>1</span>
                    Fotos
                  </h2>
                  <PhotoUpload photos={photos} onChange={setPhotos} />
                </section>

                {/* Section: Ad Details */}
                <section className="bg-card border border-border rounded-md p-4 md:p-6">
                  <h2 className="font-heading font-semibold text-base md:text-lg text-foreground mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                      style={{ background: 'var(--color-primary)' }}>2</span>
                    Detalles del aviso
                  </h2>
                  <AdForm
                    formData={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                    categories={categories}
                    categoriesLoading={categoriesLoading}
                    categoriesError={categoriesError}
                  />
                </section>

                {previewOpen && (
                  <section className="lg:hidden">
                    <AdPreviewPanel formData={formData} photos={photos} />
                  </section>
                )}

                {/* Actions */}
                <div className="bg-card border border-border rounded-md p-4 md:p-6">
                  {submitError && (
                    <div className="mb-4 flex items-center gap-2 p-3 rounded-md text-sm font-caption" style={{ background: '#E53E3E18', color: 'var(--color-error)' }}>
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
                      iconName="Send"
                      iconPosition="left"
                      iconSize={18}
                      className="flex-1 sm:flex-none sm:min-w-[180px]"
                    >
                      {isSubmitting ? 'Publicando...' : 'Publicar aviso'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      loading={isSavingDraft}
                      iconName="Save"
                      iconPosition="left"
                      iconSize={18}
                      onClick={handleSaveDraft}
                      className="flex-1 sm:flex-none"
                    >
                      {isSavingDraft ? 'Guardando...' : 'Guardar borrador'}
                    </Button>
                    <Link to="/classified-ads-listing" className="flex-1 sm:flex-none">
                      <Button type="button" variant="ghost" size="lg" fullWidth>
                        Cancelar
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs font-caption text-muted-foreground mt-3 flex items-start gap-1.5">
                    <Icon name="Shield" size={13} color="var(--color-success)" className="shrink-0 mt-0.5" />
                    Al publicar aceptas nuestros{' '}
                    <span className="underline cursor-pointer" style={{ color: 'var(--color-primary)' }}>
                      términos y condiciones
                    </span>
                    . Tu información de contacto solo será visible para usuarios registrados.
                  </p>
                </div>
              </div>

              {/* Right: Preview (desktop) */}
              <div className="hidden lg:block w-80 xl:w-96 shrink-0">
                <div className="sticky top-20">
                  <AdPreviewPanel formData={formData} photos={photos} />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Guest Info Modal */}
      {showGuestModal && (
        <GuestInfoModal
          onConfirm={handleGuestConfirm}
          onCancel={() => setShowGuestModal(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Success Modal */}
      {showSuccess && (
        <SuccessModal
          onClose={handleSuccessClose}
          isGuest={successIsGuest}
          guestEmail={successGuestEmail}
          verificationCode={successVerificationCode}
          adTitle={successAdTitle}
          adPhone={successAdPhone}
        />
      )}
    </div>
  );
}