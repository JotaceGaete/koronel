import React from 'react';

/**
 * AdminPageHeader — sticky page-level header for admin list pages.
 * Props:
 *   title       {string}    — required, main heading
 *   subtitle    {string}    — optional, secondary text below title
 *   actions     {ReactNode} — optional, right-side controls (buttons, filters, etc.)
 */
export default function AdminPageHeader({ title, subtitle, actions }) {
  return (
    <div
      className="sticky top-0 z-50 bg-background border-b border-border shadow-sm"
      style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
        <div className="min-w-0">
          <h2 className="text-xl font-heading font-bold text-foreground leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
