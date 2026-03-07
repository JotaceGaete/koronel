import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from 'components/ui/Header';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';
import { eventService } from '../../services/eventService';

const CATEGORIES = [
{ value: 'all', label: 'Todos' },
{ value: 'church', label: 'Iglesia' },
{ value: 'courses', label: 'Cursos' },
{ value: 'meetups', label: 'Encuentros' },
{ value: 'other', label: 'Otro' }];


const CATEGORY_CONFIG = {
  church: { label: 'Iglesia', color: '#7c3aed', bg: '#f3e8ff' },
  courses: { label: 'Cursos', color: '#0891b2', bg: '#e0f2fe' },
  meetups: { label: 'Encuentros', color: '#059669', bg: '#d1fae5' },
  other: { label: 'Otro', color: '#d97706', bg: '#fef3c7' }
};

const FALLBACK_EVENTS = [
{ id: '1', title: 'Feria Gastronómica de Coronel', category: 'meetups', start_datetime: new Date(Date.now() + 3 * 86400000)?.toISOString(), end_datetime: new Date(Date.now() + 3 * 86400000 + 6 * 3600000)?.toISOString(), venue_name: 'Plaza de Armas de Coronel', address_text: 'Plaza de Armas, Coronel', address: 'Plaza de Armas, Coronel', image_url: "https://img.rocket.new/generatedImages/rocket_gen_img_1f720e1f9-1772645296972.png", status: 'approved' },
{ id: '2', title: 'Taller de Emprendimiento Digital', category: 'courses', start_datetime: new Date(Date.now() + 7 * 86400000)?.toISOString(), end_datetime: new Date(Date.now() + 7 * 86400000 + 3 * 3600000)?.toISOString(), venue_name: 'Centro Comunitario Coronel Norte', address_text: 'Av. Colón 456, Coronel Norte', address: 'Av. Colón 456, Coronel Norte', image_url: "https://images.unsplash.com/photo-1549495034-4c0f106db5e6", status: 'approved' },
{ id: '3', title: 'Culto de Alabanza y Adoración', category: 'church', start_datetime: new Date(Date.now() + 5 * 86400000)?.toISOString(), end_datetime: new Date(Date.now() + 5 * 86400000 + 2 * 3600000)?.toISOString(), venue_name: 'Iglesia Evangélica Coronel', address_text: 'Calle Freire 789, Coronel', address: 'Calle Freire 789, Coronel', image_url: "https://images.unsplash.com/photo-1715503485494-1ed23a5be1ba", status: 'approved' },
{ id: '4', title: 'Encuentro de Vecinos Boca Sur', category: 'meetups', start_datetime: new Date(Date.now() + 10 * 86400000)?.toISOString(), end_datetime: new Date(Date.now() + 10 * 86400000 + 2 * 3600000)?.toISOString(), venue_name: 'Sede Social Boca Sur', address_text: 'Pasaje Los Pinos 123, Boca Sur', address: 'Pasaje Los Pinos 123, Boca Sur', image_url: "https://images.unsplash.com/photo-1561650714-2c92f02c21de", status: 'approved' }];


function formatEventDate(dtStr) {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr);
    return d?.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {return '';}
}

function formatEventTime(dtStr) {
  if (!dtStr) return '';
  try {
    return new Date(dtStr)?.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  } catch {return '';}
}

function EventCard({ event }) {
  const cat = CATEGORY_CONFIG?.[event?.category];
  const dateStr = formatEventDate(event?.start_datetime);
  const timeStr = formatEventTime(event?.start_datetime);
  const address = event?.address_text || event?.address || '';

  return (
    <Link
      to={`/eventos/${event?.id}`}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
      
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--color-muted)' }}>
        {event?.image_url ?
        <Image
          src={event?.image_url}
          alt={`Imagen del evento: ${event?.title}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> :


        <div className="w-full h-full flex items-center justify-center">
            <Icon name="CalendarDays" size={32} color="var(--color-muted-foreground)" />
          </div>
        }
        {cat &&
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: cat?.bg, color: cat?.color }}>
          
            {cat?.label}
          </span>
        }
        {event?.status === 'pending' &&
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#fef3c7', color: '#d97706' }}>
            Pendiente
          </span>
        }
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-heading font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {event?.title}
        </h3>
        <div className="space-y-1.5 mt-auto">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Icon name="Calendar" size={14} color="var(--color-primary)" />
            <span className="capitalize">{dateStr}</span>
            {timeStr && <><span>·</span><span>{timeStr}</span></>}
          </div>
          {event?.venue_name &&
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon name="MapPin" size={14} color="var(--color-primary)" />
              <span className="truncate">{event?.venue_name}</span>
            </div>
          }
          {address &&
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name="Navigation" size={12} color="currentColor" />
              <span className="truncate">{address}</span>
            </div>
          }
        </div>
      </div>
    </Link>);

}

export default function EventsListing() {
  const [events, setEvents] = useState(FALLBACK_EVENTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [upcoming, setUpcoming] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await eventService?.getAll({
        category: category !== 'all' ? category : undefined,
        search,
        upcoming,
        status: 'approved'
      });
      if (!error && data) setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [category, search, upcoming]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Header />
      <div style={{ paddingTop: '64px' }}>
        {/* Page Header */}
        <div className="w-full py-8 md:py-10" style={{ background: 'var(--color-muted)' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="CalendarDays" size={22} color="var(--color-primary)" />
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Eventos en Coronel</h1>
                </div>
                <p className="text-muted-foreground text-sm">Descubre lo que está pasando en tu ciudad</p>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/mapa">
                  <Button variant="outline" iconName="Map" iconPosition="left" iconSize={16}>
                    Ver en mapa
                  </Button>
                </Link>
                <Link to="/eventos/nuevo">
                  <Button variant="default" iconName="CalendarPlus" iconPosition="left" iconSize={16}>
                    Publicar Evento
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="sticky top-16 z-10 bg-card border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Icon name="Search" size={16} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e?.target?.value)}
                  placeholder="Buscar eventos..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                {CATEGORIES?.map((cat) =>
                <button
                  key={cat?.value}
                  onClick={() => setCategory(cat?.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                  category === cat?.value ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`
                  }
                  style={category === cat?.value ? { background: 'var(--color-primary)' } : {}}>
                  
                    {cat?.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => setUpcoming((v) => !v)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                upcoming ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:bg-muted'}`
                }
                style={upcoming ? { background: 'var(--color-primary)' } : {}}>
                
                <Icon name="Clock" size={14} color="currentColor" />
                Próximos
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
          {loading ?
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 })?.map((_, i) =>
            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
                  <div className="bg-muted" style={{ aspectRatio: '16/9' }} />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
            )}
            </div> :
          events?.length === 0 ?
          <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-muted)' }}>
                <Icon name="CalendarOff" size={28} color="var(--color-muted-foreground)" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">No hay eventos</h3>
              <p className="text-muted-foreground text-sm mb-6">
                {search ? `No se encontraron eventos para "${search}"` : 'No hay eventos disponibles con los filtros seleccionados'}
              </p>
              <Link to="/eventos/nuevo">
                <Button variant="default" iconName="CalendarPlus" iconPosition="left" iconSize={16}>
                  Publicar el primer evento
                </Button>
              </Link>
            </div> :

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {events?.map((event) =>
            <EventCard key={event?.id} event={event} />
            )}
            </div>
          }
        </div>
      </div>
    </div>);

}