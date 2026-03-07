import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import AdminBusinessForm from './AdminBusinessForm';
import { adminBusinessService, adminCategoryService } from '../../../services/adminService';
import { businessService } from '../../../services/businessService';

const STATUS_BADGE = {
  pending: { label: 'Pendiente', bg: '#fef3c7', color: '#92400e' },
  published: { label: 'Publicado', bg: '#dcfce7', color: '#166534' },
  premium: { label: 'Premium', bg: '#ede9fe', color: '#5b21b6' },
  rejected: { label: 'Rechazado', bg: '#fee2e2', color: '#991b1b' },
};

export default function AdminBusinesses() {
  const [activeTab, setActiveTab] = useState('all');
  const [businesses, setBusinesses] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form state — null = hidden, object = edit item, 'new' = create
  const [formItem, setFormItem] = useState(null); // null | editItem | { _new: true }
  const [showForm, setShowForm] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [biz, cats] = await Promise.all([
        adminBusinessService?.getAll({ search, category: filterCategory, status: activeTab === 'pending' ? 'pending' : filterStatus }),
        adminCategoryService?.getAll(),
      ]);
      setBusinesses(biz);
      setCategories(cats);
      if (activeTab !== 'pending') {
        const pending = await adminBusinessService?.getAll({ status: 'pending' });
        setPendingCount(pending?.length || 0);
      } else {
        setPendingCount(biz?.length || 0);
      }
    } catch (e) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterStatus, activeTab]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setFormItem(null);
    setShowForm(true);
  };

  const openEdit = async (b) => {
    setEditLoading(true);
    try {
      const { data, error } = await businessService?.getById(b?.id);
      setFormItem(error || !data ? b : data);
    } catch (e) {
      setFormItem(b);
    } finally {
      setEditLoading(false);
    }
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setFormItem(null);
    load();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setFormItem(null);
  };

  const handleApprove = async (id) => {
    try { await adminBusinessService?.update(id, { status: 'published' }); load(); }
    catch (e) { setError(e?.message); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await adminBusinessService?.update(rejectModal?.id, { status: 'rejected', rejection_reason: rejectReason || null });
      setRejectModal(null); setRejectReason(''); load();
    } catch (e) { setError(e?.message); }
  };

  const handleEditAndApprove = (b) => {
    setFormItem({ ...b, status: 'published' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este negocio?')) return;
    try { await adminBusinessService?.remove(id); load(); }
    catch (e) { setError(e?.message); }
  };

  const handleToggle = async (b, field) => {
    try { await adminBusinessService?.update(b?.id, { [field]: !b?.[field] }); load(); }
    catch (e) { setError(e?.message); }
  };

  // Show full-screen form
  if (showForm) {
    return (
      <AdminBusinessForm
        editItem={formItem}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Negocios"
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors" style={{ background: 'var(--color-primary)' }}>
            <Icon name="Plus" size={16} color="white" /> Nuevo Negocio
          </button>
        }
      />
      {/* Tabs */}
      <div className="flex gap-1 mt-4 mb-4 border-b border-border">
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Todos</button>
        <button onClick={() => setActiveTab('pending')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Pendientes
          {pendingCount > 0 && <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs text-white font-bold" style={{ background: 'var(--color-error)' }}>{pendingCount > 9 ? '9+' : pendingCount}</span>}
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'all' && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Icon name="Search" size={16} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e?.target?.value)} placeholder="Buscar negocio..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e?.target?.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none">
            <option value="">Todas las categorías</option>
            {categories?.map(c => <option key={c?.id} value={c?.name_key}>{c?.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e?.target?.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none">
            <option value="">Todos los estados</option>
            <option value="published">Publicados</option>
            <option value="premium">Premium</option>
            <option value="rejected">Rechazados</option>
          </select>
        </div>
      )}

      {error && <div className="mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>{error}</div>}

      {/* Pending Tab */}
      {activeTab === 'pending' ? (
        loading ? (
          <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} /></div>
        ) : businesses?.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="CheckCircle" size={40} color="var(--color-success, #22c55e)" className="mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No hay negocios pendientes de revisión</p>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses?.map(b => (
              <div key={b?.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  {b?.logo_url && (
                    <img src={b?.logo_url} alt={`Logo ${b?.name}`} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-semibold text-foreground">{b?.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>Pendiente</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{b?.category} · {b?.address}</p>
                    {b?.phone && <p className="text-xs text-muted-foreground mt-0.5">{b?.phone}</p>}
                    {b?.website && <p className="text-xs text-muted-foreground mt-0.5">{b?.website}</p>}
                    {b?.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b?.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Propietario: {b?.owner?.full_name || '—'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => handleApprove(b?.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors" style={{ background: 'var(--color-success, #22c55e)' }}>
                    <Icon name="Check" size={13} color="white" /> Aprobar
                  </button>
                  <button onClick={() => handleEditAndApprove(b)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors text-foreground">
                    <Icon name="Pencil" size={13} color="currentColor" /> Editar y aprobar
                  </button>
                  <button onClick={() => setRejectModal({ id: b?.id, name: b?.name })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: '#fee2e2', color: '#991b1b' }}>
                    <Icon name="X" size={13} color="currentColor" /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Propietario</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Verificado</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Destacado</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 })?.map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : businesses?.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No se encontraron negocios</td></tr>
              ) : businesses?.map(b => {
                const sc = STATUS_BADGE?.[b?.status] || STATUS_BADGE?.published;
                return (
                  <tr key={b?.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {b?.logo_url && <img src={b?.logo_url} alt={`Logo ${b?.name}`} className="w-8 h-8 rounded object-cover border border-border shrink-0" />}
                        <div>
                          <div className="font-medium text-foreground">{b?.name}</div>
                          <div className="text-xs text-muted-foreground">{b?.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{b?.category}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{b?.owner?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: sc?.bg, color: sc?.color }}>{sc?.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(b, 'verified')} className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${b?.verified ? 'text-white' : 'bg-muted text-muted-foreground'}`} style={b?.verified ? { background: 'var(--color-success, #22c55e)' } : {}}>
                        <Icon name={b?.verified ? 'Check' : 'X'} size={14} color="currentColor" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(b, 'featured')} className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${b?.featured ? 'text-white' : 'bg-muted text-muted-foreground'}`} style={b?.featured ? { background: 'var(--color-accent)' } : {}}>
                        <Icon name="Star" size={14} color="currentColor" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(b)} disabled={editLoading} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"><Icon name="Pencil" size={15} color="currentColor" /></button>
                        <button onClick={() => handleDelete(b?.id)} className="p-1.5 rounded hover:bg-muted transition-colors" style={{ color: 'var(--color-error)' }}><Icon name="Trash2" size={15} color="currentColor" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-card rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-heading font-semibold text-foreground mb-2">Rechazar negocio</h3>
            <p className="text-sm text-muted-foreground mb-4">¿Rechazar <strong>{rejectModal?.name}</strong>? Puedes indicar el motivo.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e?.target?.value)} placeholder="Motivo del rechazo (opcional)" rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleReject} className="flex-1 py-2 text-sm text-white rounded-lg transition-colors" style={{ background: 'var(--color-error)' }}>Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}