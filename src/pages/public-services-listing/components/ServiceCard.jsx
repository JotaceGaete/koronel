import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';

export default function ServiceCard({ service }) {
  return (
    <Link
      to={`/servicios/${service?.id}`}
      className="block bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/40 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon name="Landmark" size={18} color="var(--color-primary)" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm md:text-base text-foreground truncate">
            {service?.name}
          </h3>
          <p className="text-xs font-caption text-muted-foreground mt-0.5">
            {service?.institution_type}
          </p>
          {service?.address && (
            <p className="text-xs font-caption text-muted-foreground mt-2 flex items-start gap-1.5">
              <Icon name="MapPin" size={13} color="currentColor" className="shrink-0 mt-0.5" />
              <span className="truncate">{service?.address}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
