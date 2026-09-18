import type { Mat2 } from '../math/types';
import { mat, rotationDeg, scaling, shearX, shearY, reflection } from '../math/mat';
import { eigen, fromEigen } from '../math/eigen';
import { drawUntil, pick, randInt, shuffle, type Rng } from '../math/rng';
import { satisfiesTier, type Tier } from './tiers';

/** A generated matrix, with the name of the move when it has one. */
export interface GeneratedMatrix {
  readonly matrix: Mat2;
  readonly tier: Tier;
  /** A short name, for tier-1 named transforms. Empty for general matrices. */
  readonly name: string;
}

/**
 * Tier 1: named transforms with small integers — quarter turns, shears, axis
 * scalings and reflections. These are the moves worth recognising on sight.
 */
export function generateTier1(rng: Rng): GeneratedMatrix {
  const kind = pick(rng, ['rotation', 'shear', 'scaling', 'reflection'] as const);

  switch (kind) {
    case 'rotation': {
      const deg = pick(rng, [90, 180, 270]);
      return { matrix: roundMat(rotationDeg(deg)), tier: 1, name: `Rotation by ${deg}°` };
    }
    case 'shear': {
      const k = pick(rng, [-2, -1, 1, 2]);
      const horizontal = rng() < 0.5;
      return {
        matrix: horizontal ? shearX(k) : shearY(k),
        tier: 1,
        name: `${horizontal ? 'Horizontal' : 'Vertical'} shear by ${k}`,
      };
    }
    case 'scaling': {
      // Never (1, 1) — that is the identity, and nothing happening is not a round.
      const [sx, sy] = drawUntil(
        () => [pick(rng, [-2, -1, 2, 3]), pick(rng, [-2, -1, 1, 2, 3])] as const,
        ([x, y]) => !(x === 1 && y === 1),
      );
      return { matrix: scaling(sx, sy), tier: 1, name: `Scale x by ${sx}, y by ${sy}` };
    }
    case 'reflection': {
      const deg = pick(rng, [0, 45, 90, 135]);
      return {
        matrix: roundMat(reflection((deg * Math.PI) / 180)),
        tier: 1,
        name: `Reflection across the ${deg}° line`,
      };
    }
  }
}

/**
 * Tier 2: general integer matrices with entries in [-4, 4] and integer
 * eigenvalues.
 *
 * Built as `A = P D P^-1` with `D` integer diagonal and `P` an integer matrix
 * with `det P = ±1`, which keeps `A` integer. Results outside the tier's entry
 * range are rejected and redrawn — that is why the unimodular list is small and
 * the eigenvalues stay modest, or almost everything would be thrown away.
 */
export function generateTier2(rng: Rng): GeneratedMatrix {
  const matrix = drawUntil(
    () => {
      const P = pick(rng, UNIMODULAR);
      const l1 = randInt(rng, -3, 3);
      const l2 = randInt(rng, -3, 3);
      return fromEigen(P, l1, l2);
    },
    (m): m is Mat2 => m !== null && satisfiesTier(m, 2) && !isBoring(m),
  );
  return { matrix, tier: 2, name: '' };
}

/** Integer matrices with `det = ±1`, so `P D P^-1` stays integer. */
const UNIMODULAR: readonly Mat2[] = [
  mat(1, 1, 0, 1),
  mat(1, -1, 0, 1),
  mat(1, 0, 1, 1),
  mat(1, 0, -1, 1),
  mat(0, -1, 1, 0),
  mat(0, 1, -1, 0),
  mat(2, 1, 1, 1),
  mat(1, 1, 1, 2),
  mat(1, 2, 0, 1),
  mat(1, 0, 2, 1),
  mat(2, -1, -1, 1),
  mat(1, 1, -1, 0),
];

/**
 * Rejects rounds that teach nothing: the identity, the zero matrix, and any
 * multiple of the identity, where every question has the same dull answer.
 */
function isBoring(m: Mat2): boolean {
  const e = eigen(m);
  return e.kind === 'real' && e.scalar;
}

/** Kills the -0 and 1e-17 that trig leaves behind on exact quarter turns. */
function roundMat(m: Mat2): Mat2 {
  const r = (x: number) => {
    const v = Math.round(x * 1e9) / 1e9;
    return v === 0 ? 0 : v;
  };
  return mat(r(m.a), r(m.b), r(m.c), r(m.d));
}

/** Draws a matrix for the given tier. */
export function generateMatrix(rng: Rng, tier: Tier): GeneratedMatrix {
  return tier === 1 ? generateTier1(rng) : generateTier2(rng);
}

/**
 * A matrix for a round that needs a real eigen-direction to point at — used by
 * the eigen hunt, which would otherwise ask for something that is not there.
 */
export function generateWithRealEigen(rng: Rng, tier: Tier): GeneratedMatrix {
  return drawUntil(
    () => generateMatrix(rng, tier),
    (g) => {
      const e = eigen(g.matrix);
      return e.kind === 'real' && !e.defective;
    },
  );
}

/** A matrix with no real eigen-direction, so "no real direction" is the answer. */
export function generateRotationLike(rng: Rng): GeneratedMatrix {
  const deg = pick(rng, [90, 270]);
  return { matrix: roundMat(rotationDeg(deg)), tier: 1, name: `Rotation by ${deg}°` };
}

export { shuffle };
