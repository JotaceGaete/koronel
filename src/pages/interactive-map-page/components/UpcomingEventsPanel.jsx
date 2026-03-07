import React, { useState } from 'react';
import Icon from 'components/AppIcon';
import { mapService } from '../../../services/mapService';

const CATEGORY_CONFIG = {
  church: { label: 'Iglesia', color: '#7c3aed', bg: '#f3e8ff' },
  courses: { label: 'Cursos', color: '#0891b2', bg: '#e0f2fe' },
  meetups: { label: 'Encuentros', color: '#059669', bg: '#d1fae5' },
  other: { label: 'Otro', color: '#d97706', bg: '#fef3c7' },
};

export default function UpcomingEventsPanel({ events, onEventClick, isOpen, onToggle }) {
  return (
    <div
      className="bg-card border border-border rounded-xl shadow-lg overflow-hidden"
      style={{ width: '280px', maxWidth: 'calc(100vw - 32px)' }}
    >
      {/* Panel Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'var(--color-primary)' }}
          >
            <Icon name="CalendarDays" size={13} color="white" />
          </div>
          <span className="text-sm font-heading font-semibold text-foreground">Próximos Eventos</span>
          {events?.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              {events?.length}
            </span>
          )}
        </div>
        <Icon
          name={isOpen ? 'ChevronDown' : 'ChevronUp'}
          size={16}
          color="var(--color-muted-foreground)"
        />
      </button>

      {/* Events List */}
      {isOpen && (
        <div className="border-t border-border">
          {events?.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Icon name="CalendarOff" size={24} color="var(--color-muted-foreground)" className="mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No hay eventos próximos</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {events?.map(event => {
                const cat = CATEGORY_CONFIG?.[event?.category];
                const dateStr = mapService?.formatEventDate(event?.start_datetime);
                const timeStr = mapService?.formatEventTime(event?.start_datetime);
                return (
                  <button
                    key={event?.id}
                    onClick={() => onEventClick?.(event)}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ background: cat?.color || '#6b7280' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {event?.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {dateStr}{timeStr ? ` · ${timeStr}` : ''}
                        </p>
                        {event?.venue_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {event?.venue_name}
                          </p>
                        )}
                      </div>
                      <Icon name="MapPin" size={12} color="var(--color-muted-foreground)" className="mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
