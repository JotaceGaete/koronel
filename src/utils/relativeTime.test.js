import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './relativeTime';

describe('formatRelativeTime', () => {
  it('returns "ahora" for timestamps under a minute old', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('ahora');
  });

  it('returns minutes for under an hour', () => {
    const d = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatRelativeTime(d)).toBe('hace 5 min');
  });

  it('returns hours for under a day', () => {
    const d = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatRelativeTime(d)).toBe('hace 3h');
  });

  it('returns days for under a week', () => {
    const d = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(formatRelativeTime(d)).toBe('hace 2d');
  });

  it('returns empty string for missing input', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime(undefined)).toBe('');
  });
});
