import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import { adminClaimService } from './adminService';

function makeBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('adminClaimService.getAll — embed de user_profiles desambiguado', () => {
  it('califica la relación con claimant con el nombre real de la FK (business_claims_user_id_fkey), no un embed ambiguo', async () => {
    let selectArg;
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('business_claims');
      return {
        select: vi.fn((arg) => {
          selectArg = arg;
          return makeBuilder({ data: [], error: null });
        }),
      };
    });

    await adminClaimService?.getAll();

    // La causa raíz del bug: un embed sin calificar es ambiguo porque
    // business_claims tiene DOS FKs hacia user_profiles (user_id y
    // reviewed_by). El select debe usar la sintaxis alias:tabla!fk_real.
    expect(selectArg)?.toContain('claimant:user_profiles!business_claims_user_id_fkey(');
    // Nunca debe volver a la forma ambigua sin calificar.
    expect(selectArg)?.not?.toMatch(/claimant:user_profiles\(/);
    // No se agrega un embed de reviewed_by que la pantalla no pidió.
    expect(selectArg)?.not?.toContain('reviewed_by');
  });

  it('sigue trayendo también el negocio embebido (business_id) y filtra por estado cuando se pide', async () => {
    let builder;
    let selectArg;
    supabase?.from?.mockImplementation(() => {
      builder = makeBuilder({ data: [{ id: 'claim-1' }], error: null });
      const originalSelect = builder.select;
      builder.select = vi.fn((arg) => { selectArg = arg; return originalSelect(arg); });
      return builder;
    });

    const data = await adminClaimService?.getAll('pending');

    expect(selectArg)?.toContain('business:businesses(name, category, address)');
    expect(builder?.eq?.mock?.calls)?.toContainEqual(['claim_status', 'pending']);
    expect(data)?.toEqual([{ id: 'claim-1' }]);
  });

  it('lanza el error (no lo traga) cuando la consulta falla, para que la UI pueda mostrarlo', async () => {
    supabase?.from?.mockImplementation(() => ({
      select: vi.fn(() => makeBuilder({ data: null, error: new Error("more than one relationship was found") })),
    }));

    await expect(adminClaimService?.getAll())?.rejects?.toThrow('more than one relationship was found');
  });
});

describe('adminClaimService.updateStatus — flujo de aprobación/rechazo sin cambios', () => {
  it('aprobar actualiza claim_status y, si hay business_id/user_id, transfiere la propiedad del negocio', async () => {
    const calls = [];
    supabase?.from?.mockImplementation((table) => {
      calls?.push(table);
      if (table === 'business_claims') {
        return {
          select: vi.fn(() => makeBuilder({ data: { id: 'claim-1', business_id: 'biz-1', user_id: 'user-1' }, error: null })),
          update: vi.fn(() => makeBuilder({ data: { id: 'claim-1', claim_status: 'approved' }, error: null })),
        };
      }
      if (table === 'businesses') {
        return { update: vi.fn(() => makeBuilder({ data: null, error: null })) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await adminClaimService?.updateStatus('claim-1', 'approved');

    expect(result)?.toEqual({ id: 'claim-1', claim_status: 'approved' });
    expect(calls)?.toContain('businesses');
  });

  it('rechazar actualiza claim_status y NO toca la tabla businesses', async () => {
    const calls = [];
    supabase?.from?.mockImplementation((table) => {
      calls?.push(table);
      if (table === 'business_claims') {
        return {
          select: vi.fn(() => makeBuilder({ data: { id: 'claim-1', business_id: 'biz-1', user_id: 'user-1' }, error: null })),
          update: vi.fn(() => makeBuilder({ data: { id: 'claim-1', claim_status: 'rejected' }, error: null })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await adminClaimService?.updateStatus('claim-1', 'rejected');

    expect(result)?.toEqual({ id: 'claim-1', claim_status: 'rejected' });
    expect(calls)?.not?.toContain('businesses');
  });
});
