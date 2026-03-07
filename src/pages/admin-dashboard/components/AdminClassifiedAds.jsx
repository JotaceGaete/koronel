import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import { adminAdService } from '../../../services/adminService';

const STATUS_LABELS = { active: 'Activo', expired: 'Expirado', draft: 'Borrador', deleted: 'Eliminado', pending: 'Pendiente' };
const STATUS_COLORS = { active: '#22c55e', expired: '#f59e0b', draft: '#94a3b8', deleted: '#ef4444', pending: '#f97316' };

export default function AdminClassifiedAds() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAdService?.getAll({ search, status: filterStatus });
      setAds(data);
      // Count pending separately for badge
      if (!filterStatus) {
        setPendingCount(data?.filter(a => a?.ad_status === 'pending')?.length || 0);
      }
    } catch (e) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (ad) => {
    setActionLoading(ad?.id + '_approve');
    try {
      await adminAdService?.update(ad?.id, { ad_status: 'active', verified_at: new Date()?.toISOString(), verification_token: null });
      load();
    } catch (e) {
      setError(e?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (ad) => {
    if (!window.confirm('¿Rechazar este aviso?')) return;
    setActionLoading(ad?.id + '_reject');
    try {
      await adminAdService?.update(ad?.id, { ad_status: 'deleted' });
      load();
    } catch (e) {
      setError(e?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeatured = async (ad) => {
    try {
      await adminAdService?.update(ad?.id, { featured: !ad?.featured });
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  const handleExpire = async (ad) => {
    try {
      await adminAdService?.update(ad?.id, { ad_status: 'expired' });
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este aviso?')) return;
    try {
      await adminAdService?.remove(id);
      load();
    } catch (e) {
      setError(e?.message);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Avisos Clasificados"
        subtitle={pendingCount > 0 ? `${pendingCount} aviso${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} de aprobación` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Icon name="Search" size={16} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e?.target?.value)} placeholder="Buscar aviso..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e?.target?.value)} className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none">
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS)?.map(([v, l]) => (
                <option key={v} value={v}>{l}{v === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}</option>
              ))}
            </select>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold text-white" style={{ background: '#f97316' }}>
                {pendingCount}
              </span>
            )}
          </div>
        }
      />

      {error && <div className="mt-4 mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: 'var(--color-error)' }}>{error}</div>}

      {/* Pending alert banner */}
      {pendingCount > 0 && !filterStatus && (
        <div className="mt-4 mb-4 flex items-center gap-2 p-3 rounded-md text-sm font-caption border"
          style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.3)', color: '#c2410c' }}>
          <Icon name="Clock" size={15} color="currentColor" />
          <span><strong>{pendingCount} aviso{pendingCount > 1 ? 's' : ''}</strong> pendiente{pendingCount > 1 ? 's' : ''} de aprobación.</span>
          <button onClick={() => setFilterStatus('pending')} className="ml-auto underline font-semibold text-xs">Ver pendientes</button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-[65px] z-40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Título</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Categoría</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Publicador</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">IP</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Dest.</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 })?.map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : ads?.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No se encontraron avisos</td></tr>
            ) : ads?.map(ad => (
              <tr key={ad?.id} className={`hover:bg-muted/50 transition-colors ${ad?.ad_status === 'pending' ? 'bg-orange-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{ad?.title}</div>
                  <div className="text-xs text-muted-foreground">{ad?.price ? `$${Number(ad?.price)?.toLocaleString('es-CL')}` : 'Sin precio'}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{ad?.category}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="text-foreground text-xs">{ad?.owner?.full_name || ad?.guest_email || '—'}</div>
                  {ad?.guest_email && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Icon name="Mail" size={11} color="currentColor" />
                      {ad?.guest_email}
                    </div>
                  )}
                  {ad?.owner?.email && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Icon name="Mail" size={11} color="currentColor" />
                      {ad?.owner?.email}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  {ad?.ip_address ? (
                    <span className="text-xs font-data text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {ad?.ip_address}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: STATUS_COLORS?.[ad?.ad_status] || '#94a3b8' }}>
                    {STATUS_LABELS?.[ad?.ad_status] || ad?.ad_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleToggleFeatured(ad)} className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${ad?.featured ? 'text-white' : 'bg-muted text-muted-foreground'}`} style={ad?.featured ? { background: 'var(--color-accent)' } : {}}>
                    <Icon name="Star" size={14} color="currentColor" />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {ad?.ad_status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(ad)}
                          disabled={actionLoading === ad?.id + '_approve'}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white transition-colors disabled:opacity-50"
                          style={{ background: 'var(--color-success)' }}
                          title="Aprobar aviso"
                        >
                          <Icon name="Check" size={13} color="currentColor" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleReject(ad)}
                          disabled={actionLoading === ad?.id + '_reject'}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white transition-colors disabled:opacity-50"
                          style={{ background: 'var(--color-error)' }}
                          title="Rechazar aviso"
                        >
                          <Icon name="X" size={13} color="currentColor" />
                          Rechazar
                        </button>
                      </>
                    )}
                    {ad?.ad_status === 'active' && (
                      <button onClick={() => handleExpire(ad)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Expirar">
                        <Icon name="Clock" size={15} color="currentColor" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(ad?.id)} className="p-1.5 rounded hover:bg-muted transition-colors" style={{ color: 'var(--color-error)' }}>
                      <Icon name="Trash2" size={15} color="currentColor" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
