import type { Mat2, Vec2 } from './types';
import { EPS, approxEq, isZero } from './tolerance';
import { normalize, toRadians, vec } from './vec';

export const IDENTITY: Mat2 = { a: 1, b: 0, c: 0, d: 1 };
export const ZERO_MAT: Mat2 = { a: 0, b: 0, c: 0, d: 0 };

export function mat(a: number, b: number, c: number, d: number): Mat2 {
  return { a, b, c, d };
}

/** Builds a matrix from the images of i-hat and j-hat — its two columns. */
export function fromColumns(col1: Vec2, col2: Vec2): Mat2 {
  return { a: col1.x, b: col2.x, c: col1.y, d: col2.y };
}

/** `[A e1, A e2]` — where the basis vectors land. */
export function columns(m: Mat2): [Vec2, Vec2] {
  return [
    { x: m.a, y: m.c },
    { x: m.b, y: m.d },
  ];
}

export function rows(m: Mat2): [Vec2, Vec2] {
  return [
    { x: m.a, y: m.b },
    { x: m.c, y: m.d },
  ];
}

/** `A v`, with `v` as a column vector. */
export function apply(m: Mat2, v: Vec2): Vec2 {
  return { x: m.a * v.x + m.b * v.y, y: m.c * v.x + m.d * v.y };
}

/**
 * `A B`. Note the order: to apply `A` first and then `B`, call
 * `multiply(B, A)`.
 */
export function multiply(a: Mat2, b: Mat2): Mat2 {
  return {
    a: a.a * b.a + a.b * b.c,
    b: a.a * b.b + a.b * b.d,
    c: a.c * b.a + a.d * b.c,
    d: a.c * b.b + a.d * b.d,
  };
}

/** Composes left to right: `compose(A, B, C)` applies A, then B, then C. */
export function compose(...ms: Mat2[]): Mat2 {
  return ms.reduce((acc, m) => multiply(m, acc), IDENTITY);
}

export function det(m: Mat2): number {
  return m.a * m.d - m.b * m.c;
}

export function trace(m: Mat2): number {
  return m.a + m.d;
}

export function transpose(m: Mat2): Mat2 {
  return { a: m.a, b: m.c, c: m.b, d: m.d };
}

export function addMat(x: Mat2, y: Mat2): Mat2 {
  return { a: x.a + y.a, b: x.b + y.b, c: x.c + y.c, d: x.d + y.d };
}

export function subMat(x: Mat2, y: Mat2): Mat2 {
  return { a: x.a - y.a, b: x.b - y.b, c: x.c - y.c, d: x.d - y.d };
}

export function scaleMat(m: Mat2, s: number): Mat2 {
  return { a: m.a * s, b: m.b * s, c: m.c * s, d: m.d * s };
}

export function isSingular(m: Mat2, eps: number = EPS): boolean {
  return isZero(det(m), eps);
}

/** `A^-1`, or `null` when `A` is singular. */
export function inverse(m: Mat2, eps: number = EPS): Mat2 | null {
  const D = det(m);
  if (isZero(D, eps)) return null;
  return { a: m.d / D, b: -m.b / D, c: -m.c / D, d: m.a / D };
}

/** `A^n` for integer `n >= 0`, by repeated squaring. Negative `n` inverts first. */
export function power(m: Mat2, n: number): Mat2 | null {
  if (!Number.isInteger(n)) throw new Error('power: n must be an integer');
  if (n < 0) {
    const inv = inverse(m);
    return inv === null ? null : power(inv, -n);
  }
  let result = IDENTITY;
  let base = m;
  let k = n;
  while (k > 0) {
    if (k & 1) result = multiply(result, base);
    base = multiply(base, base);
    k >>= 1;
  }
  return result;
}

export function eqMat(x: Mat2, y: Mat2, eps: number = EPS): boolean {
  return (
    approxEq(x.a, y.a, eps) &&
    approxEq(x.b, y.b, eps) &&
    approxEq(x.c, y.c, eps) &&
    approxEq(x.d, y.d, eps)
  );
}

/** Entry-by-entry blend. `lerpMat(I, A, t)` is the default morph path. */
export function lerpMat(x: Mat2, y: Mat2, t: number): Mat2 {
  return {
    a: x.a + (y.a - x.a) * t,
    b: x.b + (y.b - x.b) * t,
    c: x.c + (y.c - x.c) * t,
    d: x.d + (y.d - x.d) * t,
  };
}

/** Counter-clockwise rotation by `radians`. */
export function rotation(radians: number): Mat2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { a: cos, b: -sin, c: sin, d: cos };
}

export function rotationDeg(degrees: number): Mat2 {
  return rotation(toRadians(degrees));
}

export function scaling(sx: number, sy: number = sx): Mat2 {
  return { a: sx, b: 0, c: 0, d: sy };
}

export function shearX(k: number): Mat2 {
  return { a: 1, b: k, c: 0, d: 1 };
}

export function shearY(k: number): Mat2 {
  return { a: 1, b: 0, c: k, d: 1 };
}

/** Reflection across the line through the origin at `radians` from the +x axis. */
export function reflection(radians: number): Mat2 {
  const cos = Math.cos(2 * radians);
  const sin = Math.sin(2 * radians);
  return { a: cos, b: sin, c: sin, d: -cos };
}

/** Orthogonal projection onto the line through the origin at `radians`. */
export function projection(radians: number): Mat2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { a: cos * cos, b: cos * sin, c: cos * sin, d: sin * sin };
}

export function isSymmetric(m: Mat2, eps: number = EPS): boolean {
  return approxEq(m.b, m.c, eps);
}

/** Upper or lower triangular — the case where eigenvalues sit on the diagonal. */
export function isTriangular(m: Mat2, eps: number = EPS): boolean {
  return isZero(m.b, eps) || isZero(m.c, eps);
}

export function isDiagonal(m: Mat2, eps: number = EPS): boolean {
  return isZero(m.b, eps) && isZero(m.c, eps);
}

/** `A = cI`. Returns the scalar `c`, or `null`. */
export function scalarOf(m: Mat2, eps: number = EPS): number | null {
  if (!isZero(m.b, eps) || !isZero(m.c, eps)) return null;
  if (!approxEq(m.a, m.d, eps)) return null;
  return (m.a + m.d) / 2;
}

/** `A^T A = I`: lengths and angles preserved (a rotation or a reflection). */
export function isOrthogonal(m: Mat2, eps: number = EPS): boolean {
  return eqMat(multiply(transpose(m), m), IDENTITY, eps);
}

export function isRotation(m: Mat2, eps: number = EPS): boolean {
  return isOrthogonal(m, eps) && approxEq(det(m), 1, eps);
}

export function isReflection(m: Mat2, eps: number = EPS): boolean {
  return isOrthogonal(m, eps) && approxEq(det(m), -1, eps);
}

/**
 * A rotation composed with a uniform scale: `[s*cos, -s*sin; s*sin, s*cos]`.
 * These are exactly the matrices whose morph should follow an arc rather than a
 * straight line, so the grid turns instead of shrinking through the middle.
 */
export function similarityOf(m: Mat2, eps: number = EPS): { scale: number; angle: number } | null {
  if (!approxEq(m.a, m.d, eps) || !approxEq(m.b, -m.c, eps)) return null;
  const s = Math.hypot(m.a, m.c);
  if (isZero(s, eps)) return null;
  return { scale: s, angle: Math.atan2(m.c, m.a) };
}

/** Rank: 2, 1 or 0. */
export function rank(m: Mat2, eps: number = EPS): 0 | 1 | 2 {
  if (!isZero(det(m), eps)) return 2;
  if (eqMat(m, ZERO_MAT, eps)) return 0;
  return 1;
}

/**
 * A unit vector spanning the null space of a singular matrix, or `null` when
 * the matrix is invertible. For the zero matrix (rank 0) the whole plane is the
 * null space, so i-hat is returned as a representative.
 */
export function nullSpaceDirection(m: Mat2, eps: number = EPS): Vec2 | null {
  const r = rank(m, eps);
  if (r === 2) return null;
  if (r === 0) return vec(1, 0);
  // Rank 1: the rows are parallel, so pick the longer one and take its normal.
  const [r1, r2] = rows(m);
  const row = Math.hypot(r1.x, r1.y) >= Math.hypot(r2.x, r2.y) ? r1 : r2;
  return normalize(vec(-row.y, row.x));
}

/**
 * A unit vector spanning the column space (the line everything collapses onto)
 * of a rank-1 matrix, or `null` otherwise.
 */
export function columnSpaceDirection(m: Mat2, eps: number = EPS): Vec2 | null {
  if (rank(m, eps) !== 1) return null;
  const [c1, c2] = columns(m);
  const col = Math.hypot(c1.x, c1.y) >= Math.hypot(c2.x, c2.y) ? c1 : c2;
  return normalize(col);
}
