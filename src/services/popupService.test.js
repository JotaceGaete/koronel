import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import { popupService } from './popupService';

// Encadenable (select/eq/or/order/limit) con terminal .single() — igual que
// el query builder real de Supabase.
function makePopupBuilder(result) {
  const builder = {};
  ['select', 'eq', 'or', 'order', 'limit']?.forEach((method) => {
    builder[method] = vi.fn(() => builder);
  });
  builder.single = vi.fn(() => Promise.resolve(result));
  return builder;
}

describe('popupService.getActivePopup — filtrado por city_id (Fase 4 / B7)', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn')?.mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
  });

  it('acepta la firma por objeto { communityCityId } y filtra por city_id exactamente una vez', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makePopupBuilder({ data: { id: 'popup-1' }, error: null });
    supabase?.from?.mockImplementation((table) => {
      expect(table)?.toBe('popups');
      return builder;
    });

    await popupService?.getActivePopup({ communityCityId: cityId });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(1);
    expect(cityCalls?.[0])?.toEqual(['city_id', cityId]);
  });

  it('conserva select, active=true, las ventanas de vigencia (starts_at/ends_at), el orden y el límite existentes junto al filtro de ciudad', async () => {
    const cityId = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const builder = makePopupBuilder({ data: null, error: null });
    supabase?.from?.mockImplementation(() => builder);

    await popupService?.getActivePopup({ communityCityId: cityId });

    expect(builder?.select)?.toHaveBeenCalledWith('*');
    expect(builder?.eq)?.toHaveBeenCalledWith('active', true);
    expect(builder?.or)?.toHaveBeenCalledWith(expect.stringContaining('starts_at.is.null,starts_at.lte.'));
    expect(builder?.or)?.toHaveBeenCalledWith(expect.stringContaining('ends_at.is.null,ends_at.gte.'));
    expect(builder?.order)?.toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder?.limit)?.toHaveBeenCalledWith(1);
  });

  it('con communityCityId null: sin filtro territorial, emite el warning centralizado, y conserva el comportamiento previo', async () => {
    const builder = makePopupBuilder({ data: { id: 'popup-1' }, error: null });
    supabase?.from?.mockImplementation(() => builder);

    const result = await popupService?.getActivePopup({ communityCityId: null });

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
    expect(warnSpy?.mock?.calls?.[0]?.[0])?.toContain('popupService.getActivePopup');
    expect(result?.data)?.toEqual({ id: 'popup-1' });
    expect(result?.error)?.toBeNull();
  });

  it('sin argumentos (parámetro omitido → default null): mismo comportamiento que pasarlo explícito', async () => {
    const builder = makePopupBuilder({ data: null, error: null });
    supabase?.from?.mockImplementation(() => builder);

    await popupService?.getActivePopup();

    const cityCalls = builder?.eq?.mock?.calls?.filter(([col]) => col === 'city_id');
    expect(cityCalls)?.toHaveLength(0);
    expect(warnSpy)?.toHaveBeenCalledTimes(1);
  });

  it('sin popup activo (single() sin filas): devuelve data null sin lanzar excepción', async () => {
    const builder = makePopupBuilder({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
    });
    supabase?.from?.mockImplementation(() => builder);

    const result = await popupService?.getActivePopup({ communityCityId: '8aa2d628-719d-4810-9ee3-8efd230ab000' });

    expect(result?.data)?.toBeNull();
    expect(result?.error?.code)?.toBe('PGRST116');
  });

  it('error genérico de consulta se devuelve controlado, no lanza excepción', async () => {
    const builder = makePopupBuilder({ data: null, error: { code: '500', message: 'fail' } });
    supabase?.from?.mockImplementation(() => builder);

    const result = await popupService?.getActivePopup({ communityCityId: '8aa2d628-719d-4810-9ee3-8efd230ab000' });

    expect(result?.data)?.toBeNull();
    expect(result?.error)?.toEqual({ code: '500', message: 'fail' });
  });
});
