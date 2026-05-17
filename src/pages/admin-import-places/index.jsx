/**
 * /admin/importar-negocios
 * Página standalone de importación masiva desde Google Places.
 * Misma lógica que el CLI (api/places/_core.js), mismos endpoints de Vercel.
 */
import React, { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import Input from 'components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const API_URL = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');

// ---------------------------------------------------------------------------
// Auth helper — igual que en AdminQuickBusinessEntry y AdminDashboard
// ---------------------------------------------------------------------------
function isAdminUser(user, userProfile) {
  if (!user) return false;
  const meta    = user?.user_metadata  || {};
  const appMeta = user?.app_metadata   || {};
  return meta?.role === 'admin' || appMeta?.role === 'admin' || userProfile?.role === 'admin';
}

// ---------------------------------------------------------------------------
// Detección de duplicados: nombre (ilike) + place_id en admin_notes
// Misma lógica que _core.js → checkDuplicate()
// ---------------------------------------------------------------------------
async function checkDuplicate(name, placeId) {
  const byName = await supabase
    .from('businesses')
    .select('id')
    .ilike('name', name.trim())
    .limit(1);
  if (byName.data?.length > 0) return true;

  if (placeId) {
    const byId = await supabase
      .from('businesses')
      .select('id')
      .ilike('admin_notes', `%${placeId}%`)
      .limit(1);
    if (byId.data?.length > 0) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function StatusBadge({ isDuplicate }) {
  return isDuplicate ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
      <Icon name="AlertTriangle" size={10} color="currentColor" />
      Duplicado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
      <Icon name="Plus" size={10} color="currentColor" />
      Nuevo
    </span>
  );
}

function ProgressBar({ current, total, currentName }) {
  if (total === 0) return null;
  const pct = Math.round((current / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate max-w-[70%]">
          {current < total ? (
            <>{current}/{total} — <span className="font-medium">{currentName}</span></>
          ) : (
            <span className="text-green-600 font-medium">Importación completada</span>
          )}
        </span>
        <span className="font-mono font-medium">{pct}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: 'var(--color-primary)' }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function AdminImportPlaces() {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  // Search form
  const [tipo,    setTipo]    = useState('');
  const [ciudad,  setCiudad]  = useState('Coronel');
  const [limite,  setLimite]  = useState(20);
  const [publish, setPublish] = useState(false);

  // Estado de la búsqueda
  const [searching, setSearching] = useState(false);
  const [places,    setPlaces]    = useState(null);  // null | PlaceDetail[]
  const [searchErr, setSearchErr] = useState('');

  // Selección
  const [selected, setSelected] = useState(new Set());

  // Estado de importación
  const [importing,    setImporting]    = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, name: '' });
  const [importResults,  setImportResults]  = useState(null); // null | { results, succeeded, failed }
  const [importErr,    setImportErr]    = useState('');

  const resultsRef = useRef(null);

  // ── Guard de autenticación ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user || !isAdminUser(user, userProfile)) {
    navigate('/login', { replace: true });
    return null;
  }

  // ── Búsqueda ─────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const t = tipo.trim();
    const c = ciudad.trim();
    if (!t || !c) return;

    setSearching(true);
    setSearchErr('');
    setPlaces(null);
    setSelected(new Set());
    setImportResults(null);

    try {
      const res  = await fetch(`${API_URL}/api/places/search`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tipo: t, ciudad: c, limite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al buscar en Google Places');

      // Verificar duplicados en paralelo (lotes de 5 para no saturar Supabase)
      const withDups = new Array(data.places.length);
      const batch = 5;
      for (let i = 0; i < data.places.length; i += batch) {
        const chunk = data.places.slice(i, i + batch);
        const results = await Promise.all(
          chunk.map((p) => checkDuplicate(p.name, p.place_id)),
        );
        chunk.forEach((p, j) => {
          withDups[i + j] = { ...p, isDuplicate: results[j] };
        });
      }

      setPlaces(withDups);
      setSelected(new Set(
        withDups.map((_, i) => i).filter((i) => !withDups[i].isDuplicate),
      ));

      // Scroll a resultados
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      setSearchErr(e.message);
    } finally {
      setSearching(false);
    }
  }, [tipo, ciudad, limite]);

  // ── Selección ────────────────────────────────────────────────────────────
  const toggleAll = (checked) =>
    setSelected(checked ? new Set(places.map((_, i) => i)) : new Set());

  const toggleOne = (idx) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  // ── Importación (un negocio por llamada para barra de progreso real) ─────
  const handleImport = useCallback(async () => {
    if (selected.size === 0 || importing) return;

    setImporting(true);
    setImportErr('');
    setImportResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sesión expirada — recarga la página e inicia sesión de nuevo');

      const toImport = [...selected].map((i) => places[i]);
      const results  = [];
      let succeeded  = 0;
      let failed     = 0;

      for (let i = 0; i < toImport.length; i++) {
        const place = toImport[i];
        setImportProgress({ current: i + 1, total: toImport.length, name: place.name });

        try {
          const res  = await fetch(`${API_URL}/api/places/import`, {
            method:  'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              places:  [place],
              tipo:    tipo.trim(),
              publish,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error del servidor');

          const r = data.results?.[0];
          if (r?.success) {
            results.push(r);
            succeeded++;
          } else {
            results.push({ success: false, name: place.name, error: r?.error || 'Error desconocido' });
            failed++;
          }
        } catch (e) {
          results.push({ success: false, name: place.name, error: e.message });
          failed++;
        }
      }

      setImportProgress({ current: toImport.length, total: toImport.length, name: '' });
      setImportResults({ results, succeeded, failed });

      // Quitar importados exitosos de la lista
      const importedNames = new Set(
        results.filter((r) => r.success).map((r) => r.name),
      );
      setPlaces((prev) => prev?.filter((p) => !importedNames.has(p.name)) ?? null);
      setSelected(new Set());
    } catch (e) {
      setImportErr(e.message);
    } finally {
      setImporting(false);
    }
  }, [selected, places, tipo, publish, importing]);

  // ── Estadísticas ─────────────────────────────────────────────────────────
  const newCount = places ? places.filter((p) => !p.isDuplicate).length : 0;
  const dupCount = places ? places.filter((p) =>  p.isDuplicate).length : 0;
  const selCount = selected.size;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background" style={{ paddingTop: 56 }}>

      {/* ── Header fijo ──────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
            style={{ background: 'var(--color-primary)' }}>
            <Icon name="Download" size={15} color="white" />
          </div>
          <h1 className="font-heading font-bold text-base text-foreground truncate">
            Importar desde Google Places
          </h1>
        </div>
        <Link
          to="/admin-dashboard"
          className="flex items-center gap-1.5 text-sm font-medium shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="ArrowLeft" size={15} color="currentColor" />
          <span className="hidden sm:inline">Panel admin</span>
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Formulario de búsqueda ──────────────────────────────────────── */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="Search" size={15} color="currentColor" />
            Parámetros de búsqueda
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px] gap-4 mb-4">
            <Input
              label="Tipo de negocio"
              placeholder="restaurante, farmacia, pizzería…"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              required
            />
            <Input
              label="Ciudad"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              required
            />
            <Input
              label="Máximo"
              type="number"
              min={1}
              max={60}
              value={limite}
              onChange={(e) => setLimite(Math.min(60, Math.max(1, parseInt(e.target.value, 10) || 20)))}
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <Button
              onClick={handleSearch}
              disabled={searching || !tipo.trim()}
              loading={searching}
              iconName="Search"
            >
              {searching ? 'Buscando…' : 'Buscar negocios'}
            </Button>

            {searching && (
              <p className="text-sm text-muted-foreground">
                Consultando Google Places y obteniendo detalles… puede tardar hasta 30 segundos.
              </p>
            )}
          </div>
        </section>

        {/* ── Error de búsqueda ───────────────────────────────────────────── */}
        {searchErr && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            <Icon name="AlertCircle" size={16} color="currentColor" className="shrink-0 mt-0.5" />
            {searchErr}
          </div>
        )}

        {/* ── Tabla de resultados ─────────────────────────────────────────── */}
        {places && (
          <section ref={resultsRef} className="space-y-4">

            {/* Stats bar */}
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="text-foreground font-medium">{places.length} resultados</span>
              {newCount > 0 && (
                <span className="flex items-center gap-1 text-green-700">
                  <Icon name="CheckCircle" size={14} color="currentColor" />
                  {newCount} nuevos
                </span>
              )}
              {dupCount > 0 && (
                <span className="flex items-center gap-1 text-yellow-700">
                  <Icon name="AlertTriangle" size={14} color="currentColor" />
                  {dupCount} duplicados
                </span>
              )}
              {selCount > 0 && (
                <span className="text-muted-foreground">{selCount} seleccionados</span>
              )}
            </div>

            {/* Tabla */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="p-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={selCount === places.length && places.length > 0}
                          onChange={(e) => toggleAll(e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                      </th>
                      <th className="p-3 text-left font-semibold text-foreground">Nombre</th>
                      <th className="p-3 text-left font-semibold text-foreground hidden md:table-cell">Dirección</th>
                      <th className="p-3 text-left font-semibold text-foreground hidden sm:table-cell">Teléfono</th>
                      <th className="p-3 text-left font-semibold text-foreground hidden lg:table-cell">Web</th>
                      <th className="p-3 text-center font-semibold text-foreground w-16">Fotos</th>
                      <th className="p-3 text-center font-semibold text-foreground w-28">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {places.map((p, i) => (
                      <tr
                        key={p.place_id || i}
                        onClick={() => toggleOne(i)}
                        className={[
                          'border-b border-border last:border-0 cursor-pointer transition-colors',
                          p.isDuplicate ? 'bg-yellow-50 hover:bg-yellow-100' :
                            selected.has(i) ? 'bg-green-50 hover:bg-green-100' :
                              'hover:bg-muted/50',
                        ].join(' ')}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(i)}
                            onChange={() => toggleOne(i)}
                            className="h-4 w-4 rounded border-input"
                          />
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-foreground">{p.name}</span>
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell max-w-[220px]">
                          <span className="line-clamp-2 text-xs">{p.formatted_address || '-'}</span>
                        </td>
                        <td className="p-3 text-foreground hidden sm:table-cell whitespace-nowrap">
                          {p.formatted_phone_number || p.international_phone_number || '-'}
                        </td>
                        <td className="p-3 hidden lg:table-cell max-w-[160px]">
                          {p.website ? (
                            <a
                              href={p.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline text-xs truncate block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {p.website.replace(/^https?:\/\//, '').slice(0, 35)}
                            </a>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center text-muted-foreground">
                          {p.photos?.length || 0}
                        </td>
                        <td className="p-3 text-center">
                          <StatusBadge isDuplicate={p.isDuplicate} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Panel de importación ──────────────────────────────────── */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">

              {/* Barra de progreso */}
              {(importing || importProgress.total > 0) && (
                <ProgressBar
                  current={importProgress.current}
                  total={importProgress.total}
                  currentName={importProgress.name}
                />
              )}

              <div className="flex items-center gap-4 flex-wrap">
                <Button
                  onClick={handleImport}
                  disabled={importing || selCount === 0}
                  loading={importing}
                  variant={selCount > 0 ? 'success' : 'secondary'}
                  iconName="Download"
                >
                  {importing
                    ? `Importando ${importProgress.current}/${importProgress.total}…`
                    : `Importar ${selCount} negocio${selCount !== 1 ? 's' : ''}`}
                </Button>

                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={publish}
                    onChange={(e) => setPublish(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Publicar inmediatamente
                </label>
              </div>

              {!publish && (
                <p className="text-xs text-muted-foreground">
                  Sin marcar, los negocios quedan en estado <strong>pendiente</strong>.
                  Puedes aprobarlos en <Link to="/admin-dashboard?section=businesses" className="text-primary hover:underline">Admin → Negocios → Pendiente</Link>.
                </p>
              )}

              {importErr && (
                <div className="flex items-start gap-2 text-red-700 text-sm bg-red-50 border border-red-200 rounded p-3">
                  <Icon name="AlertCircle" size={14} color="currentColor" className="shrink-0 mt-0.5" />
                  {importErr}
                </div>
              )}
            </div>

            {/* ── Resultados de importación ─────────────────────────────── */}
            {importResults && (
              <div className={[
                'rounded-lg border p-4 space-y-3',
                importResults.failed === 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200',
              ].join(' ')}>
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Icon
                    name={importResults.failed === 0 ? 'CheckCircle' : 'AlertTriangle'}
                    size={16}
                    color="currentColor"
                  />
                  {importResults.succeeded} importados correctamente
                  {importResults.failed > 0 && ` · ${importResults.failed} errores`}
                </p>
                <div className="space-y-1.5">
                  {importResults.results.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs ${r.success ? 'text-green-800' : 'text-red-700'}`}>
                      <Icon name={r.success ? 'Check' : 'X'} size={12} color="currentColor" className="shrink-0" />
                      <span className="font-medium">{r.name}</span>
                      {r.success && r.photos?.length > 0 && (
                        <span className="text-green-600">· {r.photos.length} foto{r.photos.length !== 1 ? 's' : ''}</span>
                      )}
                      {!r.success && <span className="text-red-500">— {r.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </section>
        )}
      </div>
    </div>
  );
}
