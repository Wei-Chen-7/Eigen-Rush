import { describe, expect, it } from 'vitest';
import {
  generateMatrix,
  generateRotationLike,
  generateTier1,
  generateTier2,
  generateWithRealEigen,
} from './matrices';
import { satisfiesTier, TIER_RULES } from './tiers';
import { makeRng } from '../math/rng';
import { eigen } from '../math/eigen';
import { det, eqMat, IDENTITY, trace } from '../math/mat';

const SAMPLES = 1000;

describe('tier 1 generator', () => {
  it('stays inside the tier over 1,000 samples', () => {
    const rng = makeRng(1);
    for (let i = 0; i < SAMPLES; i++) {
      const g = generateTier1(rng);
      expect(satisfiesTier(g.matrix, 1), `failed on ${JSON.stringify(g)}`).toBe(true);
    }
  });

  it('only ever emits whole-number entries', () => {
    const rng = makeRng(2);
    for (let i = 0; i < SAMPLES; i++) {
      const { matrix } = generateTier1(rng);
      for (const e of [matrix.a, matrix.b, matrix.c, matrix.d]) {
        expect(Number.isInteger(e)).toBe(true);
      }
    }
  });

  it('never hands out the identity — nothing happening is not a round', () => {
    const rng = makeRng(3);
    for (let i = 0; i < SAMPLES; i++) {
      expect(eqMat(generateTier1(rng).matrix, IDENTITY)).toBe(false);
    }
  });

  it('never leaves -0 or float dust on a quarter turn', () => {
    const rng = makeRng(4);
    for (let i = 0; i < SAMPLES; i++) {
      const { matrix } = generateTier1(rng);
      for (const e of [matrix.a, matrix.b, matrix.c, matrix.d]) {
        expect(Object.is(e, -0)).toBe(false);
      }
    }
  });

  it('always names the move', () => {
    const rng = makeRng(5);
    for (let i = 0; i < 200; i++) {
      expect(generateTier1(rng).name.length).toBeGreaterThan(0);
    }
  });

  it('covers all four families', () => {
    const rng = makeRng(6);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generateTier1(rng).name.split(' ')[0]!);
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
});

describe('tier 2 generator', () => {
  it('stays inside the tier over 1,000 samples', () => {
    const rng = makeRng(11);
    for (let i = 0; i < SAMPLES; i++) {
      const g = generateTier2(rng);
      expect(satisfiesTier(g.matrix, 2), `failed on ${JSON.stringify(g)}`).toBe(true);
    }
  });

  it('keeps every entry an integer inside [-4, 4]', () => {
    const rng = makeRng(12);
    for (let i = 0; i < SAMPLES; i++) {
      const { matrix } = generateTier2(rng);
      for (const e of [matrix.a, matrix.b, matrix.c, matrix.d]) {
        expect(Number.isInteger(e)).toBe(true);
        expect(Math.abs(e)).toBeLessThanOrEqual(TIER_RULES[2].maxEntry);
      }
    }
  });

  it('always has integer eigenvalues, which is the point of the tier', () => {
    const rng = makeRng(13);
    for (let i = 0; i < SAMPLES; i++) {
      const e = eigen(generateTier2(rng).matrix);
      expect(e.kind).toBe('real');
      if (e.kind !== 'real') continue;
      expect(Number.isInteger(Math.round(e.values[0] * 1e9) / 1e9)).toBe(true);
      expect(Number.isInteger(Math.round(e.values[1] * 1e9) / 1e9)).toBe(true);
    }
  });

  it('keeps defective matrices out — they belong to tier 3', () => {
    const rng = makeRng(14);
    for (let i = 0; i < SAMPLES; i++) {
      const e = eigen(generateTier2(rng).matrix);
      expect(e.kind === 'real' && e.defective).toBe(false);
    }
  });

  it('never hands out a multiple of the identity', () => {
    const rng = makeRng(15);
    for (let i = 0; i < SAMPLES; i++) {
      const e = eigen(generateTier2(rng).matrix);
      expect(e.kind === 'real' && e.scalar).toBe(false);
    }
  });

  it('keeps trace and det consistent with the eigenvalues it was built from', () => {
    const rng = makeRng(16);
    for (let i = 0; i < SAMPLES; i++) {
      const { matrix } = generateTier2(rng);
      const e = eigen(matrix);
      if (e.kind !== 'real') continue;
      expect(e.values[0] + e.values[1]).toBeCloseTo(trace(matrix), 8);
      expect(e.values[0] * e.values[1]).toBeCloseTo(det(matrix), 8);
    }
  });

  it('produces real variety, not the same handful of matrices', () => {
    const rng = makeRng(17);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const m = generateTier2(rng).matrix;
      seen.add(`${m.a},${m.b},${m.c},${m.d}`);
    }
    expect(seen.size).toBeGreaterThan(30);
  });
});

describe('specialised draws', () => {
  it('generateWithRealEigen always has a real, non-defective direction', () => {
    const rng = makeRng(21);
    for (const tier of [1, 2] as const) {
      for (let i = 0; i < 400; i++) {
        const e = eigen(generateWithRealEigen(rng, tier).matrix);
        expect(e.kind).toBe('real');
        if (e.kind === 'real') expect(e.defective).toBe(false);
      }
    }
  });

  it('generateRotationLike never has a real direction', () => {
    const rng = makeRng(22);
    for (let i = 0; i < 200; i++) {
      expect(eigen(generateRotationLike(rng).matrix).kind).toBe('complex');
    }
  });

  it('generateMatrix routes to the right tier', () => {
    const rng = makeRng(23);
    for (let i = 0; i < 300; i++) {
      expect(generateMatrix(rng, 1).tier).toBe(1);
      expect(generateMatrix(rng, 2).tier).toBe(2);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = generateMatrix(makeRng(99), 2);
    const b = generateMatrix(makeRng(99), 2);
    expect(a.matrix).toEqual(b.matrix);
  });
});

describe('satisfiesTier', () => {
  it('rejects entries outside the range', () => {
    expect(satisfiesTier({ a: 9, b: 0, c: 0, d: 1 }, 2)).toBe(false);
  });

  it('rejects non-integer entries in an integer tier', () => {
    expect(satisfiesTier({ a: 1.5, b: 0, c: 0, d: 2 }, 2)).toBe(false);
  });

  it('rejects non-integer eigenvalues in tier 2', () => {
    // [[1,1],[1,0]] has the golden ratio as an eigenvalue.
    expect(satisfiesTier({ a: 1, b: 1, c: 1, d: 0 }, 2)).toBe(false);
  });

  it('rejects defective matrices below tier 3', () => {
    expect(satisfiesTier({ a: 2, b: 1, c: 0, d: 2 }, 2)).toBe(false);
    expect(satisfiesTier({ a: 2, b: 1, c: 0, d: 2 }, 3)).toBe(true);
  });

  it('rejects singular matrices below tier 3', () => {
    expect(satisfiesTier({ a: 1, b: 2, c: 2, d: 4 }, 2)).toBe(false);
    expect(satisfiesTier({ a: 1, b: 2, c: 2, d: 4 }, 3)).toBe(true);
  });

  it('allows a quarter turn in tier 1 but not tier 2', () => {
    const quarter = { a: 0, b: -1, c: 1, d: 0 };
    expect(satisfiesTier(quarter, 1)).toBe(true);
    expect(satisfiesTier(quarter, 2)).toBe(false);
  });
});

describe('the shear exception', () => {
  it('lets tier 1 hold a defective shear, since a shear announces itself', () => {
    expect(satisfiesTier({ a: 1, b: 2, c: 0, d: 1 }, 1)).toBe(true);
  });

  it('still keeps defective matrices out of tier 2, the general-matrix tier', () => {
    expect(satisfiesTier({ a: 1, b: 2, c: 0, d: 1 }, 2)).toBe(false);
  });

  it('keeps them out of the eigen hunt at every tier below 3', () => {
    const rng = makeRng(77);
    for (let i = 0; i < 500; i++) {
      const e = eigen(generateWithRealEigen(rng, 1).matrix);
      expect(e.kind === 'real' && e.defective).toBe(false);
    }
  });
});
