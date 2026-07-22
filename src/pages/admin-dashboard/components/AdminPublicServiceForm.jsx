import React, { useState } from 'react';
import Icon from 'components/AppIcon';
import { publicServicesService, PUBLIC_SERVICE_CATEGORIES } from '../../../services/publicServicesService';

function slugify(str) {
  return str
    ?.toLowerCase()
    ?.normalize('NFD')
    ?.replace(/[\u0300-\u036f]/g, '')
    ?.replace(/[^a-z0-9]+/g, '-')
    ?.replace(/^-+|-+$/g, '');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(value);
}

// Si falta el protocolo, lo agrega antes de validar — así "coronel.cl" no se
// rechaza solo por no escribir "https://" (mismo criterio que ya usa la ficha
// pública para mostrar el sitio web).
function normalizeUrl(value) {
  const trimmed = value?.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i?.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isValidUrl(value) {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function toFormState(service) {
  return {
    name: service?.name || '',
    slug: service?.slug || '',
    category_key: service?.category_key || '',
    institution_type: service?.institution_type || '',
    description: service?.description || '',
    address: service?.address || '',
    phone: service?.phone || '',
    email: service?.email || '',
    schedule_note: service?.schedule_note || '',
    website: service?.website || '',
    whatsapp: service?.whatsapp || '',
    latitude: service?.latitude != null ? String(service?.latitude) : '',
    longitude: service?.longitude != null ? String(service?.longitude) : '',
    is_active: service ? service?.status === 'published' : true,
    verified_at: service?.verified_at || '',
    source_url: service?.source_url || '',
  };
}

export default function AdminPublicServiceForm({ service, onClose, onSaved }) {
  const isEdit = Boolean(service?.id);
  const [form, setForm] = useState(() => toFormState(service));
  const [slugManual, setSlugManual] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (e) => {
    const name = e?.target?.value;
    setForm(f => ({ ...f, name, slug: slugManual ? f?.slug : slugify(name) }));
  };

  const handleSlugChange = (e) => {
    setSlugManual(true);
    setForm(f => ({ ...f, slug: e?.target?.value }));
  };

  const setField = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e?.target?.checked : e?.target?.value;
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (saving) return; // evita doble envío

    if (!form?.name?.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!form?.category_key) {
      setError('Elige una categoría.');
      return;
    }
    if (!form?.institution_type?.trim()) {
      setError('El tipo de institución es obligatorio.');
      return;
    }
    if (form?.email?.trim() && !isValidEmail(form?.email?.trim())) {
      setError('El correo no tiene un formato válido.');
      return;
    }
    const website = normalizeUrl(form?.website);
    if (website && !isValidUrl(website)) {
      setError('El sitio web no es una URL válida.');
      return;
    }
    const sourceUrl = normalizeUrl(form?.source_url);
    if (sourceUrl && !isValidUrl(sourceUrl)) {
      setError('La fuente/URL de verificación no es una URL válida.');
      return;
    }

    setSaving(true);
    setError('');

    // Un campo opcional vacío se guarda como null, nunca como '' — el
    // servicio ya aplica esta misma regla (defensa en profundidad), pero se
    // repite acá para que el payload que sale del formulario sea honesto por
    // sí solo, sin depender de que el llamador lo limpie.
    const orNull = (value) => (typeof value === 'string' && value?.trim() === '' ? null : value);

    const payload = {
      name: form?.name?.trim(),
      slug: form?.slug?.trim() || null,
      category_key: form?.category_key,
      institution_type: form?.institution_type?.trim(),
      description: orNull(form?.description),
      address: orNull(form?.address),
      phone: orNull(form?.phone),
      email: orNull(form?.email),
      schedule_note: orNull(form?.schedule_note),
      website: website || null,
      whatsapp: orNull(form?.whatsapp),
      latitude: form?.latitude?.trim() ? parseFloat(form?.latitude) : null,
      longitude: form?.longitude?.trim() ? parseFloat(form?.longitude) : null,
      status: form?.is_active ? 'published' : 'draft',
      verified_at: form?.verified_at || null,
      source_url: sourceUrl || null,
    };

    const { data, error: saveError } = isEdit
      ? await publicServicesService?.adminUpdate(service?.id, payload)
      : await publicServicesService?.adminCreate(payload);

    setSaving(false);

    if (saveError) {
      setError(saveError?.message || 'No se pudo guardar el servicio.');
      return;
    }
    onSaved?.(data);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-heading font-semibold text-foreground">
            {isEdit ? 'Editar servicio' : 'Nuevo servicio'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted" aria-label="Cerrar">
            <Icon name="X" size={18} color="currentColor" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nombre <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              required
              value={form?.name}
              onChange={handleNameChange}
              placeholder="Ej: Municipalidad de Coronel"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Slug</label>
            <input
              value={form?.slug}
              onChange={handleSlugChange}
              placeholder="ej: municipalidad-de-coronel (auto-generado)"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">Se genera automáticamente desde el nombre. Puedes editarlo.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Categoría <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                required
                value={form?.category_key}
                onChange={setField('category_key')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Elige —</option>
                {PUBLIC_SERVICE_CATEGORIES?.map(c => (
                  <option key={c?.key} value={c?.key}>{c?.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tipo de institución <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                required
                value={form?.institution_type}
                onChange={setField('institution_type')}
                placeholder="Ej: Hospital público"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descripción breve</label>
            <textarea
              value={form?.description}
              onChange={setField('description')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Dirección</label>
            <input
              value={form?.address}
              onChange={setField('address')}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
              <input
                value={form?.phone}
                onChange={setField('phone')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">WhatsApp oficial (opcional)</label>
              <input
                value={form?.whatsapp}
                onChange={setField('whatsapp')}
                placeholder="Solo si es un canal oficial confirmado"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Correo</label>
            <input
              type="email"
              value={form?.email}
              onChange={setField('email')}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Horario</label>
            <input
              value={form?.schedule_note}
              onChange={setField('schedule_note')}
              placeholder="Ej: Lunes a viernes 8:30–14:00"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Sitio web oficial</label>
            <input
              value={form?.website}
              onChange={setField('website')}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Latitud (opcional)</label>
              <input
                type="number"
                step="any"
                value={form?.latitude}
                onChange={setField('latitude')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Longitud (opcional)</label>
              <input
                type="number"
                step="any"
                value={form?.longitude}
                onChange={setField('longitude')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Fecha de última verificación</label>
            <input
              type="date"
              value={form?.verified_at || ''}
              onChange={setField('verified_at')}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Fuente oficial / URL de verificación</label>
            <input
              value={form?.source_url}
              onChange={setField('source_url')}
              placeholder="https://... (de dónde se confirmó el dato)"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={form?.is_active}
              onChange={setField('is_active')}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer">
              Servicio activo (visible en /servicios)
            </label>
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm text-white rounded-md transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
