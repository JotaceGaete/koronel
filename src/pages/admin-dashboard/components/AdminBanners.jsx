import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import { adminBannerService } from '../../../services/adminService';

const POSITIONS = [
  { value: 'homepage_top', label: 'Inicio — Superior' },
  { value: 'homepage_bottom', label: 'Inicio — Inferior' },
  { value: 'sidebar', label: 'Barra lateral' },
  { value: 'footer', label: 'Pie de página' },
];

const EMPTY_FORM = { title: '', image_url: '', link_url: '', position: 'homepage_top', active: true, sort_order: 0 };

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBanners(await adminBannerService?.getAll());
    } catch (e) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setImageFile(null); setShowForm(true); };
  const openEdit = (b) => { setEditItem(b); setForm({ title: b?.title || '', image_url: b?.image_url || '', link_url: b?.link_url || '', position: b?.position || 'homepage_top', active: b?.active ?? true, sort_order: b?.sort_order || 0 }); setImageFile(null); setShowForm(true); };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let imageUrl = form?.image_url?.trim() || '';
      if (imageFile) {
        imageUrl = await adminBannerService?.uploadImage(imageFile);
        setImageFile(null);
      }
      const payload = { ...form, image_url: imageUrl || null };
      if (editItem) {
        await adminBannerService?.update(editItem?.id, payload);
      } else {
        await adminBannerService?.create(payload);
      }
      setShowForm(false);
      load();
    } catch (e) {
      setError(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (b) => {
    try {
      await adminBannerService?.update(b?.id, { active: !b?.active });
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este banner?')) return;
    try {
      await adminBannerService?.remove(id);
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  const posLabel = (val) => POSITIONS?.find(p => p?.value === val)?.label || val;

  return (
    <div>
      <AdminPageHeader
        title="Banners"
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors" style={{ background: 'var(--color-primary)' }}>
            <Icon name="Plus" size={16} color="white" /> Nuevo Banner
          </button>
        }
      />
      {error && <div className="mt-4 mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>{error}</div>}
      <div className="mt-4 grid gap-4">
        {loading ? (
          Array.from({ length: 3 })?.map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)
        ) : banners?.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Icon name="Image" size={40} color="currentColor" className="mx-auto mb-3 opacity-40" />
            <p>No hay banners configurados</p>
          </div>
        ) : banners?.map(b => (
          <div key={b?.id} className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row gap-4">
            {b?.image_url && (
              <div className="shrink-0 w-full sm:w-32 h-20 rounded-md overflow-hidden bg-muted">
                <img src={b?.image_url} alt={`Banner ${b?.title}`} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-foreground">{b?.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{posLabel(b?.position)} · Orden: {b?.sort_order}</p>
                  {b?.link_url && <p className="text-xs text-muted-foreground truncate mt-0.5">{b?.link_url}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggleActive(b)} className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${b?.active ? 'text-white' : 'bg-muted text-muted-foreground'}`} style={b?.active ? { background: '#22c55e' } : {}}>
                    {b?.active ? 'Activo' : 'Inactivo'}
                  </button>
                  <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"><Icon name="Pencil" size={15} color="currentColor" /></button>
                  <button onClick={() => handleDelete(b?.id)} className="p-1.5 rounded hover:bg-muted transition-colors" style={{ color: 'var(--color-error)' }}><Icon name="Trash2" size={15} color="currentColor" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-heading font-semibold text-foreground">{editItem ? 'Editar Banner' : 'Nuevo Banner'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-muted"><Icon name="X" size={18} color="currentColor" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Título *</label>
                <input required value={form?.title} onChange={e => setForm(f => ({ ...f, title: e?.target?.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Imagen del banner</label>
                <p className="text-xs text-muted-foreground mb-2">Sube una imagen o pega una URL. Para que se vea en Inicio, elige posición &quot;Inicio — Superior&quot;.</p>
                <input type="file" accept="image/*" onChange={e => { const f = e?.target?.files?.[0]; setImageFile(f || null); if (f) setForm(prev => ({ ...prev, image_url: '' })); }} className="w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:cursor-pointer file:bg-primary file:text-primary-foreground" />
                <input type="url" value={form?.image_url} onChange={e => setForm(f => ({ ...f, image_url: e?.target?.value }))} placeholder="O pega URL de imagen (https://...)" className="mt-2 w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                {(form?.image_url || imageFile) && (
                  <img src={imageFile ? URL.createObjectURL(imageFile) : form?.image_url} alt="Vista previa del banner" className="mt-2 w-full h-20 object-cover rounded-md border border-border" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">URL de destino</label>
                <input value={form?.link_url} onChange={e => setForm(f => ({ ...f, link_url: e?.target?.value }))} placeholder="/business-directory-listing" className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Posición *</label>
                <select required value={form?.position} onChange={e => setForm(f => ({ ...f, position: e?.target?.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none">
                  {POSITIONS?.map(p => <option key={p?.value} value={p?.value}>{p?.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Orden</label>
                <input type="number" value={form?.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e?.target?.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form?.active} onChange={e => setForm(f => ({ ...f, active: e?.target?.checked }))} className="rounded" />
                Activo
              </label>
              {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm text-white rounded-md transition-colors disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
