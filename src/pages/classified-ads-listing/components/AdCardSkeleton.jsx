import React from 'react';

export default function AdCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <div className="h-44 skeleton" />
      <div className="p-3 md:p-4 space-y-2">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-5 skeleton rounded w-1/3" />
        <div className="flex gap-2">
          <div className="h-5 skeleton rounded w-16" />
          <div className="h-5 skeleton rounded w-20" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-8 skeleton rounded flex-1" />
          <div className="h-8 skeleton rounded flex-1" />
        </div>
      </div>
    </div>
  );
}