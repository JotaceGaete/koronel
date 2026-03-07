import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import { jobService } from '../../../services/jobService';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#d97706', bg: '#fef3c7' },
  published: { label: 'Publicado', color: '#059669', bg: '#d1fae5' },
  expired: { label: 'Expirado', color: '#6b7280', bg: '#f3f4f6' },
};

function BusinessLinkControl({ job, onLinked, onUnlinked }) {
  const [mode, setMode] = useState('idle'); // idle | searching
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = React.useRef(null);

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(debounceRef?.current);
    if (!val?.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await jobService?.searchBusinessesForLink(val);
      setResults(data || []);
      setSearching(false);
    }, 350);
  };

  const handleLink = async (biz) => {
    setLoading(true);
    const { data } = await jobService?.adminLinkBusiness(job?.id, biz?.id);
    if (data) onLinked(job?.id, data?.businesses || biz);
    setMode('idle');
    setQuery('');
    setResults([]);
    setLoading(false);
  };

  const handleUnlink = async () => {
    setLoading(true);
    await jobService?.adminUnlinkBusiness(job?.id);
    onUnlinked(job?.id);
    setLoading(false);
  };

  if (job?.businesses) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-caption" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
          <Icon name="Building2" size={11} color="currentColor" />
          {job?.businesses?.name}
        </span>
        <button
          onClick={handleUnlink}
          disabled={loading}
          className="p-1 rounded-md hover:bg-red-50 transition-colors"
          title="Desvincular negocio"
        >
          <Icon name="Unlink" size={12} color="#dc2626" />
        </button>
      </div>
    );
  }

  if (mode === 'idle') {
    return (
      <button
        onClick={() => setMode('searching')}
        className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Icon name="Link" size={11} color="currentColor" />
        Vincular negocio
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleSearch(e?.target?.value)}
          placeholder="Buscar negocio..."
          autoFocus
          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searching && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>
      {results?.length > 0 && (
        <div className="bg-card border border-border rounded-lg shadow-md overflow-hidden max-h-40 overflow-y-auto">
          {results?.map(biz => (
            <button
              key={biz?.id}
              onClick={() => handleLink(biz)}
              disabled={loading}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b border-border last:border-0"
            >
              <span className="font-medium text-foreground">{biz?.name}</span>
              {biz?.address && <span className="text-muted-foreground ml-1">· {biz?.address}</span>}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => { setMode('idle'); setQuery(''); setResults([]); }}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
      >
        Cancelar
      </button>
    </div>
  );
}

export default function AdminEmpleos() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedJob, setExpandedJob] = useState(null);
  const [applications, setApplications] = useState({});
  const [appsLoading, setAppsLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await jobService?.adminGetAll({
        search,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
      });
      if (err) throw err;
      setJobs(data || []);
    } catch (e) {
      setError(e?.message || 'Error al cargar empleos');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterCategory]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id, status) => {
    setActionLoading(id + status);
    const { error: err } = await jobService?.adminUpdateStatus(id, status);
    if (!err) {
      setJobs(prev => prev?.map(j => j?.id === id ? { ...j, status } : j));
    }
    setActionLoading(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta oferta de empleo?')) return;
    setActionLoading(id + 'delete');
    const { error: err } = await jobService?.adminDelete(id);
    if (!err) setJobs(prev => prev?.filter(j => j?.id !== id));
    setActionLoading(null);
  };

  const handleLinked = (jobId, business) => {
    setJobs(prev => prev?.map(j => j?.id === jobId ? { ...j, businesses: business } : j));
  };

  const handleUnlinked = (jobId) => {
    setJobs(prev => prev?.map(j => j?.id === jobId ? { ...j, businesses: null, business_id: null } : j));
  };

  const toggleApplications = async (jobId) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
      return;
    }
    setExpandedJob(jobId);
    if (!applications?.[jobId]) {
      setAppsLoading(jobId);
      const { data } = await jobService?.getApplicationsByJob(jobId);
      setApplications(prev => ({ ...prev, [jobId]: data || [] }));
      setAppsLoading(null);
    }
  };

  const handleAppStatus = async (appId, status, jobId) => {
    const { data } = await jobService?.updateApplicationStatus(appId, status);
    if (data) {
      setApplications(prev => ({
        ...prev,
        [jobId]: prev?.[jobId]?.map(a => a?.id === appId ? { ...a, status } : a) || [],
      }));
    }
  };

  const pendingCount = jobs?.filter(j => j?.status === 'pending')?.length;

  return (
    <div className="p-4 md:p-6">
      <AdminPageHeader
        title="Empleos"
        subtitle={pendingCount > 0 ? `${pendingCount} empleo${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e?.target?.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="published">Publicados</option>
              <option value="expired">Expirados</option>
            </select>
            <button onClick={load} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="RefreshCw" size={14} color="currentColor" />
              Actualizar
            </button>
          </div>
        }
      />
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4 mb-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e?.target?.value)}
          placeholder="Buscar por título o empresa..."
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e?.target?.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Todas las categorías</option>
          {jobService?.CATEGORIES?.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg mb-4" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
          <p className="text-sm" style={{ color: '#991b1b' }}>{error}</p>
        </div>
      )}
      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 })?.map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs?.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="Briefcase" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
          <p className="text-muted-foreground">No hay empleos con los filtros seleccionados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs?.map(job => {
            const st = STATUS_CONFIG?.[job?.status] || STATUS_CONFIG?.pending;
            const appCount = job?.job_applications?.[0]?.count || 0;
            const isExpanded = expandedJob === job?.id;

            return (
              <div key={job?.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-semibold text-sm text-foreground">{job?.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-caption font-semibold" style={{ background: st?.bg, color: st?.color }}>
                          {st?.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{job?.company} · {job?.category} · {job?.modality}</p>
                      <p className="text-xs text-muted-foreground">{jobService?.formatDate(job?.created_at)}</p>
                      <div className="mt-1.5">
                        <BusinessLinkControl job={job} onLinked={handleLinked} onUnlinked={handleUnlinked} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Applications toggle */}
                      <button
                        onClick={() => toggleApplications(job?.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted text-xs font-caption font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                      >
                        <Icon name="Users" size={13} color="currentColor" />
                        {appCount} postulacion{appCount !== 1 ? 'es' : ''}
                        <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={12} color="currentColor" />
                      </button>

                      {/* Status actions */}
                      {job?.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(job?.id, 'published')}
                          disabled={actionLoading === job?.id + 'published'}
                          className="px-3 py-1.5 rounded-lg text-xs font-caption font-semibold transition-all"
                          style={{ background: '#d1fae5', color: '#065f46' }}
                        >
                          Aprobar
                        </button>
                      )}
                      {job?.status === 'published' && (
                        <button
                          onClick={() => handleStatusChange(job?.id, 'expired')}
                          disabled={actionLoading === job?.id + 'expired'}
                          className="px-3 py-1.5 rounded-lg text-xs font-caption font-semibold transition-all"
                          style={{ background: '#f3f4f6', color: '#374151' }}
                        >
                          Expirar
                        </button>
                      )}
                      {job?.status !== 'published' && (
                        <button
                          onClick={() => handleStatusChange(job?.id, 'published')}
                          disabled={actionLoading === job?.id + 'published'}
                          className="px-3 py-1.5 rounded-lg text-xs font-caption font-semibold transition-all"
                          style={{ background: '#dbeafe', color: '#1d4ed8' }}
                        >
                          Publicar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(job?.id)}
                        disabled={actionLoading === job?.id + 'delete'}
                        className="p-1.5 rounded-lg text-xs transition-all hover:bg-red-50"
                        style={{ color: '#dc2626' }}
                        title="Eliminar"
                      >
                        <Icon name="Trash2" size={14} color="currentColor" />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Applications Panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-4">
                    <h4 className="text-xs font-caption font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Postulaciones</h4>
                    {appsLoading === job?.id ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                        Cargando...
                      </div>
                    ) : !applications?.[job?.id]?.length ? (
                      <p className="text-sm text-muted-foreground">Sin postulaciones aún.</p>
                    ) : (
                      <div className="space-y-2">
                        {applications?.[job?.id]?.map(app => (
                          <div key={app?.id} className="bg-card border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-caption font-medium text-foreground">{app?.nombre_completo}</p>
                              <p className="text-xs text-muted-foreground">{app?.email}</p>
                              <p className="text-xs text-muted-foreground">{jobService?.formatDate(app?.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-caption font-semibold"
                                style={{
                                  background: app?.status === 'pending' ? '#fef3c7' : app?.status === 'reviewed' ? '#d1fae5' : '#fee2e2',
                                  color: app?.status === 'pending' ? '#92400e' : app?.status === 'reviewed' ? '#065f46' : '#991b1b',
                                }}
                              >
                                {app?.status === 'pending' ? 'Pendiente' : app?.status === 'reviewed' ? 'Revisado' : 'Rechazado'}
                              </span>
                              <select
                                value={app?.status}
                                onChange={e => handleAppStatus(app?.id, e?.target?.value, job?.id)}
                                className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground focus:outline-none"
                              >
                                <option value="pending">Pendiente</option>
                                <option value="reviewed">Revisado</option>
                                <option value="rejected">Rechazado</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
