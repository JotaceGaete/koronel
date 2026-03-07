import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import { adminFeaturedService, adminBusinessService, adminAdService } from '../../../services/adminService';

export default function AdminFeaturedListings() {
  const [listings, setListings] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ listing_type: 'business', listing_id: '', sort_order: 0, active: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [feat, biz, adsData] = await Promise.all([
        adminFeaturedService?.getAll(),
        adminBusinessService?.getAll(),
        adminAdService?.getAll(),
      ]);
      setListings(feat);
      setBusinesses(biz);
      setAds(adsData);
    } catch (e) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getListingName = (item) => {
    if (item?.listing_type === 'business') {
      return businesses?.find(b => b?.id === item?.listing_id)?.name || item?.listing_id;
    }
    return ads?.find(a => a?.id === item?.listing_id)?.title || item?.listing_id;
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await adminFeaturedService?.create({ ...form, sort_order: Number(form?.sort_order) });
      setShowForm(false);
      setForm({ listing_type: 'business', listing_id: '', sort_order: 0, active: true });
      load();
    } catch (e) {
      setError(e?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await adminFeaturedService?.update(item?.id, { active: !item?.active });
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  const handleUpdateOrder = async (item, newOrder) => {
    try {
      await adminFeaturedService?.update(item?.id, { sort_order: Number(newOrder) });
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Quitar de destacados?')) return;
    try {
      await adminFeaturedService?.remove(id);
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  const selectOptions = form?.listing_type === 'business' ? businesses : ads;

  return (
    <div>
      <AdminPageHeader
        title="Destacados"
        actions={
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors" style={{ background: 'var(--color-primary)' }}>
            <Icon name="Plus" size={16} color="white" /> Agregar Destacado
          </button>
        }
      />
      {error && <div className="mt-4 mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>{error}</div>}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-[65px] z-40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Orden</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Activo</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 4 })?.map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : listings?.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay listados destacados</td></tr>
            ) : listings?.map(item => (
              <tr key={item?.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{getListingName(item)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item?.listing_type === 'business' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {item?.listing_type === 'business' ? 'Negocio' : 'Aviso'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    defaultValue={item?.sort_order}
                    onBlur={e => handleUpdateOrder(item, e?.target?.value)}
                    className="w-16 text-center px-2 py-1 text-sm border border-border rounded bg-background text-foreground focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleToggleActive(item)} className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${item?.active ? 'text-white' : 'bg-muted text-muted-foreground'}`} style={item?.active ? { background: '#22c55e' } : {}}>
                    <Icon name={item?.active ? 'Check' : 'X'} size={14} color="currentColor" />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(item?.id)} className="p-1.5 rounded hover:bg-muted transition-colors" style={{ color: 'var(--color-error)' }}>
                    <Icon name="Trash2" size={15} color="currentColor" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-heading font-semibold text-foreground">Agregar Destacado</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-muted"><Icon name="X" size={18} color="currentColor" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tipo</label>
                <select value={form?.listing_type} onChange={e => setForm(f => ({ ...f, listing_type: e?.target?.value, listing_id: '' }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none">
                  <option value="business">Negocio</option>
                  <option value="ad">Aviso Clasificado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Seleccionar *</label>
                <select required value={form?.listing_id} onChange={e => setForm(f => ({ ...f, listing_id: e?.target?.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none">
                  <option value="">-- Seleccionar --</option>
                  {selectOptions?.map(item => <option key={item?.id} value={item?.id}>{item?.name || item?.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Orden de visualización</label>
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
