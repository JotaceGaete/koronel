/**
 * Neighborhood/sector taxonomies for the active city.
 *
 * Two independent taxonomies exist today because they were built for
 * different features (Q&A vs. classified ads) — kept separate rather than
 * merged, since unifying them would change the options users see.
 *
 * The two color palettes below are also kept separate on purpose: before
 * this refactor, the same sector rendered in two different colors
 * depending on which page you were on (a pre-existing inconsistency, not
 * something this pass changes).
 */

export const COMMUNITY_SECTORS = ['Centro', 'Lagunillas', 'Schwager', 'Puchoco', 'Las Higueras', 'Punta de Parra', 'Otro'];

export function communitySectorOptions(placeholder = 'Seleccionar sector...') {
  return [{ value: '', label: placeholder }, ...COMMUNITY_SECTORS.map((s) => ({ value: s, label: s }))];
}

export const CLASSIFIED_AD_SECTORS = ['Centro', 'Coronel Norte', 'Coronel Sur', 'Boca Sur', 'Lagunillas', 'Palomares', 'Schwager', 'Otro sector'];

export function classifiedAdSectorOptions(placeholder = 'Selecciona un sector') {
  return [{ value: '', label: placeholder }, ...CLASSIFIED_AD_SECTORS.map((s) => ({ value: s, label: s }))];
}

export const SECTOR_COLORS_PALETTE_A = {
  Centro: { bg: '#dbeafe', color: '#1d4ed8' },
  Lagunillas: { bg: '#d1fae5', color: '#065f46' },
  Schwager: { bg: '#fef3c7', color: '#92400e' },
  Puchoco: { bg: '#f3e8ff', color: '#6b21a8' },
  'Las Higueras': { bg: '#fee2e2', color: '#991b1b' },
  'Punta de Parra': { bg: '#e0f2fe', color: '#0369a1' },
  Otro: { bg: '#f3f4f6', color: '#374151' },
};

export const SECTOR_COLORS_PALETTE_B = {
  Centro: { bg: '#dbeafe', color: '#1d4ed8' },
  Lagunillas: { bg: '#dcfce7', color: '#15803d' },
  Schwager: { bg: '#fef3c7', color: '#b45309' },
  Puchoco: { bg: '#fce7f3', color: '#be185d' },
  'Las Higueras': { bg: '#ede9fe', color: '#7c3aed' },
  'Punta de Parra': { bg: '#ffedd5', color: '#c2410c' },
  Otro: { bg: '#f1f5f9', color: '#475569' },
};
