import { describe, it, expect, vi, beforeEach } from 'vitest';

// Integración PR #2 + PR #3: aprobar/rechazar reclamos debe pasar SOLO por las RPC
// approve_business_claim / reject_business_claim, sin UPDATE directo a businesses ni a
// business_claims; y el listado debe seguir mostrando el email del reclamante vía RPC.
const rpc = vi.fn();
const from = vi.fn();
vi.mock('../lib/supabase', () => ({ supabase: { rpc: (...a) => rpc(...a), from: (...a) => from(...a) } }));

const { adminClaimService } = await import('./adminService');

beforeEach(() => { rpc.mockReset(); from.mockReset(); });

describe('adminClaimService.updateStatus', () => {
  it.each([
    ['approved', 'approve_business_claim'],
    ['rejected', 'reject_business_claim'],
  ])('%s usa la RPC %s y no escribe tablas directamente', async (status, fn) => {
    rpc.mockResolvedValue({ data: { id: 'c1', claim_status: status }, error: null });
    const out = await adminClaimService.updateStatus('c1', status, 'nota');
    expect(rpc).toHaveBeenCalledWith(fn, { p_claim_id: 'c1', p_admin_notes: 'nota' });
    expect(from).not.toHaveBeenCalled();
    expect(out).toEqual({ id: 'c1', claim_status: status });
  });

  it('propaga el error de la RPC (p. ej. no admin)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Solo un administrador puede aprobar solicitudes de reclamo' } });
    await expect(adminClaimService.updateStatus('c1', 'approved')).rejects.toMatchObject({ message: /Solo un administrador/ });
    expect(from).not.toHaveBeenCalled();
  });

  it('rechaza estados no soportados sin llamar a nada', async () => {
    await expect(adminClaimService.updateStatus('c1', 'pending')).rejects.toThrow(/no soportado/);
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});

describe('adminClaimService.getAll', () => {
  it('embebe solo columnas públicas del reclamante y agrega el email por RPC', async () => {
    let selected;
    const q = { select: (s) => { selected = s; return q; }, order: () => q, eq: () => q,
      then: (res) => res({ data: [{ id: 'c1', claimant: { id: 'u1', full_name: 'Ana' } }], error: null }) };
    from.mockReturnValue(q);
    rpc.mockResolvedValue({ data: [{ id: 'u1', email: 'ana@x', phone: null }], error: null });
    const rows = await adminClaimService.getAll();
    expect(selected).toContain('claimant:user_profiles(id, full_name)');
    expect(selected).not.toMatch(/email|phone/);
    expect(rpc).toHaveBeenCalledWith('admin_get_user_contacts', { p_user_ids: ['u1'] });
    expect(rows[0].claimant.email).toBe('ana@x');
  });
});
