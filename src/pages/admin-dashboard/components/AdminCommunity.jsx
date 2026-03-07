import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import { communityService } from '../../../services/communityService';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#d97706', bg: '#fef3c7' },
  active: { label: 'Activo', color: '#059669', bg: '#d1fae5' },
  rejected: { label: 'Rechazado', color: '#dc2626', bg: '#fee2e2' },
  approved: { label: 'Aprobado', color: '#059669', bg: '#d1fae5' },
  hidden: { label: 'Oculto', color: '#6b7280', bg: '#f3f4f6' },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr)?.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function PostsTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await communityService?.adminGetPosts({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search,
      });
      if (err) throw err;
      setPosts(data || []);
    } catch (e) {
      setError(e?.message || 'Error al cargar posts');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id, status) => {
    setActionLoading(id + status);
    try {
      const { error: err } = await communityService?.adminUpdatePostStatus(id, status);
      if (err) throw err;
      setPosts(prev => prev?.map(p => p?.id === id ? { ...p, status } : p));
    } catch (e) {
      setError(e?.message || 'Error al actualizar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta pregunta permanentemente?')) return;
    setActionLoading(id + 'delete');
    try {
      const { error: err } = await communityService?.adminDeletePost(id);
      if (err) throw err;
      setPosts(prev => prev?.filter(p => p?.id !== id));
    } catch (e) {
      setError(e?.message || 'Error al eliminar');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = posts?.filter(p => p?.status === 'pending')?.length;

  return (
    <div>
      {pendingCount > 0 && (
        <p className="text-sm mb-4" style={{ color: '#d97706' }}>
          {pendingCount} pregunta{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} de moderación
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Icon name="Search" size={16} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e?.target?.value)}
            placeholder="Buscar pregunta..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e?.target?.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="active">Activos</option>
          <option value="rejected">Rechazados</option>
        </select>
      </div>

      {error && <div className="mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pregunta</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Sector</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Autor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Fecha</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 })?.map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : posts?.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No se encontraron preguntas</td></tr>
            ) : posts?.map(post => {
              const statusCfg = STATUS_CONFIG?.[post?.status] || STATUS_CONFIG?.pending;
              return (
                <tr key={post?.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground line-clamp-1">{post?.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{post?.body}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{post?.sector}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{post?.author?.full_name || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{formatDate(post?.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: statusCfg?.bg, color: statusCfg?.color }}>
                      {statusCfg?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {post?.status !== 'active' && (
                        <button
                          onClick={() => handleStatusChange(post?.id, 'active')}
                          disabled={actionLoading === post?.id + 'active'}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          title="Aprobar"
                          style={{ color: '#059669' }}
                        >
                          <Icon name="CheckCircle" size={15} color="currentColor" />
                        </button>
                      )}
                      {post?.status !== 'rejected' && (
                        <button
                          onClick={() => handleStatusChange(post?.id, 'rejected')}
                          disabled={actionLoading === post?.id + 'rejected'}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          title="Rechazar"
                          style={{ color: '#d97706' }}
                        >
                          <Icon name="XCircle" size={15} color="currentColor" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(post?.id)}
                        disabled={actionLoading === post?.id + 'delete'}
                        className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                        title="Eliminar"
                        style={{ color: '#dc2626' }}
                      >
                        <Icon name="Trash2" size={15} color="currentColor" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuggestedBusinessesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [notesModal, setNotesModal] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await communityService?.adminGetSuggestedBusinesses({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search,
      });
      if (err) throw err;
      setItems(data || []);
    } catch (e) {
      setError(e?.message || 'Error al cargar negocios sugeridos');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (item) => {
    setActionLoading(item?.id + 'approve');
    try {
      const { error: err } = await communityService?.adminUpdateSuggestedBusiness(item?.id, { status: 'approved', admin_notes: adminNotes || null });
      if (err) throw err;
      setItems(prev => prev?.map(i => i?.id === item?.id ? { ...i, status: 'approved' } : i));
      setNotesModal(null);
      setAdminNotes('');
    } catch (e) {
      setError(e?.message || 'Error al aprobar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id + 'reject');
    try {
      const { error: err } = await communityService?.adminUpdateSuggestedBusiness(id, { status: 'rejected' });
      if (err) throw err;
      setItems(prev => prev?.map(i => i?.id === id ? { ...i, status: 'rejected' } : i));
    } catch (e) {
      setError(e?.message || 'Error al rechazar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este negocio sugerido?')) return;
    setActionLoading(id + 'delete');
    try {
      const { error: err } = await communityService?.adminDeleteSuggestedBusiness(id);
      if (err) throw err;
      setItems(prev => prev?.filter(i => i?.id !== id));
    } catch (e) {
      setError(e?.message || 'Error al eliminar');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = items?.filter(i => i?.status === 'pending')?.length;

  return (
    <div>
      {pendingCount > 0 && (
        <p className="text-sm mb-4" style={{ color: '#d97706' }}>
          {pendingCount} negocio{pendingCount > 1 ? 's' : ''} sugerido{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''}
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Icon name="Search" size={16} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e?.target?.value)}
            placeholder="Buscar negocio..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e?.target?.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobados</option>
          <option value="rejected">Rechazados</option>
        </select>
      </div>

      {error && <div className="mb-4 p-3 rounded-md text-sm" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Negocio</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Categoría</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Sugerido por</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Fecha</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 })?.map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : items?.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No se encontraron negocios sugeridos</td></tr>
            ) : items?.map(item => {
              const statusCfg = STATUS_CONFIG?.[item?.status] || STATUS_CONFIG?.pending;
              return (
                <tr key={item?.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{item?.business_name}</div>
                    {item?.address && <div className="text-xs text-muted-foreground truncate">{item?.address}</div>}
                    {item?.phone && <div className="text-xs text-muted-foreground">{item?.phone}</div>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{item?.category}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{item?.suggester?.full_name || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{formatDate(item?.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: statusCfg?.bg, color: statusCfg?.color }}>
                      {statusCfg?.label}
                    </span>
                    {item?.admin_notes && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{item?.admin_notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {item?.status === 'pending' && (
                        <button
                          onClick={() => { setNotesModal(item); setAdminNotes(''); }}
                          disabled={actionLoading === item?.id + 'approve'}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          title="Aprobar"
                          style={{ color: '#059669' }}
                        >
                          <Icon name="CheckCircle" size={15} color="currentColor" />
                        </button>
                      )}
                      {item?.status === 'pending' && (
                        <button
                          onClick={() => handleReject(item?.id)}
                          disabled={actionLoading === item?.id + 'reject'}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          title="Rechazar"
                          style={{ color: '#d97706' }}
                        >
                          <Icon name="XCircle" size={15} color="currentColor" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item?.id)}
                        disabled={actionLoading === item?.id + 'delete'}
                        className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                        title="Eliminar"
                        style={{ color: '#dc2626' }}
                      >
                        <Icon name="Trash2" size={15} color="currentColor" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Approve Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-heading font-bold text-foreground mb-2">Aprobar negocio sugerido</h3>
            <p className="text-sm text-muted-foreground mb-4">Negocio: <strong>{notesModal?.business_name}</strong></p>
            <label className="block text-sm font-medium text-foreground mb-1">Notas del administrador (opcional)</label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e?.target?.value)}
              placeholder="Notas internas sobre este negocio..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setNotesModal(null); setAdminNotes(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleApprove(notesModal)}
                disabled={actionLoading === notesModal?.id + 'approve'}
                className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ background: '#059669' }}
              >
                {actionLoading === notesModal?.id + 'approve' ? 'Aprobando...' : 'Aprobar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCommunity() {
  const [activeTab, setActiveTab] = useState('posts');

  return (
    <div>
      <AdminPageHeader
        title="Comunidad"
        subtitle="Moderación de preguntas y negocios sugeridos"
        actions={
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                activeTab === 'posts' ? 'text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              style={activeTab === 'posts' ? { background: 'var(--color-primary)' } : {}}
            >
              <Icon name="MessageCircle" size={15} color="currentColor" />
              Posts
            </button>
            <button
              onClick={() => setActiveTab('suggested')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                activeTab === 'suggested' ? 'text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              style={activeTab === 'suggested' ? { background: 'var(--color-primary)' } : {}}
            >
              <Icon name="Building2" size={15} color="currentColor" />
              Negocios Sugeridos
            </button>
          </div>
        }
      />

      <div className="mt-4">
        {activeTab === 'posts' ? <PostsTab /> : <SuggestedBusinessesTab />}
      </div>
    </div>
  );
}
