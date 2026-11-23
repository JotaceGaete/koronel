import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('./uploadService', () => ({ uploadFile: vi.fn() }));

const { buildOwnerBusinessInsert, buildOwnerBusinessUpdate, PUBLIC_BUSINESS_COLUMNS } = await import('./businessService');

const RESERVED = {
  status: 'premium',
  verified: true,
  featured: true,
  premium_until: '2099-01-01T00:00:00Z',
  claimed: false,
  rating: 5,
  review_count: 100,
  profile_visits: 1000,
  contacts_count: 50,
  rejection_reason: 'x',
  admin_notes: 'x',
  account_id: 'a',
  walinka_enabled: true,
  walinka_catalog_url: 'https://x',
  walinka_business_slug: 'x',
};

describe('payloads de comerciante', () => {
  it('el alta conserva los campos editables y el dueño, y descarta los reservados', () => {
    const payload = buildOwnerBusinessInsert({ name: 'Pan', phone: '1', address_text: 'Calle', owner_id: 'u1', ...RESERVED });
    expect(payload).toEqual({ name: 'Pan', phone: '1', address_text: 'Calle', owner_id: 'u1' });
  });

  it('la edición descarta reservados y owner_id', () => {
    const payload = buildOwnerBusinessUpdate({ name: 'Pan', description: 'd', owner_id: 'otro', ...RESERVED });
    expect(payload).toEqual({ name: 'Pan', description: 'd' });
  });

  it('las columnas públicas no incluyen datos internos', () => {
    const cols = PUBLIC_BUSINESS_COLUMNS.split(', ');
    for (const c of ['admin_notes', 'rejection_reason', 'account_id', 'walinka_enabled', 'walinka_catalog_url', 'walinka_business_slug']) {
      expect(cols).not.toContain(c);
    }
    expect(cols).toContain('id');
    expect(cols).toContain('status');
  });
});
