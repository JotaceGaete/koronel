import { describe, it, expect, vi, beforeEach } from 'vitest';

// business_claims and businesses both have two FKs into user_profiles
// (business_claims: user_id + reviewed_by; businesses: owner_id + created_by).
// An unqualified `user_profiles(...)` embed on either table makes PostgREST
// fail with "more than one relationship was found" — these tests pin the
// select strings to the explicit `!constraint_name` form so that error can't
// silently come back.
const selectMock = vi.fn(() => ({ order: () => Promise.resolve({ data: [], error: null }) }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

const { adminClaimService, adminBusinessService } = await import('./adminService');

describe('admin embeds for tables with multiple user_profiles FKs', () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
  });

  it('qualifies both business_claims -> user_profiles embeds with their constraint name', async () => {
    await adminClaimService.getAll();
    const selectArg = selectMock.mock.calls[0][0];
    expect(selectArg).toContain('requester:user_profiles!business_claims_user_id_fkey');
    expect(selectArg).toContain('reviewer:user_profiles!business_claims_reviewed_by_fkey');
    expect(selectArg).not.toMatch(/[^!]user_profiles\(/);
  });

  it('qualifies the businesses -> user_profiles owner embed with its constraint name', async () => {
    await adminBusinessService.getAll({});
    const selectArg = selectMock.mock.calls[0][0];
    expect(selectArg).toContain('owner:user_profiles!businesses_owner_id_fkey');
    expect(selectArg).not.toMatch(/[^!]user_profiles\(/);
  });
});
