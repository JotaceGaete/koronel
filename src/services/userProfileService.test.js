import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
const single = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...a) => rpc(...a),
    from: () => ({ select: () => ({ eq: () => ({ single: () => single() }) }) }),
  },
}));

const { attachUserContacts, fetchOwnProfile, ADMIN_CONTACTS_ERROR_EVENT } = await import('./userProfileService');

beforeEach(() => { rpc.mockReset(); single.mockReset(); });

describe('attachUserContacts', () => {
  it('añade email/phone al perfil embebido con una sola RPC', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'u1', email: 'a@x', phone: '1' }], error: null });
    const rows = [{ id: 1, owner: { id: 'u1', full_name: 'A' } }, { id: 2, owner: { id: 'u1', full_name: 'A' } }, { id: 3, owner: null }];
    const out = await attachUserContacts(rows, 'owner');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('admin_get_user_contacts', { p_user_ids: ['u1'] });
    expect(out[0].owner).toEqual({ id: 'u1', full_name: 'A', email: 'a@x', phone: '1' });
    expect(out[2].owner).toBeNull();
  });
  it('sin ids no llama a la RPC', async () => {
    expect(await attachUserContacts([{ owner: null }], 'owner')).toEqual([{ owner: null }]);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('si la RPC falla devuelve las filas, pero lo registra y emite el aviso', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'no admin' } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const seen = [];
    const onErr = (e) => seen.push(e.detail);
    window.addEventListener(ADMIN_CONTACTS_ERROR_EVENT, onErr);
    const rows = [{ owner: { id: 'u1', full_name: 'A' } }];
    expect(await attachUserContacts(rows, 'owner')).toEqual(rows);
    window.removeEventListener(ADMIN_CONTACTS_ERROR_EVENT, onErr);
    expect(spy).toHaveBeenCalledWith('[admin-contacts] admin_get_user_contacts falló', { code: '42501', message: 'no admin' });
    expect(seen).toEqual([{ code: '42501', message: 'no admin' }]);
    spy.mockRestore();
  });
});

describe('fetchOwnProfile', () => {
  it('usa get_my_profile y devuelve la primera fila', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'u1', email: 'a@x' }], error: null });
    expect(await fetchOwnProfile('u1')).toEqual({ data: { id: 'u1', email: 'a@x' }, error: null });
    expect(single).not.toHaveBeenCalled();
  });
  it('cae a select(*) si la RPC aún no existe', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    single.mockResolvedValue({ data: { id: 'u1' }, error: null });
    expect(await fetchOwnProfile('u1')).toEqual({ data: { id: 'u1' }, error: null });
  });
  it('propaga otros errores sin respaldo', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '500' } });
    expect((await fetchOwnProfile('u1')).error).toEqual({ code: '500' });
    expect(single).not.toHaveBeenCalled();
  });
});
