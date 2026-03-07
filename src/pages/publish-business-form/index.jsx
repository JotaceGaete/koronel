// Route: /publicar-negocio
// Protected: requires authentication
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { businessService } from '../../services/businessService';
import OSMMap from 'components/maps/OSMMap';
import { geocode } from '../../services/geocodingService';

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const SOCIAL_TYPES = ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'X (Twitter)', 'WhatsApp', 'Otra'];

const SOCIAL_ICONS = {
  Facebook: 'Facebook',
  Instagram: 'Instagram',
  TikTok: 'Music2',
  YouTube: 'Youtube',
  'X (Twitter)': 'Twitter',
  WhatsApp: 'MessageCircle',
  Otra: 'Link',
};

// Default preset: Lun–Jue 09:00–18:00, Vie 09:00–17:00, Sáb 09:00–13:00, Dom Cerrado
const buildDefaultHours = () => ({
  monday:    { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
  tuesday:   { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
  wednesday: { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
  thursday:  { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
  friday:    { closed: false, slots: [{ open: '09:00', close: '17:00' }] },
  saturday:  { closed: false, slots: [{ open: '09:00', close: '13:00' }] },
  sunday:    { closed: true,  slots: [{ open: '09:00', close: '18:00' }] },
});

const INITIAL_FORM = {
  nombre: '',
  parent_category_id: '',
  parent_category_name: '',
  categoria_id: '',
  categoria_nombre: '',
  categoria_key: '',
  telefono: '',
  direccion: '',
  address_text: '',
  lat: null,
  lng: null,
  descripcion: '',
  whatsapp: '',
  website_url: '',
};

export default function PublishBusinessForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [publicationType, setPublicationType] = useState('free');
  const [categoryTree, setCategoryTree] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [catsError, setCatsError] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const logoInputRef = useRef(null);
  const photosInputRef = useRef(null);

  // Hours state — three modes: 'por_dia' | 'variable' | 'always_open'
  const [hoursMode, setHoursMode] = useState('por_dia');
  const [perDayHours, setPerDayHours] = useState(buildDefaultHours());

  // Social links state
  const [socialLinks, setSocialLinks] = useState([]);

  // Geocoding state
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/publicar-negocio' } });
      return;
    }
    loadCategories();
  }, [user]);

  const loadCategories = async () => {
    setCatsLoading(true);
    setCatsError(null);
    const { data, error } = await businessService?.getHierarchicalCategories();
    if (error) {
      setCatsError('Error al cargar categorías. Intenta de nuevo.');
    } else {
      setCategoryTree(data || []);
    }
    setCatsLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e?.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors?.[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleParentCategoryChange = (e) => {
    const parentId = e?.target?.value;
    const parent = categoryTree?.find(c => c?.id === parentId);
    const subs = parent?.subcategories || [];
    setSubcategories(subs);
    setForm(prev => ({
      ...prev,
      parent_category_id: parentId,
      parent_category_name: parent?.name || '',
      categoria_id: '',
      categoria_nombre: '',
      categoria_key: '',
    }));
    if (errors?.parent_category_id) setErrors(prev => ({ ...prev, parent_category_id: null }));
    if (errors?.categoria_id) setErrors(prev => ({ ...prev, categoria_id: null }));
  };

  const handleSubcategoryChange = (e) => {
    const subId = e?.target?.value;
    const sub = subcategories?.find(c => c?.id === subId);
    setForm(prev => ({
      ...prev,
      categoria_id: sub?.id || '',
      categoria_nombre: sub?.name || '',
      categoria_key: sub?.name_key || '',
    }));
    if (errors?.categoria_id) setErrors(prev => ({ ...prev, categoria_id: null }));
  };

  const handleLogoChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp']?.includes(file?.type)) {
      setErrors(prev => ({ ...prev, logo: 'Solo se permiten imágenes JPG, PNG o WebP.' }));
      return;
    }
    if (file?.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'El logo no puede superar 2MB.' }));
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setErrors(prev => ({ ...prev, logo: null }));
  };

  const handlePhotosChange = (e) => {
    const files = Array.from(e?.target?.files || []);
    const valid = files?.filter(f => ['image/jpeg', 'image/png', 'image/webp']?.includes(f?.type));
    const combined = [...photoFiles, ...valid]?.slice(0, 5);
    setPhotoFiles(combined);
    setPhotoPreviews(combined?.map(f => URL.createObjectURL(f)));
  };

  const removePhoto = (idx) => {
    const updated = photoFiles?.filter((_, i) => i !== idx);
    setPhotoFiles(updated);
    setPhotoPreviews(updated?.map(f => URL.createObjectURL(f)));
  };

  // ── Per-day hours helpers ──────────────────────────────────────────────────
  const updatePerDaySlot = (dayKey, slotIdx, field, value) => {
    setPerDayHours(prev => ({
      ...prev,
      [dayKey]: {
        ...prev?.[dayKey],
        slots: prev?.[dayKey]?.slots?.map((s, i) => i === slotIdx ? { ...s, [field]: value } : s),
      },
    }));
  };

  const addSlot = (dayKey) => {
    setPerDayHours(prev => {
      const day = prev?.[dayKey];
      if (day?.slots?.length >= 2) return prev;
      return { ...prev, [dayKey]: { ...day, slots: [...day?.slots, { open: '14:00', close: '20:00' }] } };
    });
  };

  const removeSlot = (dayKey, slotIdx) => {
    setPerDayHours(prev => ({
      ...prev,
      [dayKey]: { ...prev?.[dayKey], slots: prev?.[dayKey]?.slots?.filter((_, i) => i !== slotIdx) },
    }));
  };

  const toggleDayClosed = (dayKey) => {
    setPerDayHours(prev => ({
      ...prev,
      [dayKey]: { ...prev?.[dayKey], closed: !prev?.[dayKey]?.closed },
    }));
  };

  // ── Quick-copy helpers ─────────────────────────────────────────────────────
  const copyDayTo = (sourceKey, targetKeys) => {
    const source = perDayHours?.[sourceKey];
    if (!source) return;
    setPerDayHours(prev => {
      const next = { ...prev };
      targetKeys?.forEach(k => { next[k] = { ...source, slots: source?.slots?.map(s => ({ ...s })) }; });
      return next;
    });
  };

  const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const WEEKEND_KEYS = ['saturday', 'sunday'];
  const ALL_KEYS = DAYS?.map(d => d?.key);

  // Copy a day to the next day in the DAYS array
  const copyToNextDay = (dayKey) => {
    const idx = DAYS?.findIndex(d => d?.key === dayKey);
    if (idx < 0 || idx >= DAYS?.length - 1) return;
    const nextKey = DAYS?.[idx + 1]?.key;
    copyDayTo(dayKey, [nextKey]);
  };

  // Copy Monday's schedule to all other days
  const copyMondayToAll = () => {
    const otherKeys = DAYS?.filter(d => d?.key !== 'monday')?.map(d => d?.key);
    copyDayTo('monday', otherKeys);
  };

  // ── Social links helpers ───────────────────────────────────────────────────
  const addSocialLink = () => {
    setSocialLinks(prev => [...prev, { type: 'Instagram', url: '' }]);
  };

  const updateSocialLink = (idx, field, value) => {
    setSocialLinks(prev => prev?.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeSocialLink = (idx) => {
    setSocialLinks(prev => prev?.filter((_, i) => i !== idx));
  };

  // ── Build opening_hours JSON ───────────────────────────────────────────────
  const buildOpeningHours = () => {
    if (hoursMode === 'variable') return { mode: 'variable' };
    if (hoursMode === 'always_open') return { mode: 'always_open' };
    // por_dia
    const days = {};
    DAYS?.forEach(d => {
      const day = perDayHours?.[d?.key];
      if (day?.closed) {
        days[d.key] = { open: false, slots: [] };
      } else {
        days[d.key] = { open: true, slots: day?.slots };
      }
    });
    return { mode: 'by_day', days };
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateHours = () => {
    const errs = {};
    if (hoursMode !== 'por_dia') return errs;
    DAYS?.forEach(d => {
      const day = perDayHours?.[d?.key];
      if (!day?.closed) {
        day?.slots?.forEach((slot, i) => {
          if (slot?.close <= slot?.open) {
            errs[`${d.key}_slot_${i}`] = `${d?.label}: cierre debe ser mayor que apertura.`;
          }
        });
        if (day?.slots?.length === 2) {
          if (day?.slots?.[1]?.open < day?.slots?.[0]?.close) {
            errs[`${d.key}_overlap`] = `${d?.label}: los tramos se solapan.`;
          }
        }
      }
    });
    return errs;
  };

  const validate = () => {
    const newErrors = {};
    if (!form?.nombre?.trim()) newErrors.nombre = 'El nombre del negocio es obligatorio.';
    if (!form?.parent_category_id) newErrors.parent_category_id = 'Debes seleccionar una categoría principal.';
    if (form?.parent_category_id && subcategories?.length > 0 && !form?.categoria_id) {
      newErrors.categoria_id = 'Debes seleccionar una subcategoría.';
    }
    if (!form?.telefono?.trim()) newErrors.telefono = 'El teléfono es obligatorio.';
    if (!form?.direccion?.trim()) newErrors.direccion = 'La dirección es obligatoria.';
    if (!form?.descripcion?.trim()) newErrors.descripcion = 'La descripción es obligatoria.';
    if (form?.website_url?.trim()) {
      try { new URL(form.website_url.trim()); } catch { newErrors.website_url = 'URL del sitio web no válida.'; }
    }
    socialLinks?.forEach((s, i) => {
      if (!s?.url?.trim()) { newErrors[`social_${i}`] = 'La URL es obligatoria.'; return; }
      if (s?.type === 'WhatsApp') {
        const waOk = /^(https?:\/\/(wa\.me|api\.whatsapp\.com)|\+\d{7,15})/?.test(s?.url?.trim());
        if (!waOk) newErrors[`social_${i}`] = 'Para WhatsApp usa formato https://wa.me/... o +56...';
      } else {
        try { new URL(s.url.trim()); } catch { newErrors[`social_${i}`] = 'URL no válida.'; }
      }
    });
    const hoursErrs = validateHours();
    return { ...newErrors, ...hoursErrs };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors)?.length > 0) {
      setErrors(validationErrors);
      return;
    }
    if (publicationType === 'premium') {
      setShowPaymentModal(true);
      return;
    }
    await doSubmit('pending');
  };

  const handleSimulatePayment = async () => {
    setShowPaymentModal(false);
    await doSubmit('premium');
  };

  const doSubmit = async (status) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const premiumUntil = status === 'premium'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)?.toISOString()
        : null;

      const finalCategoryId = form?.categoria_id || form?.parent_category_id;
      const finalCategoryName = form?.categoria_nombre || form?.parent_category_name;
      const finalCategoryKey = form?.categoria_key || '';

      const payload = {
        name: form?.nombre?.trim(),
        category: finalCategoryName,
        category_key: finalCategoryKey,
        category_id: finalCategoryId || null,
        phone: form?.telefono?.trim(),
        address: form?.direccion?.trim(),
        address_text: form?.address_text?.trim() || form?.direccion?.trim() || null,
        lat: form?.lat ?? null,
        lng: form?.lng ?? null,
        description: form?.descripcion?.trim(),
        whatsapp: form?.whatsapp?.trim() || null,
        website: form?.website_url?.trim() || null,
        opening_hours: buildOpeningHours(),
        social_links: socialLinks?.filter(s => s?.url?.trim()),
        owner_id: user?.id,
        claimed: true,
        status,
        premium_until: premiumUntil,
        verified: false,
        featured: false,
      };

      const { data: business, error: bizError } = await businessService?.create(payload);
      if (bizError) throw new Error(bizError.message || 'Error al crear el negocio.');

      if (logoFile && business?.id) {
        const { publicUrl, error: uploadErr } = await businessService?.uploadLogo(logoFile, business?.id);
        if (!uploadErr && publicUrl) {
          await businessService?.update(business?.id, { logo_url: publicUrl });
        }
      }

      if (photoFiles?.length > 0 && business?.id) {
        for (let i = 0; i < photoFiles?.length; i++) {
          const { path, error: uploadErr } = await businessService?.uploadImage(photoFiles?.[i], business?.id);
          if (!uploadErr && path) {
            await businessService?.addImage({
              businessId: business?.id,
              storagePath: path,
              altText: `Foto ${i + 1} de ${form?.nombre}`,
              isPrimary: i === 0,
              sortOrder: i,
            });
          }
        }
      }

      setSuccess(true);
    } catch (err) {
      setSubmitError(err?.message || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeocode = async () => {
    const query = form?.address_text?.trim() || form?.direccion?.trim();
    if (!query) { setGeocodeError('Ingresa una direcci\u00f3n primero.'); return; }
    setGeocoding(true);
    setGeocodeError(null);
    const result = await geocode(query);
    setGeocoding(false);
    if (!result) {
      setGeocodeError('No se encontr\u00f3 la direcci\u00f3n. Intenta ser m\u00e1s espec\u00edfico.');
      return;
    }
    setForm(prev => ({ ...prev, lat: result?.lat, lng: result?.lng }));
  };

  if (success) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Header />
        <div style={{ paddingTop: '64px' }} className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full mx-4 bg-card border border-border rounded-xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-success, #22c55e)20' }}>
              <Icon name="CheckCircle" size={40} color="var(--color-success, #22c55e)" />
            </div>
            <h2 className="font-heading font-bold text-xl text-foreground mb-2">
              {publicationType === 'premium' ? '¡Negocio publicado como Premium!' : '¡Negocio enviado para revisión!'}
            </h2>
            <p className="text-sm font-caption text-muted-foreground mb-6">
              {publicationType === 'premium' ? 'Tu negocio ya aparece en el directorio como Premium por 30 días.' : 'Tu negocio quedará visible en el directorio una vez que sea aprobado por nuestro equipo.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/mis-negocios')}
                className="w-full py-2.5 rounded-md text-sm font-medium text-white transition-colors"
                style={{ background: 'var(--color-primary)' }}
              >
                Ver mis negocios
              </button>
              <button
                onClick={() => navigate('/business-directory-listing')}
                className="w-full py-2.5 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors text-foreground"
              >
                Ir al directorio
              </button>
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
        {/* Page Header */}
        <div style={{ background: 'var(--color-primary)' }} className="px-4 md:px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
              <Link to="/business-directory-listing" className="text-white/70 hover:text-white transition-colors">
                <Icon name="ArrowLeft" size={20} color="currentColor" />
              </Link>
              <h1 className="font-heading font-bold text-xl text-white">Publicar mi negocio</h1>
            </div>
            <p className="text-white/80 text-sm font-caption ml-8">Completa el formulario para agregar tu negocio al directorio de Coronel</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <form onSubmit={handleSubmit} noValidate>
            {/* Required Fields */}
            <div className="bg-card border border-border rounded-xl p-6 mb-4">
              <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="Building2" size={18} color="var(--color-primary)" />
                Información del negocio
              </h2>
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nombre del negocio <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="text"
                    name="nombre"
                    value={form?.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Pizzería Don Carlos"
                    className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.nombre ? 'border-red-400' : 'border-border'}`}
                  />
                  {errors?.nombre && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.nombre}</p>}
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Categoría <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  {catsLoading ? (
                    <div className="flex items-center gap-2 py-2.5 px-3 border border-border rounded-md bg-muted">
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                      <span className="text-sm text-muted-foreground">Cargando categorías...</span>
                    </div>
                  ) : catsError ? (
                    <div className="py-2.5 px-3 border border-red-300 rounded-md bg-red-50">
                      <p className="text-sm" style={{ color: 'var(--color-error)' }}>{catsError}</p>
                      <button type="button" onClick={loadCategories} className="text-xs underline mt-1" style={{ color: 'var(--color-primary)' }}>Reintentar</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Paso 1: Categoría principal</label>
                        <select
                          value={form?.parent_category_id}
                          onChange={handleParentCategoryChange}
                          autoComplete="off"
                          className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.parent_category_id ? 'border-red-400' : 'border-border'}`}
                        >
                          <option value="">Selecciona una categoría...</option>
                          {categoryTree?.map(cat => (
                            <option key={cat?.id} value={cat?.id}>{cat?.name}</option>
                          ))}
                        </select>
                        {errors?.parent_category_id && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.parent_category_id}</p>}
                      </div>
                      {form?.parent_category_id && subcategories?.length > 0 && (
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Paso 2: Subcategoría</label>
                          <select
                            value={form?.categoria_id}
                            onChange={handleSubcategoryChange}
                            autoComplete="off"
                            className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.categoria_id ? 'border-red-400' : 'border-border'}`}
                          >
                            <option value="">Selecciona una subcategoría...</option>
                            {subcategories?.map(sub => (
                              <option key={sub?.id} value={sub?.id}>{sub?.name}</option>
                            ))}
                          </select>
                          {errors?.categoria_id && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.categoria_id}</p>}
                        </div>
                      )}
                      {form?.parent_category_name && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs" style={{ background: 'var(--color-muted)' }}>
                          <Icon name="Tag" size={13} color="var(--color-primary)" />
                          <span className="text-muted-foreground">Categoría seleccionada:</span>
                          <span className="font-medium text-foreground">{form?.parent_category_name}</span>
                          {form?.categoria_nombre && (
                            <>
                              <Icon name="ChevronRight" size={13} color="var(--color-muted-foreground)" />
                              <span className="font-medium text-foreground">{form?.categoria_nombre}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Teléfono <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="tel"
                    name="telefono"
                    value={form?.telefono}
                    onChange={handleChange}
                    placeholder="Ej: +56 9 1234 5678"
                    className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.telefono ? 'border-red-400' : 'border-border'}`}
                  />
                  {errors?.telefono && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.telefono}</p>}
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Dirección <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="text"
                    name="direccion"
                    value={form?.direccion}
                    onChange={handleChange}
                    placeholder="Ej: Av. Los Carrera 123, Coronel"
                    className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.direccion ? 'border-red-400' : 'border-border'}`}
                  />
                  {errors?.direccion && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.direccion}</p>}
                </div>

                {/* Ubicación en el mapa */}
                <div className="border border-border rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Icon name="MapPin" size={15} color="var(--color-primary)" />
                    Ubicación en el mapa
                  </h3>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Dirección detallada</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form?.address_text}
                        onChange={e => { setForm(prev => ({ ...prev, address_text: e?.target?.value })); setGeocodeError(null); }}
                        placeholder="Ej: Las Encinas 80, Coronel"
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={handleGeocode}
                        disabled={geocoding}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-white rounded-md transition-colors disabled:opacity-60 shrink-0"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        {geocoding ? (
                          <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-white" />
                        ) : (
                          <Icon name="MapPin" size={14} color="white" />
                        )}
                        Buscar en el mapa
                      </button>
                    </div>
                    {geocodeError && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{geocodeError}</p>}
                  </div>
                  <div className="rounded-lg overflow-hidden border border-border" style={{ height: '350px' }}>
                    <OSMMap
                      lat={form?.lat}
                      lng={form?.lng}
                      onChange={({ lat, lng }) => setForm(prev => ({ ...prev, lat, lng }))}
                      height="350px"
                      zoom={14}
                      readOnly={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form?.lat && form?.lng
                      ? `📍 ${parseFloat(form?.lat)?.toFixed(5)}, ${parseFloat(form?.lng)?.toFixed(5)}`
                      : 'Sin coordenadas guardadas'}
                  </p>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Descripción <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <textarea
                    name="descripcion"
                    value={form?.descripcion}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe tu negocio, productos o servicios..."
                    className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none ${errors?.descripcion ? 'border-red-400' : 'border-border'}`}
                  />
                  {errors?.descripcion && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.descripcion}</p>}
                </div>
              </div>
            </div>

            {/* ── Horarios ──────────────────────────────────────────────────── */}
            <div className="bg-card border border-border rounded-xl p-6 mb-4">
              <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="Clock" size={18} color="var(--color-primary)" />
                Horarios de atención
              </h2>

              {/* Mode pills — top row */}
              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  { key: 'por_dia',     label: 'Por día' },
                  { key: 'variable',    label: 'Horario variable (consultar por WhatsApp)' },
                  { key: 'always_open', label: 'Atención 24 horas' },
                ]?.map(m => (
                  <button
                    key={m?.key}
                    type="button"
                    onClick={() => setHoursMode(m?.key)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      hoursMode === m?.key
                        ? 'border-primary bg-primary/10 text-primary font-medium' :'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {m?.label}
                  </button>
                ))}
              </div>

              {/* Variable mode */}
              {hoursMode === 'variable' && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
                  <Icon name="MessageCircle" size={18} color="#d97706" className="mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    Tu horario será mostrado como variable. Se recomienda indicar un WhatsApp de contacto.
                  </p>
                </div>
              )}

              {/* Always open mode */}
              {hoursMode === 'always_open' && (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50">
                  <Icon name="Clock" size={18} color="#16a34a" className="shrink-0" />
                  <p className="text-sm font-medium text-green-800">Tu negocio aparecerá como Abierto 24/7.</p>
                </div>
              )}

              {/* Por día mode — weekly editor */}
              {hoursMode === 'por_dia' && (
                <div className="space-y-2">
                  {DAYS?.map((d, dayIndex) => {
                    const day = perDayHours?.[d?.key];
                    const isLastDay = dayIndex === DAYS?.length - 1;
                    return (
                      <div key={d?.key} className="border border-border rounded-lg p-3">
                        {/* Day header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-foreground w-20">{d?.label}</span>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={day?.closed}
                                onChange={() => toggleDayClosed(d?.key)}
                                className="rounded"
                              />
                              <span className={day?.closed ? 'text-red-500 font-medium' : 'text-muted-foreground'}>Cerrado</span>
                            </label>
                          </div>
                          {/* Copy to next day */}
                          {!isLastDay && (
                            <button
                              type="button"
                              title={`Copiar al día siguiente (${DAYS?.[dayIndex + 1]?.label})`}
                              onClick={() => copyToNextDay(d?.key)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Icon name="ArrowRight" size={13} color="currentColor" />
                              <span>Copiar al siguiente</span>
                            </button>
                          )}
                        </div>

                        {/* Time slots */}
                        {!day?.closed && (
                          <div className="space-y-2">
                            {day?.slots?.map((slot, si) => (
                              <div key={si} className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={slot?.open}
                                  onChange={e => updatePerDaySlot(d?.key, si, 'open', e?.target?.value)}
                                  className="flex-1 px-2 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none"
                                />
                                <span className="text-muted-foreground text-xs">–</span>
                                <input
                                  type="time"
                                  value={slot?.close}
                                  onChange={e => updatePerDaySlot(d?.key, si, 'close', e?.target?.value)}
                                  className="flex-1 px-2 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none"
                                />
                                {si > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => removeSlot(d?.key, si)}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                                  >
                                    <Icon name="X" size={13} color="currentColor" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {errors?.[`${d?.key}_slot_0`] && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{errors?.[`${d?.key}_slot_0`]}</p>}
                            {errors?.[`${d?.key}_slot_1`] && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{errors?.[`${d?.key}_slot_1`]}</p>}
                            {errors?.[`${d?.key}_overlap`] && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{errors?.[`${d?.key}_overlap`]}</p>}
                            {day?.slots?.length < 2 && (
                              <button
                                type="button"
                                onClick={() => addSlot(d?.key)}
                                className="flex items-center gap-1 text-xs mt-1 hover:underline"
                                style={{ color: 'var(--color-primary)' }}
                              >
                                <Icon name="Plus" size={12} color="currentColor" /> + Agregar tramo
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Global action: copy Monday to all days */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={copyMondayToAll}
                      className="flex items-center gap-2 w-full justify-center px-4 py-2.5 text-sm rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <Icon name="Copy" size={14} color="currentColor" />
                      Copiar horario del Lunes a todos los días
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Fields */}
            <div className="bg-card border border-border rounded-xl p-6 mb-4">
              <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="Plus" size={18} color="var(--color-primary)" />
                Información adicional (opcional)
              </h2>
              <div className="space-y-4">
                {/* WhatsApp */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">WhatsApp</label>
                  <input
                    type="text"
                    name="whatsapp"
                    value={form?.whatsapp}
                    onChange={handleChange}
                    placeholder="Ej: +56 9 1234 5678"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Sitio web */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Sitio web</label>
                  <input
                    type="url"
                    name="website_url"
                    value={form?.website_url}
                    onChange={handleChange}
                    placeholder="Ej: https://minegocio.cl"
                    className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.website_url ? 'border-red-400' : 'border-border'}`}
                  />
                  {errors?.website_url && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.website_url}</p>}
                </div>

                {/* Redes sociales */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Redes sociales</label>
                  <div className="space-y-2">
                    {socialLinks?.map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <select value={s?.type} onChange={e => updateSocialLink(i, 'type', e?.target?.value)}
                          className="w-36 px-2 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none shrink-0">
                          {SOCIAL_TYPES?.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="flex-1">
                          <input type="text" value={s?.url} onChange={e => updateSocialLink(i, 'url', e?.target?.value)}
                            placeholder={s?.type === 'WhatsApp' ? 'https://wa.me/56912345678 o +56...' : 'https://...'}
                            className={`w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.[`social_${i}`] ? 'border-red-400' : 'border-border'}`} />
                          {errors?.[`social_${i}`] && <p className="text-xs mt-0.5" style={{ color: 'var(--color-error)' }}>{errors?.[`social_${i}`]}</p>}
                        </div>
                        <button type="button" onClick={() => removeSocialLink(i)}
                          className="p-2 rounded hover:bg-muted text-muted-foreground shrink-0 mt-0.5">
                          <Icon name="X" size={15} color="currentColor" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addSocialLink}
                      className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border border-dashed border-border hover:border-primary hover:text-primary transition-colors text-muted-foreground">
                      <Icon name="Plus" size={14} color="currentColor" /> Agregar red social
                    </button>
                  </div>
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Logo del negocio</label>
                  <p className="text-xs text-muted-foreground mb-2">JPG, PNG o WebP · Máx. 2MB · Recomendado: 512×512px</p>
                  <div
                    onClick={() => logoInputRef?.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    {logoPreview ? (
                      <div className="relative inline-block">
                        <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-cover rounded-lg mx-auto" />
                        <button
                          type="button"
                          onClick={(e) => { e?.stopPropagation(); setLogoFile(null); setLogoPreview(null); }}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                        >
                          <Icon name="X" size={12} color="white" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Icon name="Image" size={28} color="var(--color-muted-foreground)" className="mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Haz clic para subir logo</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG o WebP</p>
                      </>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
                  {errors?.logo && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.logo}</p>}
                </div>

                {/* Fotos */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Fotos del negocio (máx. 5)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {photoPreviews?.map((src, idx) => (
                      <div key={idx} className="relative">
                        <img src={src} alt={`Foto ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                        >
                          <Icon name="X" size={10} color="white" />
                        </button>
                      </div>
                    ))}
                    {photoFiles?.length < 5 && (
                      <button
                        type="button"
                        onClick={() => photosInputRef?.current?.click()}
                        className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary transition-colors"
                      >
                        <Icon name="Plus" size={20} color="var(--color-muted-foreground)" />
                        <span className="text-xs text-muted-foreground mt-1">Agregar</span>
                      </button>
                    )}
                  </div>
                  <input ref={photosInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handlePhotosChange} />
                </div>
              </div>
            </div>

            {/* Publication Type */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="Rocket" size={18} color="var(--color-primary)" />
                Tipo de publicación
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    publicationType === 'free' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input type="radio" name="publicationType" value="free" checked={publicationType === 'free'} onChange={() => setPublicationType('free')} className="sr-only" />
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${publicationType === 'free' ? 'border-primary' : 'border-border'}`}>
                      {publicationType === 'free' && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />}
                    </div>
                    <span className="font-heading font-semibold text-foreground">Publicación Gratuita</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Tu negocio quedará en revisión antes de aparecer en el directorio.</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-warning, #d97706)' }}>La publicación gratuita requiere revisión para evitar abusos.</p>
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-lg font-bold text-foreground">Gratis</span>
                  </div>
                </label>

                <label
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    publicationType === 'premium' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input type="radio" name="publicationType" value="premium" checked={publicationType === 'premium'} onChange={() => setPublicationType('premium')} className="sr-only" />
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${publicationType === 'premium' ? 'border-primary' : 'border-border'}`}>
                      {publicationType === 'premium' && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />}
                    </div>
                    <span className="font-heading font-semibold text-foreground">Publicación Inmediata</span>
                    <span className="text-xs px-1.5 py-0.5 rounded text-white font-medium" style={{ background: 'var(--color-accent)' }}>Premium</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Tu negocio aparece publicado de inmediato como Premium por 30 días.</p>
                  <p className="text-xs text-muted-foreground">Aparece primero en el directorio y con insignia Premium.</p>
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-lg font-bold text-foreground">$2.000 CLP</span>
                    <span className="text-xs text-muted-foreground ml-1">pago único</span>
                  </div>
                </label>
              </div>
            </div>

            {submitError && (
              <div className="mb-4 p-3 rounded-md text-sm border" style={{ background: '#fee2e2', color: 'var(--color-error)', borderColor: '#fca5a5' }}>
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-white font-medium text-base transition-all disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-white" />
                  Publicando...
                </span>
              ) : publicationType === 'premium' ? 'Continuar al pago →' : 'Publicar negocio gratis'}
            </button>
          </form>
        </div>
      </div>
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-card rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--color-accent)20' }}>
                <Icon name="CreditCard" size={28} color="var(--color-accent)" />
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground">Publicación Premium</h3>
              <p className="text-sm text-muted-foreground mt-1">Pago único de <strong>$2.000 CLP</strong></p>
            </div>
            <div className="bg-muted rounded-lg p-4 mb-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Incluye:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2"><Icon name="Check" size={14} color="var(--color-success, #22c55e)" /> Publicación inmediata</li>
                <li className="flex items-center gap-2"><Icon name="Check" size={14} color="var(--color-success, #22c55e)" /> Insignia Premium por 30 días</li>
                <li className="flex items-center gap-2"><Icon name="Check" size={14} color="var(--color-success, #22c55e)" /> Aparece primero en el directorio</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg mb-4 text-xs text-center" style={{ background: '#fef3c7', color: '#92400e' }}>
              <Icon name="Info" size={14} color="currentColor" className="inline mr-1" />
              Modo de prueba: el pago es simulado
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleSimulatePayment} disabled={submitting} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
                {submitting ? 'Procesando...' : 'Simular pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}