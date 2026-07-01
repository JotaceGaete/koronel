// Merchant preferences — stored in localStorage, keyed by business ID.
// Every time a merchant publishes, we persist their choices.
// Next session, we pre-fill everything from those choices.

const KEY = (businessId) => `koronel_merchant_prefs_${businessId}`;

const DEFAULTS = {
  action_type:       null,          // last used type
  duration_days:     7,             // last used duration
  discount_type:     'pct',
  dist_koronel:      true,
  dist_map:          true,
  dist_profile:      true,
  dist_followers:    true,
  dist_walinka:      false,
  show_countdown:    true,
  publish_count:     0,             // total times published
};

export function loadPrefs(businessId) {
  try {
    const raw = localStorage.getItem(KEY(businessId));
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(businessId, updates) {
  try {
    const current = loadPrefs(businessId);
    const next = { ...current, ...updates, publish_count: (current.publish_count || 0) + 1 };
    localStorage.setItem(KEY(businessId), JSON.stringify(next));
    return next;
  } catch {
    return { ...DEFAULTS };
  }
}

// Returns number of days from now until endsAt
export function durationDaysFromEndsAt(endsAtISO) {
  if (!endsAtISO) return 7;
  const ms = new Date(endsAtISO) - Date.now();
  return Math.max(1, Math.round(ms / 86400000));
}

// Builds ends_at ISO string for N days from now (23:59 local)
export function endsAtFromDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

export const DURATION_OPTIONS = [
  { days: 1,  label: 'Mañana' },
  { days: 3,  label: '3 días' },
  { days: 7,  label: '1 semana' },
  { days: 14, label: '2 semanas' },
  { days: 30, label: '1 mes' },
];
