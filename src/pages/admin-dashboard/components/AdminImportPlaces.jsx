import React, { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

const API_URL = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');

const STATUS_BADGE = {
  new:  { label: 'NUEVO',      bg: '#dcfce7', color: '#166534' },
  dup:  { label: 'DUPLICADO',  bg: '#fef3c7', color: '#92400e' },
};

function Badge({ type }) {
  const s = STATUS_BADGE[type];
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

function ResultRow({ result }) {
  const icon = result.success ? '✅' : '❌';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: result.success ? '#166534' : '#dc2626' }}>
      <span>{icon}</span>
      <span style={{ fontWeight: 500 }}>{result.name}</span>
      {!result.success && <span style={{ color: '#6b7280' }}>— {result.error}</span>}
      {result.success && result.photos?.length > 0 && (
        <span style={{ color: '#6b7280' }}>· {result.photos.length} foto{result.photos.length !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

export default function AdminImportPlaces() {
  const [form, setForm]       = useState({ tipo: '', ciudad: 'Coronel', limite: 20, publish: false });
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError]     = useState('');
  const [places, setPlaces]   = useState(null);   // null | PlaceDetail[]
  const [selected, setSelected] = useState(new Set());
  const [results, setResults] = useState(null);   // null | ImportSummary

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------
  const handleSearch = useCallback(async () => {
    const tipo   = form.tipo.trim();
    const ciudad = form.ciudad.trim();
    if (!tipo || !ciudad) return;

    setSearching(true);
    setError('');
    setPlaces(null);
    setSelected(new Set());
    setResults(null);

    try {
      const res  = await fetch(`${API_URL}/api/places/search`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tipo, ciudad, limite: form.limite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al buscar en Google Places');

      // Check duplicates client-side using existing Supabase data
      const withDups = await Promise.all(
        (data.places || []).map(async (p) => {
          const { data: existing } = await supabase
            .from('businesses')
            .select('id')
            .ilike('name', p.name.trim())
            .limit(1);
          return { ...p, isDuplicate: Array.isArray(existing) && existing.length > 0 };
        }),
      );

      setPlaces(withDups);
      // Pre-select all new (non-duplicate) results
      setSelected(new Set(
        withDups.map((_, i) => i).filter((i) => !withDups[i].isDuplicate),
      ));
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  }, [form]);

  // -------------------------------------------------------------------------
  // Selection helpers
  // -------------------------------------------------------------------------
  const toggleAll = (checked) => {
    setSelected(checked ? new Set(places.map((_, i) => i)) : new Set());
  };

  const toggleOne = (idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------
  const handleImport = useCallback(async () => {
    if (selected.size === 0 || importing) return;
    setImporting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No autenticado — recarga la página e inicia sesión');

      const toImport = [...selected].map((i) => places[i]);

      const res = await fetch(`${API_URL}/api/places/import`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ places: toImport, tipo: form.tipo.trim(), publish: form.publish }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar');
      setResults(data);

      // Remove successfully imported places from the preview list
      const importedNames = new Set(
        data.results.filter((r) => r.success).map((r) => r.name),
      );
      setPlaces((prev) => prev.filter((p) => !importedNames.has(p.name)));
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }, [selected, places, form, importing]);

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------
  const newCount  = places ? places.filter((p) => !p.isDuplicate).length : 0;
  const dupCount  = places ? places.filter((p) =>  p.isDuplicate).length : 0;
  const selCount  = selected.size;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={{ padding: '24px', maxWidth: 1100 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: '#111827' }}>
        Importación masiva desde Google Places
      </h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
        Busca negocios reales y agrégalos a la base de datos con un clic.
        Las fotos se descargan y suben automáticamente a R2.
      </p>

      {/* ── Search form ─────────────────────────────────────────── */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: 8, padding: '20px', marginBottom: 24,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 90px auto',
          gap: 12, alignItems: 'end',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>
              Tipo de negocio
            </label>
            <input
              type="text"
              placeholder="restaurante, farmacia, pizzería…"
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                width: '100%', padding: '8px 12px',
                border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>
              Ciudad
            </label>
            <input
              type="text"
              value={form.ciudad}
              onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                width: '100%', padding: '8px 12px',
                border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>
              Máximo
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={form.limite}
              onChange={(e) => setForm((f) => ({ ...f, limite: Math.min(60, parseInt(e.target.value, 10) || 20) }))}
              style={{
                width: '100%', padding: '8px 12px',
                border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !form.tipo.trim()}
            style={{
              padding: '9px 20px', background: searching || !form.tipo.trim() ? '#93c5fd' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600,
              cursor: searching || !form.tipo.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {searching ? 'Buscando…' : '🔍 Buscar'}
          </button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6,
          padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* ── Loading hint ─────────────────────────────────────────── */}
      {searching && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontSize: 14 }}>
          Consultando Google Places y obteniendo detalles… esto puede tardar hasta 30 segundos.
        </div>
      )}

      {/* ── Results table ────────────────────────────────────────── */}
      {places && !searching && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: '#374151' }}>
              <strong>{places.length}</strong> resultados —{' '}
              <span style={{ color: '#16a34a' }}>{newCount} nuevos</span>
              {dupCount > 0 && <> · <span style={{ color: '#d97706' }}>{dupCount} duplicados</span></>}
            </span>
            {selCount > 0 && (
              <span style={{ fontSize: 13, color: '#6b7280' }}>{selCount} seleccionados</span>
            )}
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selCount === places.length && places.length > 0}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Nombre</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Dirección</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Teléfono</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Web</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Fotos</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {places.map((p, i) => (
                  <tr
                    key={p.place_id || i}
                    onClick={() => toggleOne(i)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: p.isDuplicate
                        ? '#fffbeb'
                        : selected.has(i) ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={() => toggleOne(i)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: '#111827' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b7280', maxWidth: 220 }}>
                      {p.formatted_address || '-'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#374151', whiteSpace: 'nowrap' }}>
                      {p.formatted_phone_number || p.international_phone_number || '-'}
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.website ? (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.website.replace(/^https?:\/\//, '').slice(0, 35)}
                        </a>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#374151' }}>
                      {p.photos?.length || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <Badge type={p.isDuplicate ? 'dup' : 'new'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Import controls ──────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              onClick={handleImport}
              disabled={importing || selCount === 0}
              style={{
                padding: '10px 24px',
                background: selCount > 0 && !importing ? '#16a34a' : '#9ca3af',
                color: '#fff', border: 'none', borderRadius: 6,
                fontSize: 14, fontWeight: 600,
                cursor: selCount > 0 && !importing ? 'pointer' : 'not-allowed',
              }}
            >
              {importing
                ? 'Importando… (puede tardar por las fotos)'
                : `📥 Importar ${selCount} negocio${selCount !== 1 ? 's' : ''}`}
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: '#374151' }}>
              <input
                type="checkbox"
                checked={form.publish}
                onChange={(e) => setForm((f) => ({ ...f, publish: e.target.checked }))}
              />
              Publicar inmediatamente (sin revisión admin)
            </label>
          </div>

          {!form.publish && (
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
              Sin esta opción los negocios quedan en estado <strong>pendiente</strong> y debes aprobarlos en la sección Negocios.
            </p>
          )}
        </>
      )}

      {/* ── Import results ─────────────────────────────────────── */}
      {results && (
        <div style={{
          marginTop: 20, borderRadius: 8, padding: 16,
          background: results.failed === 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${results.failed === 0 ? '#86efac' : '#fca5a5'}`,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14, color: results.failed === 0 ? '#166534' : '#dc2626' }}>
            {results.succeeded} importados · {results.failed} errores
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {results.results?.map((r, i) => <ResultRow key={i} result={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}
