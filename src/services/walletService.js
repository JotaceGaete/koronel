// Motor Económico — capa de servicio
// Regla de dependencias: este módulo NO importa de Koronel, Walinka, IA ni Eventos.
// Todos los productos importan de walletService, nunca al revés.

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export const walletService = {

  // ── Saldo ────────────────────────────────────────────────────────────────────

  async getBalance(accountId) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance_purchased, balance_plan, balance_bonus, balance_total, reserved_total, lifetime_earned, lifetime_spent, plan_credits_at')
        .eq('account_id', accountId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { data: null, error: new Error('Wallet no encontrada') };

      return {
        data: {
          ...data,
          available: data.balance_total - data.reserved_total,
        },
        error: null,
      };
    } catch (err) {
      logger.error('walletService.getBalance error:', err);
      return { data: null, error: err };
    }
  },

  // ── Historial de movimientos ─────────────────────────────────────────────────

  async getTransactions(accountId, { limit = 30, offset = 0 } = {}) {
    try {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('account_id', accountId)
        .maybeSingle();

      if (!wallet) return { data: [], error: null };

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('id, credit_type, type, amount, balance_after, display_label, reference_type, reference_id, expires_at, created_at')
        .eq('wallet_id', wallet.id)
        .not('type', 'in', '("reserve","release")')  // solo movimientos visibles al usuario
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      logger.error('walletService.getTransactions error:', err);
      return { data: [], error: err };
    }
  },

  // ── Acreditar créditos (compra, plan, bonus) ─────────────────────────────────
  // Nota: en producción esta función se llama desde un webhook de pago verificado.
  // No se expone directamente al cliente.

  async credit({ accountId, creditType, amount, displayLabel, type, referenceType, referenceId, expiresAt, idempotencyKey, metadata = {} }) {
    try {
      const { data, error } = await supabase.rpc('fn_wallet_credit', {
        p_account_id:      accountId,
        p_credit_type:     creditType,
        p_amount:          amount,
        p_display_label:   displayLabel,
        p_type:            type,
        p_reference_type:  referenceType  ?? null,
        p_reference_id:    referenceId    ?? null,
        p_expires_at:      expiresAt      ?? null,
        p_idempotency_key: idempotencyKey ?? null,
        p_metadata:        metadata,
      });

      if (error) throw error;
      if (!data.ok) throw new Error(data.error);
      return { data, error: null };
    } catch (err) {
      logger.error('walletService.credit error:', err);
      return { data: null, error: err };
    }
  },

  // ── Reservar créditos para una operación en vuelo ────────────────────────────

  async reserve({ accountId, actionKey, referenceType, referenceId, idempotencyKey, metadata = {} }) {
    try {
      const { data, error } = await supabase.rpc('fn_wallet_reserve', {
        p_account_id:      accountId,
        p_action_key:      actionKey,
        p_reference_type:  referenceType  ?? null,
        p_reference_id:    referenceId    ?? null,
        p_idempotency_key: idempotencyKey ?? null,
        p_metadata:        metadata,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error('walletService.reserve error:', err);
      return { data: null, error: err };
    }
  },

  // ── Confirmar consumo (operación completada) ──────────────────────────────────

  async confirm({ consumptionId, displayLabel }) {
    try {
      const { data, error } = await supabase.rpc('fn_wallet_confirm', {
        p_consumption_id: consumptionId,
        p_display_label:  displayLabel ?? null,
      });

      if (error) throw error;
      if (!data.ok) throw new Error(data.error);
      return { data, error: null };
    } catch (err) {
      logger.error('walletService.confirm error:', err);
      return { data: null, error: err };
    }
  },

  // ── Liberar reserva (operación cancelada o fallida) ───────────────────────────

  async release({ consumptionId, failureReason }) {
    try {
      const { data, error } = await supabase.rpc('fn_wallet_release', {
        p_consumption_id: consumptionId,
        p_failure_reason: failureReason ?? null,
      });

      if (error) throw error;
      if (!data.ok) throw new Error(data.error);
      return { data, error: null };
    } catch (err) {
      logger.error('walletService.release error:', err);
      return { data: null, error: err };
    }
  },

  // ── Reglas de crédito ────────────────────────────────────────────────────────

  async getRules({ productKey } = {}) {
    try {
      let query = supabase
        .from('credit_rules')
        .select('id, action_key, credits_cost, display_label, description, category, products(key, name)')
        .eq('is_active', true)
        .order('category')
        .order('credits_cost');

      if (productKey) {
        query = query.eq('products.key', productKey);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      logger.error('walletService.getRules error:', err);
      return { data: [], error: err };
    }
  },

  async getRuleCost(actionKey) {
    try {
      const { data, error } = await supabase
        .from('credit_rules')
        .select('credits_cost, display_label, description')
        .eq('action_key', actionKey)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      logger.error('walletService.getRuleCost error:', err);
      return { data: null, error: err };
    }
  },

  // ── Paquetes de compra ───────────────────────────────────────────────────────

  async getPackages() {
    try {
      const { data, error } = await supabase
        .from('credit_packages')
        .select('id, name, tagline, credits, bonus_credits, price_clp, is_featured, sort_order')
        .eq('is_active', true)
        .or('valid_until.is.null,valid_until.gt.' + new Date().toISOString())
        .order('sort_order');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      logger.error('walletService.getPackages error:', err);
      return { data: [], error: err };
    }
  },

  // ── Capacidad estimada (traduce créditos a acciones concretas) ───────────────

  async getCapacityEstimate(balance) {
    try {
      const { data: rules } = await walletService.getRules();
      if (!rules?.length) return { data: [], error: null };

      const estimate = rules
        .filter(r => r.credits_cost > 0 && balance >= r.credits_cost)
        .map(r => ({
          action_key:   r.action_key,
          label:        r.description || r.display_label,
          count:        Math.floor(balance / r.credits_cost),
          credits_each: r.credits_cost,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return { data: estimate, error: null };
    } catch (err) {
      logger.error('walletService.getCapacityEstimate error:', err);
      return { data: [], error: err };
    }
  },

  // ── Plan benefits ────────────────────────────────────────────────────────────

  async getPlanBenefits() {
    try {
      const { data, error } = await supabase
        .from('plan_credit_benefits')
        .select('*')
        .order('credits');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      logger.error('walletService.getPlanBenefits error:', err);
      return { data: [], error: err };
    }
  },

  // ── Util: obtener wallet_id de una account (para admin/debug) ────────────────

  async getWalletId(accountId) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('id')
        .eq('account_id', accountId)
        .maybeSingle();

      if (error) throw error;
      return { data: data?.id ?? null, error: null };
    } catch (err) {
      logger.error('walletService.getWalletId error:', err);
      return { data: null, error: err };
    }
  },
};
