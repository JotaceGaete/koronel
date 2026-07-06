import { describe, it, expect } from 'vitest';
import { getBusinessCompleteness } from './businessCompleteness';

describe('getBusinessCompleteness', () => {
  it('returns 0% and all fields missing for an empty business', () => {
    const { percent, items, missing } = getBusinessCompleteness({});
    expect(percent).toBe(0);
    expect(items).toHaveLength(8);
    expect(missing).toHaveLength(8);
  });

  it('returns 100% when every field is present', () => {
    const business = {
      logo_url: 'https://x/logo.png',
      business_images: [{ is_primary: true }],
      address_text: 'Av. Prat 123',
      whatsapp: '+56911111111',
      opening_hours: { mode: 'always_open' },
      description: 'a'.repeat(40),
      category_key: 'restaurantes',
      website: 'https://negocio.cl',
    };
    const { percent, missing } = getBusinessCompleteness(business);
    expect(percent).toBe(100);
    expect(missing).toHaveLength(0);
  });

  it('does not count a description under the 40-character threshold', () => {
    const { items } = getBusinessCompleteness({ description: 'muy corta' });
    expect(items.find((i) => i.key === 'description')?.done).toBe(false);
  });

  it('counts social as done via social_links even without a website', () => {
    const { items } = getBusinessCompleteness({ social_links: [{ url: 'https://instagram.com/x' }] });
    expect(items.find((i) => i.key === 'social')?.done).toBe(true);
  });

  it('requires an is_primary image for the cover item, not just any image', () => {
    const { items } = getBusinessCompleteness({ business_images: [{ is_primary: false }] });
    expect(items.find((i) => i.key === 'cover')?.done).toBe(false);
  });

  it('rounds the percentage to the nearest integer', () => {
    // 3 of 8 fields done = 37.5% -> rounds to 38
    const { percent } = getBusinessCompleteness({
      logo_url: 'x',
      whatsapp: '+56900000000',
      category_key: 'salud',
    });
    expect(percent).toBe(38);
  });
});
