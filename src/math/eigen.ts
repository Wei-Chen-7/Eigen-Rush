import type { Eigen, EigenComplex, EigenReal, Mat2, Vec2 } from './types';
import { LOOSE_EPS, isZero } from './tolerance';
import { det, scalarOf, trace } from './mat';
import { I_HAT, J_HAT, canonicalDirection, vec } from './vec';

/**
 * The characteristic polynomial is `lambda^2 - tr(A) lambda + det(A)`, so
 * everything below comes out of the discriminant `tr^2 - 4 det`.
 */
export function discriminant(m: Mat2): number {
  const t = trace(m);
  return t * t - 4 * det(m);
}

/** A scale-aware threshold for "is the discriminant zero?". */
function discriminantEps(m: Mat2, eps: number): number {
  const scale = Math.max(Math.abs(m.a), Math.abs(m.b), Math.abs(m.c), Math.abs(m.d), 1);
  return eps * scale * scale;
}

/**
 * A unit eigenvector for the real eigenvalue `lambda`, found by taking the null
 * space of `A - lambda I`. Returns `null` when `A - lambda I` is the zero matrix
 * (that is, `A = lambda I`), where every direction qualifies.
 */
export function eigenvectorFor(m: Mat2, lambda: number, eps: number = LOOSE_EPS): Vec2 | null {
  const a = m.a - lambda;
  const b = m.b;
  const c = m.c;
  const d = m.d - lambda;
  const scale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d));
  if (scale <= eps) return null;

  // Both rows annihilate the eigenvector; use whichever is longer, for stability.
  const row1 = Math.hypot(a, b);
  const row2 = Math.hypot(c, d);
  const v = row1 >= row2 ? vec(-b, a) : vec(-d, c);
  return canonicalDirection(v);
}

/**
 * Eigenvalues and eigenvectors of a 2x2 matrix.
 *
 * Real case: `values` is sorted descending and `vectors[i]` matches `values[i]`.
 * A defective matrix repeats its single eigenvector; `A = cI` reports i-hat and
 * j-hat but sets `scalar`, meaning any direction is correct.
 *
 * Complex case: no real invariant line — under repeated application the plane
 * spirals, growing by `modulus` and turning by `argument` each step.
 */
export function eigen(m: Mat2, eps: number = LOOSE_EPS): Eigen {
  const t = trace(m);
  const disc = discriminant(m);
  const dEps = discriminantEps(m, eps);

  if (disc < -dEps) {
    const im = Math.sqrt(-disc) / 2;
    const re = t / 2;
    const result: EigenComplex = {
      kind: 'complex',
      re,
      im,
      modulus: Math.hypot(re, im),
      argument: Math.atan2(im, re),
    };
    return result;
  }

  const scalar = scalarOf(m, eps);
  if (scalar !== null) {
    const result: EigenReal = {
      kind: 'real',
      values: [scalar, scalar],
      vectors: [I_HAT, J_HAT],
      defective: false,
      scalar: true,
    };
    return result;
  }

  if (isZero(disc, dEps)) {
    // Repeated eigenvalue, and we already know A is not a multiple of I, so the
    // eigenspace is one-dimensional: the matrix is defective.
    const lambda = t / 2;
    const v = eigenvectorFor(m, lambda, eps) ?? I_HAT;
    const result: EigenReal = {
      kind: 'real',
      values: [lambda, lambda],
      vectors: [v, v],
      defective: true,
      scalar: false,
    };
    return result;
  }

  const root = Math.sqrt(disc);
  const hi = (t + root) / 2;
  const lo = (t - root) / 2;
  const result: EigenReal = {
    kind: 'real',
    values: [hi, lo],
    vectors: [eigenvectorFor(m, hi, eps) ?? I_HAT, eigenvectorFor(m, lo, eps) ?? J_HAT],
    defective: false,
    scalar: false,
  };
  return result;
}

export function isReal(e: Eigen): e is EigenReal {
  return e.kind === 'real';
}

export function isComplex(e: Eigen): e is EigenComplex {
  return e.kind === 'complex';
}

/** True when `A` has no real eigenvector line (a rotation-like matrix). */
export function hasNoRealDirection(m: Mat2, eps: number = LOOSE_EPS): boolean {
  return eigen(m, eps).kind === 'complex';
}

/** The eigenvalue of largest magnitude, or `null` in the complex case. */
export function dominantEigenvalue(m: Mat2, eps: number = LOOSE_EPS): number | null {
  const e = eigen(m, eps);
  if (e.kind !== 'real') return null;
  const [l1, l2] = e.values;
  return Math.abs(l1) >= Math.abs(l2) ? l1 : l2;
}

/**
 * The direction that repeated application of `A` settles toward, or `null` when
 * there is no single dominant real direction (complex, defective, or a tie in
 * magnitude such as a reflection).
 */
export function dominantEigenvector(m: Mat2, eps: number = LOOSE_EPS): Vec2 | null {
  const e = eigen(m, eps);
  if (e.kind !== 'real' || e.defective || e.scalar) return null;
  const [l1, l2] = e.values;
  const [v1, v2] = e.vectors;
  if (Math.abs(Math.abs(l1) - Math.abs(l2)) <= eps * Math.max(1, Math.abs(l1))) return null;
  return Math.abs(l1) > Math.abs(l2) ? v1 : v2;
}

/**
 * Builds `A = P D P^-1`. With `D` diagonal and integer and `P` an integer matrix
 * with `det P = +/-1`, the result is an integer matrix with the chosen integer
 * eigenvalues — the recipe the tier-2 generators use.
 */
export function fromEigen(p: Mat2, lambda1: number, lambda2: number): Mat2 | null {
  const D = p.a * p.d - p.b * p.c;
  if (isZero(D)) return null;
  // P diag(l1, l2) P^-1, expanded so integer inputs stay exact.
  const a = (lambda1 * p.a * p.d - lambda2 * p.b * p.c) / D;
  const b = (p.a * p.b * (lambda2 - lambda1)) / D;
  const c = (p.c * p.d * (lambda1 - lambda2)) / D;
  const d = (lambda2 * p.a * p.d - lambda1 * p.b * p.c) / D;
  return { a, b, c, d };
}
