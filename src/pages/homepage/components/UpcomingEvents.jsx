import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';
import { eventService } from '../../../services/eventService';
import { useCity } from '../../../contexts/CityContext';

const CATEGORY_CONFIG = {
  church: { label: 'Iglesia', color: '#7c3aed', bg: '#f3e8ff' },
  courses: { label: 'Cursos', color: '#0891b2', bg: '#e0f2fe' },
  meetups: { label: 'Encuentros', color: '#059669', bg: '#d1fae5' },
  other: { label: 'Otro', color: '#d97706', bg: '#fef3c7' }
};

function EventCard({ event }) {
  const formatted = eventService?.formatEvent(event);
  const cat = CATEGORY_CONFIG?.[event?.category];

  return (
    <Link
      to={`/eventos/${event?.id}`}
      className="group flex-shrink-0 w-64 sm:w-72 bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      
      {/* Image */}
      <div className="relative" style={{ aspectRatio: '16/9', background: 'var(--color-muted)' }}>
        {event?.image_url ?
        <Image
          src={event?.image_url}
          alt={`Imagen del evento: ${event?.title}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> :


        <div className="w-full h-full flex items-center justify-center">
            <Icon name="CalendarDays" size={28} color="var(--color-muted-foreground)" />
          </div>
        }
        {cat &&
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-caption font-semibold"
          style={{ background: cat?.bg, color: cat?.color }}>
          
            {cat?.label}
          </span>
        }
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-heading font-semibold text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {event?.title}
        </h3>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="Calendar" size={12} color="var(--color-primary)" />
            <span>{formatted?.dateStr}</span>
            {formatted?.timeStr &&
            <>
                <span>·</span>
                <span>{formatted?.timeStr}</span>
              </>
            }
          </div>
          {event?.venue_name &&
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name="MapPin" size={12} color="var(--color-primary)" />
              <span className="truncate">{event?.venue_name}</span>
            </div>
          }
        </div>
      </div>
    </Link>);

}

export default function UpcomingEvents() {
  const { communityCityId } = useCity();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Limpia de inmediato: evita que, mientras resuelve la ciudad nueva,
    // queden visibles eventos de la ciudad anterior.
    setEvents([]);

    eventService?.getUpcoming({ limit: 4, communityCityId })?.then(({ data, error }) => {
      if (cancelled) return;
      if (!error) setEvents(data || []);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [communityCityId]);

  return (
    <section className="w-full py-12 md:py-14 lg:py-16 px-4 md:px-6 lg:px-8" style={{ background: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <Icon name="CalendarDays" size={18} color="white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Próximos Eventos</h2>
              <p className="text-xs text-muted-foreground">Lo que se viene en Coronel</p>
            </div>
          </div>
          <Link to="/eventos">
            <Button variant="ghost" size="sm" iconName="ArrowRight" iconPosition="right" iconSize={14}>
              Ver todos
            </Button>
          </Link>
        </div>

        {/* Horizontal Scroll */}
        {loading ?
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {Array.from({ length: 4 })?.map((_, i) =>
          <div key={i} className="flex-shrink-0 w-64 sm:w-72 bg-card border border-border rounded-xl overflow-hidden animate-pulse">
                <div className="bg-muted" style={{ aspectRatio: '16/9' }} />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
          )}
          </div> :
        events?.length === 0 ?
        <div className="text-center py-10">
            <Icon name="CalendarOff" size={32} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No hay eventos próximos</p>
            <Link to="/post-event-form" className="mt-3 inline-block">
              <Button variant="outline" size="sm" iconName="Plus" iconPosition="left" iconSize={14}>
                Publicar evento
              </Button>
            </Link>
          </div> :

        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {events?.map((event) =>
          <EventCard key={event?.id} event={event} />
          )}
            {/* CTA Card */}
            <Link
            to="/post-event-form"
            className="flex-shrink-0 w-64 sm:w-72 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-6 text-center hover:border-primary hover:bg-muted transition-all duration-200 group">
            
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--color-muted)' }}>
                <Icon name="CalendarPlus" size={22} color="var(--color-primary)" />
              </div>
              <p className="text-sm font-caption font-semibold text-foreground group-hover:text-primary transition-colors">
                ¿Tienes un evento?
              </p>
              <p className="text-xs text-muted-foreground mt-1">Publícalo gratis</p>
            </Link>
          </div>
        }
      </div>
    </section>);

}