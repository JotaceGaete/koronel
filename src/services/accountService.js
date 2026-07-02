import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export const accountService = {

  // ── Leer el account del usuario autenticado ──────────────────────────────────
  async getMyAccount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: new Error('No autenticado') };

      const { data, error } = await supabase
        .from('account_members')
        .select('role, joined_at, accounts(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return { data: data ? { ...data.accounts, role: data.role } : null, error: null };
    } catch (err) {
      logger.error('accountService.getMyAccount error:', err);
      return { data: null, error: err };
    }
  },

  // ── Listar todos los accounts a los que pertenece el usuario ─────────────────
  async getMyAccounts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: [], error: new Error('No autenticado') };

      const { data, error } = await supabase
        .from('account_members')
        .select('role, joined_at, accounts(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return {
        data: (data || []).map(row => ({ ...row.accounts, role: row.role })),
        error: null,
      };
    } catch (err) {
      logger.error('accountService.getMyAccounts error:', err);
      return { data: [], error: err };
    }
  },

  // ── Obtener account por id ───────────────────────────────────────────────────
  async getById(accountId) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error('accountService.getById error:', err);
      return { data: null, error: err };
    }
  },

  // ── Listar miembros de un account ────────────────────────────────────────────
  async getMembers(accountId) {
    try {
      const { data, error } = await supabase
        .from('account_members')
        .select('id, role, joined_at, user_id')
        .eq('account_id', accountId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      logger.error('accountService.getMembers error:', err);
      return { data: [], error: err };
    }
  },

  // ── Actualizar nombre o tipo de account ──────────────────────────────────────
  async update(accountId, updates) {
    const allowed = ['name', 'type'];
    const safe = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k))
    );

    try {
      const { data, error } = await supabase
        .from('accounts')
        .update(safe)
        .eq('id', accountId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error('accountService.update error:', err);
      return { data: null, error: err };
    }
  },

  // ── Productos del ecosistema ─────────────────────────────────────────────────
  async getProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      logger.error('accountService.getProducts error:', err);
      return { data: [], error: err };
    }
  },

  // ── Obtener el account_id primario para un usuario ───────────────────────────
  // Util interna: otros servicios llaman esto para saber a qué account pertenece
  // el usuario antes de ejecutar operaciones del Motor Económico.
  async getPrimaryAccountId(userId) {
    try {
      const { data, error } = await supabase
        .from('account_members')
        .select('account_id')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return { data: data?.account_id || null, error: null };
    } catch (err) {
      logger.error('accountService.getPrimaryAccountId error:', err);
      return { data: null, error: err };
    }
  },
};
