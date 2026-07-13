import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertSingleMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock('./uploadService', () => ({ uploadFile: vi.fn() }));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table !== 'business_claims') throw new Error(`unexpected table ${table}`);
      return {
        insert: () => ({ select: () => ({ single: insertSingleMock }) }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({ maybeSingle: maybeSingleMock }),
              }),
            }),
          }),
        }),
      };
    }),
  },
}));

const { businessService } = await import('./businessService');

describe('businessService claim requests', () => {
  beforeEach(() => {
    insertSingleMock.mockReset();
    maybeSingleMock.mockReset();
  });

  it('maps a duplicate-pending-claim db error to a friendly Spanish message', async () => {
    insertSingleMock.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "uq_business_claims_pending_per_user"' },
    });

    const { data, error } = await businessService.submitClaim({
      businessId: 'biz-1',
      userId: 'user-1',
      name: 'Juan Perez',
      email: 'juan@example.com',
    });

    expect(data).toBeNull();
    expect(error?.message).toBe('Ya tienes una solicitud pendiente para este negocio.');
  });

  it('propagates non-duplicate errors unchanged', async () => {
    insertSingleMock.mockResolvedValue({ data: null, error: { code: '23503', message: 'foreign key violation' } });

    const { data, error } = await businessService.submitClaim({
      businessId: 'biz-1',
      userId: 'user-1',
      name: 'Juan Perez',
      email: 'juan@example.com',
    });

    expect(data).toBeNull();
    expect(error?.message).toBe('foreign key violation');
  });

  it('returns the existing claim for a business when one is found', async () => {
    maybeSingleMock.mockResolvedValue({ data: { id: 'claim-1', claim_status: 'pending' }, error: null });

    const { data, error } = await businessService.getMyClaimForBusiness('user-1', 'biz-1');

    expect(error).toBeNull();
    expect(data?.claim_status).toBe('pending');
  });

  it('short-circuits without querying when userId or businessId is missing', async () => {
    const { data, error } = await businessService.getMyClaimForBusiness(null, 'biz-1');
    expect(data).toBeNull();
    expect(error).toBeNull();
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });
});
