import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import AdminPageHeader from 'components/admin/AdminPageHeader';
import AdminBusinessForm from './AdminBusinessForm';
import { adminBusinessService } from '../../../services/adminService';
import { businessService } from '../../../services/businessService';

export default function AdminIncompleteBusinesses({ onOpenEdit }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminBusinessService?.getIncompleteBusinesses?.() ?? [];
      setList(data);
    } catch (e) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openComplete = async (b) => {
    setEditLoading(true);
    try {
      const { data } = await businessService?.getById(b?.id);
      setEditItem(data || b);
    } catch {
      setEditItem(b);
    } finally {
      setEditLoading(false);
    }
  };

  const handleFormSave = () => {
    setEditItem(null);
    load();
  };

  const handleFormCancel = () => {
    setEditItem(null);
  };

  if (editItem) {
    return (
      <AdminBusinessForm
        editItem={editItem}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Negocios incompletos"
        subtitle="Fichas creadas con ingreso rápido. Completa la ficha para publicar con todos los datos."
        actions={
          <Link
            to="/admin/ingreso-rapido"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors min-h-[44px] items-center"
            style={{ background: 'var(--color-primary)' }}
          >
            <Icon name="Plus" size={16} color="white" />
            Nuevo ingreso rápido
          </Link>
        }
      />
      {error && (
        <div className="mt-4 p-3 rounded-md text-sm bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}
      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : list?.length === 0 ? (
        <div className="mt-8 py-12 text-center text-muted-foreground">
          <Icon name="FileText" size={48} color="currentColor" className="mx-auto mb-4 opacity-40" />
          <p className="font-medium text-foreground">No hay negocios incompletos</p>
          <p className="text-sm mt-1">Los creados con &quot;Ingreso rápido&quot; aparecerán aquí hasta que completes la ficha.</p>
          <Link
            to="/admin/ingreso-rapido"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md text-sm font-medium text-white min-h-[44px] items-center"
            style={{ background: 'var(--color-primary)' }}
          >
            <Icon name="Camera" size={16} color="white" />
            Crear uno ahora
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {list?.map((b) => (
            <div
              key={b?.id}
              className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{b?.name}</p>
                <p className="text-sm text-muted-foreground">{b?.category} · {b?.address || 'Sin dirección'}</p>
                <span
                  className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: b?.status === 'published' ? '#dcfce7' : '#fef3c7',
                    color: b?.status === 'published' ? '#166534' : '#92400e',
                  }}
                >
                  {b?.status === 'published' ? 'Publicado' : 'Borrador'}
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={`/business-profile-page?id=${b?.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-muted"
                >
                  <Icon name="ExternalLink" size={14} color="currentColor" />
                  Ver ficha
                </a>
                <button
                  type="button"
                  onClick={() => openComplete(b)}
                  disabled={editLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <Icon name="Pencil" size={14} color="white" />
                  Completar ficha
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
