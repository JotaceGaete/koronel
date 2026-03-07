import React from 'react';
import { Link } from 'react-router-dom';
import Image from 'components/AppImage';
import Icon from 'components/AppIcon';

export default function RelatedBusinesses({ businesses }) {
  if (!businesses?.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="Store" size={18} color="var(--color-primary)" />
        <h3 className="font-heading font-semibold text-base text-foreground">Negocios similares</h3>
      </div>
      <div className="space-y-3">
        {businesses?.map((biz) => (
          <Link
            key={biz?.id}
            to={`/business-profile-page?id=${biz?.id}`}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
          >
            <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-muted">
              <Image src={biz?.image} alt={biz?.imageAlt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-caption font-semibold text-foreground truncate">{biz?.name}</p>
              <p className="text-xs font-caption text-muted-foreground truncate">{biz?.category}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Icon name="Star" size={11} color="var(--color-accent)" />
                <span className="text-xs font-data text-foreground">{biz?.rating}</span>
              </div>
            </div>
            <Icon name="ChevronRight" size={16} color="var(--color-secondary)" />
          </Link>
        ))}
      </div>
    </div>
  );
}