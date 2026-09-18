import type { Mat2 } from './types';
import { makeRng, randInt, type Rng } from './rng';

// Re-exported so tests keep importing their helpers from one place.
export { makeRng, randInt };
export type { Rng };

/** A random integer matrix with entries in `[lo, hi]`. */
export function randIntMat(rng: Rng, lo = -4, hi = 4): Mat2 {
  return {
    a: randInt(rng, lo, hi),
    b: randInt(rng, lo, hi),
    c: randInt(rng, lo, hi),
    d: randInt(rng, lo, hi),
  };
}

/** A random real matrix with entries in `[-range, range]`. */
export function randRealMat(rng: Rng, range = 4): Mat2 {
  const e = () => (rng() * 2 - 1) * range;
  return { a: e(), b: e(), c: e(), d: e() };
}
