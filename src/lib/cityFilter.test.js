import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyCityFilter } from './cityFilter';

function makeQuery(eqReturnValue) {
  return { eq: vi.fn(() => eqReturnValue) };
}

describe('applyCityFilter', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('con un UUID válido, llama a query.eq("city_id", uuid) exactamente una vez', () => {
    const uuid = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const filtered = { filtered: true };
    const query = makeQuery(filtered);

    applyCityFilter(query, uuid, { source: 'test.getAll' });

    expect(query.eq).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith('city_id', uuid);
  });

  it('con un UUID válido, devuelve exactamente el resultado retornado por .eq()', () => {
    const uuid = '8aa2d628-719d-4810-9ee3-8efd230ab000';
    const filtered = { filtered: true };
    const query = makeQuery(filtered);

    const result = applyCityFilter(query, uuid, { source: 'test.getAll' });

    expect(result).toBe(filtered);
  });

  it('con un UUID válido, no emite ningún warning', () => {
    const query = makeQuery({});
    applyCityFilter(query, '8aa2d628-719d-4810-9ee3-8efd230ab000', { source: 'test.getAll' });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  describe('sin ciudad (null, undefined, cadena vacía)', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['cadena vacía', ''],
    ])('con communityCityId %s: no llama .eq(), devuelve el mismo query, y emite un warning', (_label, value) => {
      const query = makeQuery({ should: 'not be returned' });

      const result = applyCityFilter(query, value, { source: 'test.getAll' });

      expect(query.eq).not.toHaveBeenCalled();
      expect(result).toBe(query);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('incluye el source recibido en el mensaje del warning', () => {
    const query = makeQuery({});
    applyCityFilter(query, null, { source: 'businessService.getAll' });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [message] = warnSpy.mock.calls[0];
    expect(message).toContain('businessService.getAll');
  });

  it('sin source (parámetro omitido), igual emite un único warning con un valor de fallback', () => {
    const query = makeQuery({});
    applyCityFilter(query, null);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [message] = warnSpy.mock.calls[0];
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });

  it('no modifica ni clona el objeto query cuando no hay ciudad — misma referencia, mismas claves', () => {
    const query = makeQuery({});
    const keysBefore = Object.keys(query);

    const result = applyCityFilter(query, null, { source: 'test.getAll' });

    expect(result).toBe(query);
    expect(Object.keys(result)).toEqual(keysBefore);
  });

  it('nunca lanza, ni con ciudad ni sin ciudad', () => {
    const query = makeQuery({});
    expect(() => applyCityFilter(query, '8aa2d628-719d-4810-9ee3-8efd230ab000', { source: 's' })).not.toThrow();
    expect(() => applyCityFilter(query, null, { source: 's' })).not.toThrow();
  });
});
