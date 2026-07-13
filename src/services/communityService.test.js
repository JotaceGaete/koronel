import { describe, it, expect } from 'vitest';
import { communityService } from './communityService';

describe('communityService.extractTrendingWords', () => {
  it('returns words that repeat across titles, most frequent first', () => {
    const titles = [
      '¿Dónde encontrar un buen mecánico en Centro?',
      'Recomiendan un mecánico de confianza en Lagunillas',
      'Busco mecánico para camioneta',
      'Alguien sabe de un dentista bueno',
    ];
    const result = communityService?.extractTrendingWords(titles, 6);
    const words = result?.map(r => r?.word);
    expect(words).toContain('mecanico');
    expect(result?.[0]?.word).toBe('mecanico');
    expect(result?.[0]?.count).toBe(3);
  });

  it('ignores words that only appear once', () => {
    const titles = ['Pregunta única sobre plomería', 'Otra pregunta distinta sobre jardinería'];
    const result = communityService?.extractTrendingWords(titles, 6);
    expect(result?.find(r => r?.word === 'plomeria')).toBeUndefined();
  });

  it('handles empty input without throwing', () => {
    expect(communityService?.extractTrendingWords([], 6)).toEqual([]);
    expect(communityService?.extractTrendingWords(undefined, 6)).toEqual([]);
  });
});
