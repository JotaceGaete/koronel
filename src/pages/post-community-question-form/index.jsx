import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { communityService } from '../../services/communityService';
import QuestionImageUpload from './components/QuestionImageUpload';

// Fix Leaflet icon
delete L?.Icon?.Default?.prototype?._getIconUrl;
L?.Icon?.Default?.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CORONEL_CENTER = [-37.0298, -73.1429];

const SECTORS = [
  { value: '', label: 'Seleccionar sector...' },
  { value: 'Centro', label: 'Centro' },
  { value: 'Lagunillas', label: 'Lagunillas' },
  { value: 'Schwager', label: 'Schwager' },
  { value: 'Puchoco', label: 'Puchoco' },
  { value: 'Las Higueras', label: 'Las Higueras' },
  { value: 'Punta de Parra', label: 'Punta de Parra' },
  { value: 'Otro', label: 'Otro' },
];

function PinDropper({ pin, onPinDrop }) {
  useMapEvents({
    click(e) {
      onPinDrop?.({ lat: e?.latlng?.lat, lng: e?.latlng?.lng });
    },
  });
  return pin ? <Marker position={[pin?.lat, pin?.lng]} /> : null;
}

export default function PostCommunityQuestionForm() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ title: '', body: '', sector: '' });
  const [pin, setPin] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/comunidad/nueva' } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!formData?.title?.trim()) e.title = 'El título es obligatorio';
    if (formData?.title?.trim()?.length < 5) e.title = 'El título debe tener al menos 5 caracteres';
    if (!formData?.body?.trim()) e.body = 'La descripción es obligatoria';
    if (formData?.body?.trim()?.length < 10) e.body = 'La descripción debe tener al menos 10 caracteres';
    if (!formData?.sector) e.sector = 'Selecciona un sector';
    return e;
  };

  const handleAddImages = (newImages, err) => {
    setImages(prev => [...prev, ...newImages]?.slice(0, 3));
    if (err) setImageError(err);
    else setImageError(null);
  };

  const handleRemoveImage = (idx) => {
    setImages(prev => {
      const next = [...prev];
      const removed = next?.splice(idx, 1)?.[0];
      if (removed?.preview) URL.revokeObjectURL(removed?.preview);
      return next;
    });
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
      const { data: post, error } = await communityService?.createPost({
        title: formData?.title,
        body: formData?.body,
        sector: formData?.sector,
        lat: pin?.lat || null,
        lng: pin?.lng || null,
        userId: user?.id,
      });
      if (error) throw error;

      // Upload images if any
      if (images?.length > 0 && post?.id) {
        await communityService?.uploadQuestionImages(post?.id, images?.map(i => i?.file));
      }

      setSubmitted(true);
      window?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors({ submit: err?.message || 'Error al enviar la pregunta. Por favor intenta de nuevo.' });
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
            <h1 className="text-2xl font-heading font-bold text-foreground mb-3">¡Pregunta enviada!</h1>
            <p className="text-muted-foreground mb-2">Tu pregunta fue enviada y está pendiente de moderación.</p>
            <p className="text-sm text-muted-foreground mb-8">Nuestro equipo la revisará pronto y la publicará en la comunidad.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/comunidad">
                <Button variant="default" iconName="MessageCircle" iconPosition="left" iconSize={16}>Ver comunidad</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => { setSubmitted(false); setFormData({ title: '', body: '', sector: '' }); setPin(null); setErrors({}); }}
                iconName="Plus" iconPosition="left" iconSize={16}
              >
                Hacer otra pregunta
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
        <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs font-caption text-muted-foreground flex-wrap">
            <Link to="/homepage" className="hover:text-primary transition-colors">Inicio</Link>
            <Icon name="ChevronRight" size={12} color="currentColor" />
            <Link to="/comunidad" className="hover:text-primary transition-colors">Comunidad</Link>
            <Icon name="ChevronRight" size={12} color="currentColor" />
            <span className="text-foreground">Nueva Pregunta</span>
          </nav>
        </div>

        <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <Icon name="MessageCirclePlus" size={20} color="white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">Hacer una Pregunta</h1>
              <p className="text-sm text-muted-foreground">Consulta a la comunidad de Coronel</p>
            </div>
          </div>

          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg border" style={{ background: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>
            <Icon name="Clock" size={16} color="var(--color-primary)" className="mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">Las preguntas son revisadas antes de publicarse. El proceso puede tomar algunas horas.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Título <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData?.title}
                  onChange={e => handleChange('title', e?.target?.value)}
                  placeholder="Ej: ¿Dónde puedo encontrar un buen mecánico en Centro?"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderColor: errors?.title ? 'var(--color-error)' : 'var(--color-border)' }}
                />
                {errors?.title && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.title}</p>}
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Descripción <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <textarea
                  value={formData?.body}
                  onChange={e => handleChange('body', e?.target?.value)}
                  placeholder="Describe tu consulta con más detalle..."
                  rows={5}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  style={{ borderColor: errors?.body ? 'var(--color-error)' : 'var(--color-border)' }}
                />
                {errors?.body && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.body}</p>}
              </div>

              {/* Sector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Sector <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <select
                  value={formData?.sector}
                  onChange={e => handleChange('sector', e?.target?.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderColor: errors?.sector ? 'var(--color-error)' : 'var(--color-border)' }}
                >
                  {SECTORS?.map(s => (
                    <option key={s?.value} value={s?.value}>{s?.label}</option>
                  ))}
                </select>
                {errors?.sector && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.sector}</p>}
              </div>

              {/* Optional Location */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Ubicación (opcional)</label>
                  <button
                    type="button"
                    onClick={() => setShowMap(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <Icon name={showMap ? 'ChevronUp' : 'MapPin'} size={14} color="currentColor" />
                    {showMap ? 'Ocultar mapa' : 'Agregar ubicación'}
                  </button>
                </div>
                {pin && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    <Icon name="MapPin" size={13} color="var(--color-primary)" />
                    <span>Ubicación: {pin?.lat?.toFixed(5)}, {pin?.lng?.toFixed(5)}</span>
                    <button type="button" onClick={() => setPin(null)} className="ml-auto text-xs" style={{ color: 'var(--color-error)' }}>Quitar</button>
                  </div>
                )}
                {showMap && (
                  <div className="rounded-lg overflow-hidden border border-border" style={{ height: '240px' }}>
                    <MapContainer center={CORONEL_CENTER} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={true}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <PinDropper pin={pin} onPinDrop={setPin} />
                    </MapContainer>
                  </div>
                )}
                {showMap && <p className="text-xs text-muted-foreground mt-1">Haz clic en el mapa para marcar la ubicación de tu consulta.</p>}
              </div>

              {/* Image Upload */}
              <QuestionImageUpload
                images={images}
                onAdd={handleAddImages}
                onRemove={handleRemoveImage}
                error={imageError}
              />

              {/* Submit Error */}
              {errors?.submit && (
                <div className="p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  {errors?.submit}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Link to="/comunidad" className="flex-1">
                  <Button variant="outline" className="w-full">Cancelar</Button>
                </Link>
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1"
                  disabled={submitting}
                  iconName={submitting ? undefined : 'Send'}
                  iconPosition="right"
                  iconSize={16}
                >
                  {submitting ? 'Enviando...' : 'Enviar pregunta'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
