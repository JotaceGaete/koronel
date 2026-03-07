import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';
import { adService } from '../../../services/adService';

const statusConfig = {
  active: { label: 'Activo', color: 'var(--color-success)', bg: '#38A16918' },
  expired: { label: 'Expirado', color: 'var(--color-error)', bg: '#E53E3E18' },
  draft: { label: 'Borrador', color: 'var(--color-secondary)', bg: '#71809618' },
  deleted: { label: 'Eliminado', color: 'var(--color-error)', bg: '#E53E3E18' },
};

export default function MyAdsTab({ userId }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    adService?.getByUser(userId)?.then(({ data, error }) => {
      if (!mounted) return;
      if (!error) setAds((data || [])?.map(ad => adService?.formatAd(ad)));
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [userId]);

  const filtered = ads?.filter((ad) => {
    const matchSearch = ad?.title?.toLowerCase()?.includes(search?.toLowerCase());
    const matchStatus = filterStatus === 'all' || ad?.ad_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id) => {
    const { error } = await adService?.deleteAd(id, userId);
    if (!error) {
      setAds((prev) => prev?.filter((a) => a?.id !== id));
    }
    setDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        <p className="text-sm font-caption text-muted-foreground">Cargando avisos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            <Icon name="Search" size={16} color="var(--color-secondary)" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              placeholder="Buscar avisos..."
              value={search}
              onChange={(e) => setSearch(e?.target?.value)}
              className="pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-56" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e?.target?.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="expired">Expirados</option>
          </select>
        </div>
        <Link to="/post-classified-ad">
          <Button variant="default" size="sm" iconName="Plus" iconPosition="left" iconSize={14}>
            Nuevo Aviso
          </Button>
        </Link>
      </div>

      {filtered?.length === 0 ? (
        <div className="py-12 text-center">
          <Icon name="Tag" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
          <p className="font-caption font-medium text-foreground mb-1">No tienes avisos publicados</p>
          <p className="text-sm font-caption text-muted-foreground mb-4">Publica tu primer aviso clasificado gratis.</p>
          <Link to="/post-classified-ad">
            <Button variant="default" size="sm" iconName="Plus" iconPosition="left" iconSize={14}>Publicar Aviso</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-caption font-medium text-muted-foreground">Aviso</th>
                  <th className="text-left px-4 py-3 font-caption font-medium text-muted-foreground">Categoría</th>
                  <th className="text-left px-4 py-3 font-caption font-medium text-muted-foreground">Precio</th>
                  <th className="text-left px-4 py-3 font-caption font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-caption font-medium text-muted-foreground">Vistas</th>
                  <th className="text-right px-4 py-3 font-caption font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered?.map((ad) => {
                  const sc = statusConfig?.[ad?.ad_status] || statusConfig?.active;
                  return (
                    <tr key={ad?.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-muted">
                            {ad?.image ? (
                              <Image src={ad?.image} alt={ad?.imageAlt || ad?.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon name="Image" size={16} color="var(--color-muted-foreground)" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-caption font-medium text-foreground truncate max-w-[200px]">{ad?.title}</p>
                            {ad?.featured && (
                              <span className="text-xs font-caption px-1.5 py-0.5 rounded-sm" style={{ background: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}>Destacado</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-caption text-muted-foreground">{ad?.category}</td>
                      <td className="px-4 py-3 font-data text-foreground whitespace-nowrap">
                        {ad?.price ? `$${Number(ad?.price)?.toLocaleString('es-CL')}` : 'A convenir'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-sm text-xs font-caption font-medium" style={{ background: sc?.bg, color: sc?.color }}>
                          {sc?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-data text-muted-foreground">{ad?.views || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            title="Eliminar"
                            style={{ color: 'var(--color-error)' }}
                            onClick={() => setDeleteConfirm(ad?.id)}>
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

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filtered?.map((ad) => {
              const sc = statusConfig?.[ad?.ad_status] || statusConfig?.active;
              return (
                <div key={ad?.id} className="bg-card border border-border rounded-md p-4 flex gap-3">
                  <div className="w-16 h-16 rounded-md overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                    {ad?.image ? (
                      <Image src={ad?.image} alt={ad?.imageAlt || ad?.title} className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="Image" size={20} color="var(--color-muted-foreground)" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-caption font-medium text-foreground text-sm line-clamp-2">{ad?.title}</p>
                      <span className="px-2 py-0.5 rounded-sm text-xs font-caption font-medium shrink-0" style={{ background: sc?.bg, color: sc?.color }}>
                        {sc?.label}
                      </span>
                    </div>
                    <p className="text-xs font-caption text-muted-foreground mt-1">{ad?.category}</p>
                    <p className="text-sm font-data font-medium text-foreground mt-1">
                      {ad?.price ? `$${Number(ad?.price)?.toLocaleString('es-CL')}` : 'A convenir'}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        className="text-xs font-caption flex items-center gap-1"
                        style={{ color: 'var(--color-error)' }}
                        onClick={() => setDeleteConfirm(ad?.id)}>
                        <Icon name="Trash2" size={12} color="currentColor" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[300] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-md p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-heading font-semibold text-foreground mb-2">¿Eliminar aviso?</h3>
            <p className="text-sm font-caption text-muted-foreground mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <Button variant="destructive" size="sm" onClick={() => handleDelete(deleteConfirm)}>Eliminar</Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}