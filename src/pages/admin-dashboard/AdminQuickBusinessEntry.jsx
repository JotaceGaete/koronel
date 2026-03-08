// Ingreso rápido de negocios — solo administradores, mobile first
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import Input from 'components/ui/Input';
import OSMMap from 'components/maps/OSMMap';
import { useAuth } from '../../contexts/AuthContext';
import { adminBusinessService } from '../../services/adminService';
import { businessService } from '../../services/businessService';
import { geocode } from '../../services/geocodingService';
import { CORONEL_DEFAULT } from '../../services/geocodingService';

const SAFE_TOP = 'env(safe-area-inset-top, 0px)';
const SAFE_BOTTOM = 'env(safe-area-inset-bottom, 0px)';
const MIN_TOUCH = 44;

function isAdminUser(user, userProfile) {
  if (!user) return false;
  const meta = user?.user_metadata || {};
  const appMeta = user?.app_metadata || {};
  const authAdmin = meta?.role === 'admin' || appMeta?.role === 'admin';
  const profileAdmin = userProfile?.role === 'admin';
  return authAdmin || profileAdmin;
}

const INITIAL = {
  name: '',
  category_id: '',
  category_name: '',
  category_key: '',
  phone: '',
  whatsapp: '',
  address: '',
  lat: null,
  lng: null,
  admin_notes: '',
};

export default function AdminQuickBusinessEntry() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const [form, setForm] = useState(INITIAL);
  const [categories, setCategories] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user || !isAdminUser(user, userProfile)) {
      navigate('/login', { replace: true });
      return;
    }
    businessService?.getHierarchicalCategories?.()?.then(({ data, flat }) => {
      setCategories(flat || []);
    });
  }, [user, userProfile, navigate]);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handlePhotoChange = (e) => {
    const file = e?.target?.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const useMyLocation = () => {
    if (!navigator?.geolocation) {
      setError('Tu dispositivo no soporta geolocalización.');
      return;
    }
    setLoadingGeo(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleChange('lat', pos.coords.latitude);
        handleChange('lng', pos.coords.longitude);
        setLoadingGeo(false);
      },
      () => {
        setError('No se pudo obtener la ubicación.');
        setLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const searchAddressOnMap = async () => {
    if (!form?.address?.trim()) {
      setError('Escribe la dirección antes de buscar en el mapa.');
      return;
    }
    setError('');
    const result = await geocode(form.address);
    if (result?.lat != null && result?.lng != null) {
      handleChange('lat', result.lat);
      handleChange('lng', result.lng);
    } else {
      setError('No se encontró la dirección. Ajusta el marcador en el mapa.');
      if (!form.lat) {
        handleChange('lat', CORONEL_DEFAULT?.lat ?? -37.0167);
        handleChange('lng', CORONEL_DEFAULT?.lng ?? -73.15);
      }
    }
  };

  const save = async (asDraft) => {
    if (!form?.name?.trim()) {
      setError('El nombre del negocio es obligatorio.');
      return;
    }
    const status = asDraft ? 'pending' : 'published';
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category_name || 'Sin categoría',
        category_key: form.category_key || null,
        category_id: form.category_id || null,
        phone: form.phone?.trim() || null,
        whatsapp: form.whatsapp?.trim() || null,
        address: form.address?.trim() || null,
        address_text: form.address?.trim() || null,
        lat: form.lat != null ? form.lat : null,
        lng: form.lng != null ? form.lng : null,
        owner_id: null,
        claimed: false,
        source: 'quick_admin',
        created_by: user?.id,
        admin_notes: form.admin_notes?.trim() || null,
        status,
        verified: false,
        featured: false,
      };
      const business = await adminBusinessService?.create(payload);
      if (photoFile && business?.id) {
        const { path, error: uploadErr } = await businessService?.uploadImage(photoFile, business.id);
        if (!uploadErr && path) {
          await businessService?.addImage({
            businessId: business.id,
            storagePath: path,
            altText: form.name,
            isPrimary: true,
          });
        }
      }
      setSuccess(true);
      setForm(INITIAL);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (e) {
      setError(e?.message || 'Error al guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (error && errorRef?.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  useEffect(() => {
    if (success && successRef?.current) {
      successRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [success]);

  if (!user) return null;

  return (
    <div
      className="min-h-screen bg-background overflow-x-hidden"
      style={{
        paddingTop: `calc(56px + ${SAFE_TOP})`,
        paddingBottom: `calc(100px + ${SAFE_BOTTOM})`,
      }}
    >
      {/* Sticky header con safe area */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4"
        style={{ paddingTop: SAFE_TOP }}
      >
        <h1 className="font-heading font-bold text-lg text-foreground truncate pr-2">Nuevo negocio rápido</h1>
        <Link
          to="/admin-dashboard?section=incomplete"
          className="flex items-center gap-1.5 text-sm font-medium shrink-0 min-h-[44px] items-center justify-center"
          style={{ color: 'var(--color-primary)' }}
        >
          <Icon name="FileText" size={16} color="currentColor" />
          Ver borradores
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {success && (
          <div ref={successRef} className="rounded-lg p-4 flex items-center gap-3" style={{ background: 'var(--color-success)', color: 'white' }}>
            <Icon name="CheckCircle" size={24} color="white" />
            <p className="text-sm font-medium">Guardado correctamente.</p>
          </div>
        )}
        {error && (
          <div
            ref={errorRef}
            className="rounded-lg p-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 text-sm"
          >
            <Icon name="AlertCircle" size={20} color="currentColor" />
            {error}
          </div>
        )}

        {/* Foto: en móvil, área abre galería/archivos; botón abre cámara */}
        <section className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="Camera" size={18} color="var(--color-primary)" />
            Foto del negocio
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
            aria-hidden="true"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
            aria-hidden="true"
          />
          {photoPreview ? (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img src={photoPreview} alt="Vista previa" className="w-full h-48 object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40">
                <button
                  type="button"
                  onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); fileInputRef?.current?.click(); }}
                  className="px-4 py-3 rounded-lg bg-white/90 text-sm font-medium min-h-[44px] flex items-center justify-center"
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setPhotoFile(null); setPhotoPreview(null); }}
                  className="px-4 py-3 rounded-lg bg-red-500/90 text-white text-sm font-medium min-h-[44px] flex items-center justify-center"
                >
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef?.current?.click()}
                onKeyDown={(e) => e?.key === 'Enter' && fileInputRef?.current?.click()}
                className="flex flex-col items-center justify-center gap-2 min-h-[120px] rounded-lg border-2 border-dashed border-border bg-muted/50 cursor-pointer touch-manipulation active:bg-muted"
                aria-label="Elegir foto de galería o archivos"
              >
                <Icon name="ImagePlus" size={32} color="var(--color-muted-foreground)" />
                <span className="text-sm text-muted-foreground text-center px-2">Toca para elegir de galería o archivos</span>
              </div>
              <button
                type="button"
                onClick={(ev) => { ev.preventDefault(); cameraInputRef?.current?.click(); }}
                className="mt-2 w-full flex items-center justify-center gap-2 min-h-[44px] py-3 rounded-lg border border-border bg-background text-sm font-medium touch-manipulation"
              >
                <Icon name="Camera" size={18} color="var(--color-primary)" />
                Tomar foto
              </button>
            </>
          )}
        </section>

        {/* Campos mínimos */}
        <section className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Icon name="Building2" size={18} color="var(--color-primary)" />
            Datos básicos
          </h2>
          <Input
            label="Nombre del negocio"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ej. Panadería Central"
            required
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Categoría</label>
            <select
              value={form.category_id}
              onChange={(e) => {
                const c = categories?.find((x) => x?.id === e.target.value);
                handleChange('category_id', c?.id || '');
                handleChange('category_name', c?.name || '');
                handleChange('category_key', c?.name_key || '');
              }}
              className="w-full px-3 py-3 text-sm border border-border rounded-lg bg-background text-foreground min-h-[44px] touch-manipulation"
              style={{ minHeight: MIN_TOUCH }}
            >
              <option value="">Seleccionar categoría</option>
              {categories?.map((c) => (
                <option key={c?.id} value={c?.id}>{c?.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Teléfono"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+56 41 234 5678"
          />
          <Input
            label="WhatsApp"
            type="tel"
            value={form.whatsapp}
            onChange={(e) => handleChange('whatsapp', e.target.value)}
            placeholder="+56 9 8765 4321"
          />
          <Input
            label="Dirección"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Calle y número, Coronel"
          />
        </section>

        {/* Ubicación */}
        <section className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Icon name="MapPin" size={18} color="var(--color-primary)" />
            Ubicación
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              iconName="Navigation"
              iconPosition="left"
              iconSize={14}
              onClick={useMyLocation}
              disabled={loadingGeo}
            >
              {loadingGeo ? 'Obteniendo…' : 'Usar mi ubicación actual'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="Map"
              iconPosition="left"
              iconSize={14}
              onClick={searchAddressOnMap}
            >
              Buscar dirección en mapa
            </Button>
          </div>
          <div className="rounded-lg overflow-hidden border border-border" style={{ height: '220px' }}>
            <OSMMap
              lat={form.lat ?? CORONEL_DEFAULT?.lat}
              lng={form.lng ?? CORONEL_DEFAULT?.lng}
              height="220px"
              zoom={15}
              readonly={false}
              onChange={({ lat, lng }) => { handleChange('lat', lat); handleChange('lng', lng); }}
            />
          </div>
          {(form.lat != null && form.lng != null) && (
            <p className="text-xs text-muted-foreground">
              Coordenadas: {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
            </p>
          )}
        </section>

        {/* Nota privada admin */}
        <section className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-heading font-semibold text-foreground mb-2 flex items-center gap-2">
            <Icon name="Lock" size={16} color="var(--color-muted-foreground)" />
            Nota privada (solo admin)
          </h2>
          <textarea
            value={form.admin_notes}
            onChange={(e) => handleChange('admin_notes', e.target.value)}
            placeholder="Ej. Revisar horarios con el dueño la próxima semana"
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground min-h-[80px]"
            rows={3}
          />
        </section>

        <div className="pt-4 text-center pb-2">
          <Link to="/admin-dashboard" className="inline-flex items-center justify-center min-h-[44px] text-sm text-muted-foreground hover:text-foreground">
            ← Volver al panel
          </Link>
        </div>
      </main>

      {/* Barra fija inferior en móvil: botones siempre visibles y tocables */}
      <div
        className="fixed left-0 right-0 bottom-0 z-40 flex flex-col gap-2 p-4 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: `calc(16px + ${SAFE_BOTTOM})` }}
      >
        <Button
          type="button"
          variant="outline"
          fullWidth
          size="lg"
          iconName="Save"
          iconPosition="left"
          iconSize={18}
          onClick={() => save(true)}
          disabled={submitting}
          loading={submitting}
          className="py-4 text-base font-semibold min-h-[48px] touch-manipulation"
        >
          Guardar borrador
        </Button>
        <Button
          type="button"
          variant="default"
          fullWidth
          size="lg"
          iconName="Send"
          iconPosition="left"
          iconSize={18}
          onClick={() => save(false)}
          disabled={submitting}
          loading={submitting}
          className="py-4 text-base font-semibold min-h-[48px] touch-manipulation"
          style={{ background: 'var(--color-primary)' }}
        >
          Guardar y publicar
        </Button>
      </div>
    </div>
  );
}
