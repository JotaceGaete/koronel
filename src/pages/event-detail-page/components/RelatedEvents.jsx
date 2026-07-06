import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { formatDate } from 'utils/format';
import { EVENT_CATEGORY_TAILWIND as CATEGORY_CONFIG } from 'config/eventCategories';

export default function RelatedEvents({ events }) {
  if (!events?.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-heading font-semibold text-base text-foreground mb-4">Eventos relacionados</h3>
      <div className="space-y-3">
        {events?.map(event => {
          const cat = CATEGORY_CONFIG?.[event?.category] || CATEGORY_CONFIG?.other;
          return (
            <Link
              key={event?.id}
              to={`/eventos/${event?.id}`}
              className="flex gap-3 group hover:bg-muted rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {event?.imageUrl ? (
                  <img src={event?.imageUrl} alt={event?.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="Calendar" size={20} color="var(--color-muted-foreground)" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{event?.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(event?.startDatetime)}</p>
                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-medium ${cat?.color}`}>{cat?.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
