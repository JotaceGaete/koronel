import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';
import Input from 'components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const BATCH_SIZE = 5;

export function isAdminUser(user) {
  if (!user) return false;
  return user?.app_metadata?.role === 'admin';
}

function normalizePlaces(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.places)) return payload.places;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function parseJsonResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'No se pudo completar la solicitud.');
  }
  return data;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase?.auth?.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

export default function AdminImportBusinesses() {
  const { user, loading } = useAuth();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Coronel, Chile');
  const [places, setPlaces] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [currentImport, setCurrentImport] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdminUser(user)) {
    return <Navigate to="/login" replace />;
  }

  const selectedPlaces = places?.filter((place) => selectedIds?.includes(place?.place_id || place?.id));
  const importPercent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  const togglePlace = (place) => {
    const id = place?.place_id || place?.id;
    if (!id || place?.duplicate || place?.isDuplicate) return;
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const selectAllAvailable = () => {
    const availableIds = places
      ?.filter((place) => !place?.duplicate && !place?.isDuplicate)
      ?.map((place) => place?.place_id || place?.id)
      ?.filter(Boolean);
    setSelectedIds(availableIds || []);
  };

  const searchPlaces = async (event) => {
    event?.preventDefault();
    if (!query?.trim()) {
      setError('Escribe una busqueda para importar desde Google Places.');
      return;
    }
    setSearching(true);
    setError('');
    setMessage('');
    setPlaces([]);
    setSelectedIds([]);
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ query: query.trim(), location: location.trim() }),
      });
      const data = await parseJsonResponse(response);
      const nextPlaces = normalizePlaces(data);
      setPlaces(nextPlaces);
      setSelectedIds(
        nextPlaces
          ?.filter((place) => !place?.duplicate && !place?.isDuplicate)
          ?.slice(0, BATCH_SIZE)
          ?.map((place) => place?.place_id || place?.id)
          ?.filter(Boolean) || []
      );
      setMessage(nextPlaces.length ? `${nextPlaces.length} resultados encontrados.` : 'No se encontraron resultados.');
    } catch (err) {
      setError(err?.message || 'No se pudo buscar en Google Places.');
    } finally {
      setSearching(false);
    }
  };

  const importSelected = async () => {
    if (!selectedPlaces.length) {
      setError('Selecciona al menos un negocio para importar.');
      return;
    }
    setImporting(true);
    setError('');
    setMessage('');
    setProgress({ done: 0, total: selectedPlaces.length });
    try {
      const importedIds = [];
      const duplicateIds = [];
      let importedCount = 0;
      let skippedDuplicates = 0;
      for (const place of selectedPlaces) {
        const placeId = place?.place_id || place?.id;
        setCurrentImport(place?.name || 'Negocio');
        const response = await fetch('/api/places/import', {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ placeId, place }),
        });
        const data = await parseJsonResponse(response);
        importedCount += Number(data?.imported || 0);
        skippedDuplicates += Number(data?.skippedDuplicates || 0);
        if (data?.imported) {
          importedIds.push(placeId);
        } else if (data?.skippedDuplicates) {
          duplicateIds.push(placeId);
        }
        setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
      setPlaces((prev) => prev
        .filter((place) => !importedIds.includes(place?.place_id || place?.id))
        .map((place) => {
          const id = place?.place_id || place?.id;
          return duplicateIds.includes(id)
            ? { ...place, duplicate: true, isDuplicate: true }
            : place;
        }));
      setSelectedIds((prev) => prev.filter((id) => !importedIds.includes(id) && !duplicateIds.includes(id)));
      setMessage(`${importedCount} importados. ${skippedDuplicates} saltados por duplicados.`);
    } catch (err) {
      setError(err?.message || 'No se pudo importar el negocio seleccionado.');
    } finally {
      setCurrentImport('');
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" style={{ paddingTop: '64px' }}>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin-dashboard" className="flex items-center justify-center w-9 h-9 rounded-md border border-border bg-background hover:bg-muted transition-colors" aria-label="Volver al panel">
            <Icon name="ArrowLeft" size={18} color="currentColor" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-lg text-foreground truncate">Importar Google Places</h1>
            <p className="text-xs text-muted-foreground truncate">Buscar, revisar duplicados e importar negocios</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <form onSubmit={searchPlaces} className="bg-card border border-border rounded-lg p-4 grid gap-4 md:grid-cols-[1fr_260px_auto] md:items-end">
          <Input
            label="Busqueda"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej. restaurantes, ferreterias, peluquerias"
            disabled={searching || importing}
          />
          <Input
            label="Ubicacion"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Coronel, Chile"
            disabled={searching || importing}
          />
          <Button
            type="submit"
            variant="default"
            iconName="Search"
            iconPosition="left"
            loading={searching}
            disabled={searching || importing}
            className="min-h-[44px]"
          >
            Buscar
          </Button>
        </form>

        {(error || message) && (
          <div className={`rounded-lg border p-4 text-sm ${error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
            {error || message}
          </div>
        )}

        {importing && (
          <section className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground truncate">Importando {currentImport}</p>
              <span className="text-sm text-muted-foreground">{progress.done}/{progress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${importPercent}%` }} />
            </div>
          </section>
        )}

        <section className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading font-semibold text-foreground">Resultados</h2>
              <p className="text-sm text-muted-foreground">{selectedIds.length} seleccionados</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllAvailable} disabled={!places.length || importing}>
                Seleccionar disponibles
              </Button>
              <Button type="button" variant="default" size="sm" iconName="Download" iconPosition="left" onClick={importSelected} disabled={!selectedIds.length || importing}>
                Importar seleccionados
              </Button>
            </div>
          </div>

          {places.length ? (
            <div className="divide-y divide-border">
              {places.map((place) => {
                const id = place?.place_id || place?.id;
                const duplicate = place?.duplicate || place?.isDuplicate;
                const checked = selectedIds.includes(id);
                return (
                  <label key={id || place?.name} className={`flex items-start gap-3 p-4 ${duplicate ? 'opacity-60' : 'cursor-pointer hover:bg-muted/40'}`}>
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      disabled={duplicate || importing}
                      onChange={() => togglePlace(place)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">{place?.name || 'Sin nombre'}</h3>
                        {duplicate && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Duplicado</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{place?.formatted_address || place?.address || 'Sin direccion'}</p>
                      {(place?.phone || place?.formatted_phone_number || place?.rating) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {[place?.phone || place?.formatted_phone_number, place?.rating ? `Rating ${place.rating}` : null].filter(Boolean).join(' - ')}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center text-muted-foreground">
              <Icon name="MapPinned" size={36} color="currentColor" className="mx-auto mb-3" />
              <p className="text-sm">Busca negocios para comenzar.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
