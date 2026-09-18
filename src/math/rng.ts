/**
 * A small deterministic PRNG (mulberry32) plus the picking helpers the
 * generators need. Seeded on purpose: a run can be replayed, and a failing
 * property test reproduces exactly.
 */
export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in `[lo, hi]`, inclusive. */
export function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** A uniformly chosen element. Throws on an empty list, which is always a bug. */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: nothing to choose from');
  return items[Math.floor(rng() * items.length)]!;
}

/** True with probability `p`. */
export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

/** A shuffled copy (Fisher-Yates). The input is left alone. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Draws until `accept` says yes. Generators reject a lot (out-of-range entries,
 * defective matrices below tier 3), so this caps the work and reports the bug
 * rather than spinning forever.
 *
 * The first overload lets a type guard narrow the result, so a generator that
 * draws `Mat2 | null` and accepts only non-null hands back a plain `Mat2`.
 */
export function drawUntil<T, U extends T>(
  make: () => T,
  accept: (value: T) => value is U,
  tries?: number,
): U;
export function drawUntil<T>(make: () => T, accept: (value: T) => boolean, tries?: number): T;
export function drawUntil<T>(make: () => T, accept: (value: T) => boolean, tries = 200): T {
  for (let i = 0; i < tries; i++) {
    const value = make();
    if (accept(value)) return value;
  }
  throw new Error(`drawUntil: no acceptable value in ${tries} tries`);
}
