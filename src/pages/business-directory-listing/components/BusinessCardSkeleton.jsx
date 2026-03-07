import React from 'react';

export default function BusinessCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm flex flex-col">
      <div className="h-40 skeleton" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/3" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-3 skeleton rounded w-2/3" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-8 skeleton rounded mt-2" />
      </div>
    </div>
  );
}