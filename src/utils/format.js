import { getActiveCityConfig } from '../config/city';

/** Number/date/currency formatting bound to the active city's locale. */

function toDate(input) {
  return input instanceof Date ? input : new Date(input);
}

export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString(getActiveCityConfig().locale);
}

export function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `$${n.toLocaleString(getActiveCityConfig().locale)}`;
}

export function formatDate(input, options) {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(getActiveCityConfig().locale, options);
}

export function formatTime(input, options = { hour: '2-digit', minute: '2-digit' }) {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(getActiveCityConfig().locale, options);
}

export function formatDateTime(input, options) {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(getActiveCityConfig().locale, options);
}
