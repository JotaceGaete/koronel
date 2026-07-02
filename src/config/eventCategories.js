/**
 * Single source of truth for the fixed event_category enum
 * (church | courses | meetups | other) — this is a Postgres ENUM, not a
 * `categories` table row, so there's no DB fetch to consolidate here, only
 * the ~11 identical copies of label/color/icon that were scattered across
 * event pages and components.
 *
 * Two palettes exist because two different badge styles were already in
 * use (inline hex styles vs. Tailwind utility classes) — kept separate
 * rather than merged, since unifying them would change rendered output.
 */

export const EVENT_CATEGORY_CONFIG = {
  church: { label: 'Iglesia', color: '#7c3aed', bg: '#f3e8ff', icon: 'Church' },
  courses: { label: 'Cursos', color: '#0891b2', bg: '#e0f2fe', icon: 'BookOpen' },
  meetups: { label: 'Encuentros', color: '#059669', bg: '#d1fae5', icon: 'Users' },
  other: { label: 'Otro', color: '#d97706', bg: '#fef3c7', icon: 'Tag' },
};

export const EVENT_CATEGORY_TAILWIND = {
  church: { label: 'Iglesia', color: 'bg-purple-100 text-purple-700', icon: 'Church' },
  courses: { label: 'Cursos', color: 'bg-blue-100 text-blue-700', icon: 'BookOpen' },
  meetups: { label: 'Encuentros', color: 'bg-green-100 text-green-700', icon: 'Users' },
  other: { label: 'Otro', color: 'bg-gray-100 text-gray-600', icon: 'Calendar' },
};

export const EVENT_CATEGORY_LABELS = Object.fromEntries(
  Object.entries(EVENT_CATEGORY_CONFIG).map(([key, v]) => [key, v.label])
);
