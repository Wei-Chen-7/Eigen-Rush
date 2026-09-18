import type { Mat2 } from '../math/types';
import { eigen } from '../math/eigen';

/** Difficulty tiers. Milestone 2 ships 1 and 2; 3 and 4 arrive later. */
export type Tier = 1 | 2 | 3 | 4;

export interface TierRules {
  readonly tier: Tier;
  /** Largest absolute entry the tier allows. */
  readonly maxEntry: number;
  /** Entries must be whole numbers. */
  readonly integerEntries: boolean;
  /** Eigenvalues must be whole numbers. */
  readonly integerEigenvalues: boolean;
  /** Defective (non-diagonalizable) matrices allowed. */
  readonly allowDefective: boolean;
  /** Complex eigenvalues allowed. */
  readonly allowComplex: boolean;
  /** Singular matrices allowed. */
  readonly allowSingular: boolean;
  /** How close to an eigen-direction counts as correct, in degrees. */
  readonly eigenToleranceDeg: number;
}

export const TIER_RULES: Record<Tier, TierRules> = {
  1: {
    tier: 1,
    maxEntry: 3,
    integerEntries: true,
    integerEigenvalues: true,
    // Shears are named tier-1 moves, and every shear is defective: lambda = 1
    // twice with a single eigen-direction. The brief lists shears in tier 1 and
    // also says to keep defective matrices out until tier 3, so the two rules
    // collide here. Reading: the defective rule guards the *general* matrix
    // tier, where a non-diagonalizable matrix turns up unannounced and teaches
    // nothing. A shear announces itself. The eigen hunt, the one mini-game where
    // a lone eigen-direction genuinely misleads, draws through
    // generateWithRealEigen and never sees one either way.
    allowDefective: true,
    allowComplex: true, // a quarter turn is a tier-1 move, and it has no real direction
    allowSingular: false,
    eigenToleranceDeg: 6,
  },
  2: {
    tier: 2,
    maxEntry: 4,
    integerEntries: true,
    integerEigenvalues: true,
    allowDefective: false,
    allowComplex: false,
    allowSingular: false,
    eigenToleranceDeg: 6,
  },
  3: {
    tier: 3,
    maxEntry: 4,
    integerEntries: false,
    integerEigenvalues: false,
    allowDefective: true,
    allowComplex: false,
    allowSingular: true,
    eigenToleranceDeg: 5,
  },
  4: {
    tier: 4,
    maxEntry: 4,
    integerEntries: false,
    integerEigenvalues: false,
    allowDefective: true,
    allowComplex: true,
    allowSingular: true,
    eigenToleranceDeg: 4,
  },
};

const isWhole = (x: number): boolean => Math.abs(x - Math.round(x)) < 1e-9;

/**
 * Checks a matrix against its tier's constraints. Every generator is tested
 * against this over a thousand samples, so a generator that drifts out of its
 * tier fails loudly rather than quietly making the game unfair.
 */
export function satisfiesTier(m: Mat2, tier: Tier): boolean {
  const rules = TIER_RULES[tier];
  const entries = [m.a, m.b, m.c, m.d];

  if (entries.some((e) => Math.abs(e) > rules.maxEntry + 1e-9)) return false;
  if (rules.integerEntries && !entries.every(isWhole)) return false;

  const e = eigen(m);
  if (e.kind === 'complex') return rules.allowComplex;
  if (e.defective && !rules.allowDefective) return false;
  if (rules.integerEigenvalues && !e.values.every(isWhole)) return false;
  if (!rules.allowSingular && e.values.some((v) => Math.abs(v) < 1e-9)) return false;

  return true;
}
