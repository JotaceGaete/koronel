import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import OSMMap from 'components/maps/OSMMap';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { businessService } from '../../services/businessService';

const CORONEL_CENTER = [-37.0298, -73.1429];

const CATEGORIES = [
  { value: '', label: 'Seleccionar categoría...' },
  { value: 'church', label: 'Iglesia' },
  { value: 'courses', label: 'Cursos' },
  { value: 'meetups', label: 'Encuentros' },
  { value: 'other', label: 'Otro' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  category: '',
  startDatetime: '',
  endDatetime: '',
  venueName: '',
  addressText: '',
  contactWhatsapp: '',
  organizerBusinessId: '',
};

export default function PostEventForm() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [pin, setPin] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/eventos/nuevo' } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (user?.id) {
      businessService?.getByOwner(user?.id)?.then(({ data }) => {
        if (data?.length > 0) setUserBusinesses(data);
      });
    }
  }, [user?.id]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handlePhotoChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (file?.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'La imagen no puede superar 5MB' }));
      return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev?.target?.result);
    reader?.readAsDataURL(file);
    setErrors(prev => ({ ...prev, photo: null }));
  };

  const validate = () => {
    const e = {};
    if (!formData?.title?.trim()) e.title = 'El título es obligatorio';
    if (!formData?.category) e.category = 'Selecciona una categoría';
    if (!formData?.startDatetime) e.startDatetime = 'La fecha de inicio es obligatoria';
    if (!formData?.endDatetime) e.endDatetime = 'La fecha de término es obligatoria';
    if (formData?.startDatetime && formData?.endDatetime) {
      if (new Date(formData?.endDatetime) <= new Date(formData?.startDatetime)) {
        e.endDatetime = 'La fecha de término debe ser posterior al inicio';
      }
    }
    if (!formData?.venueName?.trim()) e.venueName = 'El nombre del lugar es obligatorio';
    if (!formData?.addressText?.trim()) e.addressText = 'La dirección es obligatoria';
    if (!formData?.description?.trim()) e.description = 'La descripción es obligatoria';
    if (formData?.description?.trim()?.length < 20) e.description = 'La descripción debe tener al menos 20 caracteres';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev?.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors)?.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl = null;
      if (photo) {
        const ext = photo?.name?.split('.')?.pop();
        const path = `${user?.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase?.storage
          ?.from('event-images')
          ?.upload(path, photo, { cacheControl: '3600', upsert: false });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase?.storage?.from('event-images')?.getPublicUrl(path);
          imageUrl = publicUrl;
        }
      }

      const payload = {
        user_id: user?.id,
        title: formData?.title,
        description: formData?.description,
        category: formData?.category,
        start_datetime: formData?.startDatetime,
        end_datetime: formData?.endDatetime,
        venue_name: formData?.venueName,
        address: formData?.addressText,
        address_text: formData?.addressText,
        contact_whatsapp: formData?.contactWhatsapp || null,
        organizer_business_id: formData?.organizerBusinessId || null,
        lat: pin?.lat || null,
        lng: pin?.lng || null,
        image_url: imageUrl,
        status: 'pending',
      };

      const { error } = await supabase?.from('events')?.insert(payload);
      if (error) throw error;
      setSubmitted(true);
      window?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors({ submit: err?.message || 'Error al enviar el evento. Por favor intenta de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div className="flex items-center justify-center min-h-screen px-4" style={{ paddingTop: '64px' }}>
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#d1fae5' }}>
              <Icon name="CheckCircle" size={40} color="#059669" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-3">¡Evento enviado!</h1>
            <p className="text-muted-foreground mb-2">Tu evento fue enviado y está pendiente de aprobación.</p>
            <p className="text-sm text-muted-foreground mb-8">Nuestro equipo lo revisará en las próximas 24–48 horas hábiles.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/eventos">
                <Button variant="default" iconName="CalendarDays" iconPosition="left" iconSize={16}>Ver eventos</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => { setSubmitted(false); setFormData(EMPTY_FORM); setPhoto(null); setPhotoPreview(null); setErrors({}); setPin(null); }}
                iconName="Plus" iconPosition="left" iconSize={16}
              >
                Publicar otro evento
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      <div style={{ paddingTop: '64px' }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs font-caption text-muted-foreground flex-wrap">
            <Link to="/homepage" className="hover:text-primary transition-colors">Inicio</Link>
            <Icon name="ChevronRight" size={12} color="currentColor" />
            <Link to="/eventos" className="hover:text-primary transition-colors">Eventos</Link>
            <Icon name="ChevronRight" size={12} color="currentColor" />
            <span className="text-foreground">Publicar Evento</span>
          </nav>
        </div>

        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <Icon name="CalendarPlus" size={20} color="white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">Publicar Evento</h1>
              <p className="text-sm text-muted-foreground">Comparte tu evento con la comunidad de Coronel</p>
            </div>
          </div>

          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg border" style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>
            <Icon name="Clock" size={16} color="var(--color-primary)" className="mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">Los eventos son revisados antes de publicarse. El proceso toma entre 24 y 48 horas hábiles.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-5">

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Título del evento <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="text"
                  value={formData?.title}
                  onChange={e => handleChange('title', e?.target?.value)}
                  placeholder="Ej: Feria Gastronómica de Coronel"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderColor: errors?.title ? 'var(--color-error)' : 'var(--color-border)' }}
                />
                {errors?.title && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Descripción <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <textarea
                  value={formData?.description}
                  onChange={e => handleChange('description', e?.target?.value)}
                  placeholder="Describe tu evento con detalle..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  style={{ borderColor: errors?.description ? 'var(--color-error)' : 'var(--color-border)' }}
                />
                {errors?.description && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.description}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Categoría <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <select
                  value={formData?.category}
                  onChange={e => handleChange('category', e?.target?.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderColor: errors?.category ? 'var(--color-error)' : 'var(--color-border)' }}
                >
                  {CATEGORIES?.map(c => (
                    <option key={c?.value} value={c?.value}>{c?.label}</option>
                  ))}
                </select>
                {errors?.category && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.category}</p>}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Fecha y hora de inicio <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="datetime-local"
                    value={formData?.startDatetime}
                    onChange={e => handleChange('startDatetime', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ borderColor: errors?.startDatetime ? 'var(--color-error)' : 'var(--color-border)' }}
                  />
                  {errors?.startDatetime && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.startDatetime}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Fecha y hora de término <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="datetime-local"
                    value={formData?.endDatetime}
                    onChange={e => handleChange('endDatetime', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ borderColor: errors?.endDatetime ? 'var(--color-error)' : 'var(--color-border)' }}
                  />
                  {errors?.endDatetime && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.endDatetime}</p>}
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nombre del lugar <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="text"
                  value={formData?.venueName}
                  onChange={e => handleChange('venueName', e?.target?.value)}
                  placeholder="Ej: Plaza de Armas de Coronel"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderColor: errors?.venueName ? 'var(--color-error)' : 'var(--color-border)' }}
                />
                {errors?.venueName && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.venueName}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Dirección <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="text"
                  value={formData?.addressText}
                  onChange={e => handleChange('addressText', e?.target?.value)}
                  placeholder="Ej: Av. Colón 1234, Coronel"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderColor: errors?.addressText ? 'var(--color-error)' : 'var(--color-border)' }}
                />
                {errors?.addressText && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.addressText}</p>}
              </div>

              {/* Map Pin — OSMMap picker */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Ubicación en el mapa
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional — haz clic para marcar)</span>
                </label>
                <div className="rounded-lg overflow-hidden border border-border" style={{ height: '200px' }}>
                  <OSMMap
                    lat={pin?.lat ?? null}
                    lng={pin?.lng ?? null}
                    onChange={setPin}
                    height="200px"
                    zoom={14}
                    readOnly={false}
                  />
                </div>
                {pin && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      Pin: {pin?.lat?.toFixed(5)}, {pin?.lng?.toFixed(5)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPin(null)}
                      className="text-xs hover:underline"
                      style={{ color: 'var(--color-error)' }}
                    >
                      Quitar pin
                    </button>
                  </div>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Imagen del evento</label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                  onClick={() => fileInputRef?.current?.click()}
                >
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Vista previa" className="max-h-40 mx-auto rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={e => { e?.stopPropagation(); setPhoto(null); setPhotoPreview(null); }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white"
                      >
                        <Icon name="X" size={12} color="white" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Icon name="ImagePlus" size={28} color="var(--color-muted-foreground)" className="mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Haz clic para subir una imagen</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG o WebP · Máx. 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                {errors?.photo && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.photo}</p>}
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">WhatsApp de contacto</label>
                <input
                  type="tel"
                  value={formData?.contactWhatsapp}
                  onChange={e => handleChange('contactWhatsapp', e?.target?.value)}
                  placeholder="+56 9 1234 5678"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Organizer Business */}
              {userBusinesses?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Negocio organizador <span className="text-xs font-normal text-muted-foreground">(opcional)</span></label>
                  <select
                    value={formData?.organizerBusinessId}
                    onChange={e => handleChange('organizerBusinessId', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Sin negocio organizador</option>
                    {userBusinesses?.map(b => (
                      <option key={b?.id} value={b?.id}>{b?.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {errors?.submit && (
                <div className="p-3 rounded-lg border text-sm" style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' }}>
                  {errors?.submit}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/eventos" className="flex-1">
                  <Button variant="outline" className="w-full" type="button">Cancelar</Button>
                </Link>
                <Button
                  variant="default"
                  type="submit"
                  disabled={submitting}
                  iconName={submitting ? undefined : 'Send'}
                  iconPosition="left"
                  iconSize={16}
                  className="flex-1"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
                      Enviando...
                    </span>
                  ) : 'Enviar para revisión'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
