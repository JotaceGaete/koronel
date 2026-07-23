import React, { useState, useEffect, useRef } from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import { walinkaLinkService } from '../../../services/walinkaLinkService';
import { buildWalinkaRegisterUrl } from '../../../utils/walinkaCatalog';

export default function WalinkaConnectModal({ businessId, onClose, onLinked }) {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await walinkaLinkService?.getMyCatalogs();
      if (cancelled) return;
      if (err) {
        setError(err);
      } else {
        setCatalogs(data || []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e?.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    dialogRef?.current?.focus?.();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleConfirm = async () => {
    if (!selectedId || linking) return;
    setLinking(true);
    setLinkError(null);
    const { error: err } = await walinkaLinkService?.requestLink({
      koronelBusinessId: businessId,
      walinkaBusinessId: selectedId,
    });
    setLinking(false);
    if (err) {
      setLinkError(err);
      return;
    }
    onLinked?.();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Vincular catálogo Walinka"
        tabIndex={-1}
        onClick={(e) => e?.stopPropagation()}
        className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-heading font-semibold text-foreground">Vincular catálogo Walinka</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors" aria-label="Cerrar">
            <Icon name="X" size={18} color="currentColor" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
              <p className="text-sm text-muted-foreground">Cargando tus catálogos…</p>
            </div>
          ) : error ? (
            <div className="py-4 text-center">
              <p className="text-sm mb-3" style={{ color: 'var(--color-error)' }}>{error?.message}</p>
              <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
            </div>
          ) : catalogs?.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground mb-4">Todavía no tienes ningún catálogo Walinka.</p>
              <a
                href={buildWalinkaRegisterUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                <Icon name="Plus" size={14} color="white" />
                Crear catálogo gratis
              </a>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {catalogs?.map((catalog) => (
                  <label
                    key={catalog?.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedId === catalog?.id ? 'border-primary' : 'border-border hover:bg-muted'}`}
                  >
                    <input
                      type="radio"
                      name="walinka-catalog"
                      checked={selectedId === catalog?.id}
                      onChange={() => setSelectedId(catalog?.id)}
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{catalog?.name}</p>
                      {!catalog?.isActive && (
                        <p className="text-xs" style={{ color: 'var(--color-error)' }}>Inactivo</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {linkError && (
                <p className="text-sm" style={{ color: 'var(--color-error)' }}>{linkError?.message}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={onClose} disabled={linking}>
                  Cancelar
                </Button>
                <Button variant="default" size="sm" loading={linking} disabled={!selectedId} onClick={handleConfirm}>
                  Vincular
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
