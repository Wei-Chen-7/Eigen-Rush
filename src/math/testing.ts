import type { Mat2 } from './types';

/**
 * A tiny deterministic PRNG (mulberry32) so property tests are reproducible.
 * Never used in the game itself — the generators get their own seeded source.
 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in `[lo, hi]`, inclusive. */
export function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** A random integer matrix with entries in `[lo, hi]`. */
export function randIntMat(rng: () => number, lo = -4, hi = 4): Mat2 {
  return {
    a: randInt(rng, lo, hi),
    b: randInt(rng, lo, hi),
    c: randInt(rng, lo, hi),
    d: randInt(rng, lo, hi),
  };
}

/** A random real matrix with entries in `[-range, range]`. */
export function randRealMat(rng: () => number, range = 4): Mat2 {
  const e = () => (rng() * 2 - 1) * range;
  return { a: e(), b: e(), c: e(), d: e() };
}
