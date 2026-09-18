/**
 * Shared numeric tolerances. Every "is this zero?" decision in the codebase goes
 * through here so that the math core, the generators and the answer checkers all
 * agree on what counts as equal.
 */

/** Default absolute/relative tolerance for scalar comparisons. */
export const EPS = 1e-9;

/** Looser tolerance for values that have been through an SVD-ish chain of ops. */
export const LOOSE_EPS = 1e-6;

/** True when `x` is within `eps` of zero. */
export function isZero(x: number, eps: number = EPS): boolean {
  return Math.abs(x) <= eps;
}

/**
 * Mixed absolute/relative comparison. Absolute near zero, relative once the
 * magnitudes grow, so `approxEq(1e12, 1e12 + 1)` is still true.
 */
export function approxEq(x: number, y: number, eps: number = EPS): boolean {
  if (x === y) return true;
  const diff = Math.abs(x - y);
  if (diff <= eps) return true;
  return diff <= eps * Math.max(Math.abs(x), Math.abs(y));
}

/** Rounds to `digits` decimal places, avoiding `-0`. */
export function round(x: number, digits = 6): number {
  const f = 10 ** digits;
  const r = Math.round(x * f) / f;
  return r === 0 ? 0 : r;
}

/** True when `x` is a whole number to within `eps`. */
export function isInteger(x: number, eps: number = EPS): boolean {
  return Math.abs(x - Math.round(x)) <= eps;
}

/** Clamps `x` into `[lo, hi]`. */
export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}
