import { CITY_CONFIG } from '../config/city';

/** Phone formatting/validation bound to the active city's country code. */

export const PHONE_PLACEHOLDER = `+${CITY_CONFIG.phoneCountryCode} 9 1234 5678`;

/** Strips everything but digits and a leading country code, then groups as "9 1234 5678". */
export function formatLocalPhoneInput(rawValue, maxLocalDigits = 9) {
  let digits = String(rawValue || '').replace(/\D/g, '');
  if (digits.startsWith(CITY_CONFIG.phoneCountryCode)) {
    digits = digits.slice(CITY_CONFIG.phoneCountryCode.length);
  }
  digits = digits.slice(0, maxLocalDigits);
  let formatted = digits;
  if (digits.length > 1) formatted = `${digits.slice(0, 1)} ${digits.slice(1)}`;
  if (digits.length > 5) formatted = `${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5)}`;
  return formatted ? `+${CITY_CONFIG.phoneCountryCode} ${formatted}` : '';
}

/** Prefixes a raw phone string with the country code (E.164-ish) unless it already has it. */
export function toDialablePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith(CITY_CONFIG.phoneCountryCode) ? `+${digits}` : `+${CITY_CONFIG.phoneCountryCode}${digits}`;
}

export function isValidLocalPhone(phone, minDigits = 9) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= minDigits;
}
