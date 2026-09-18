import type { Mat2 } from './types';
import { LOOSE_EPS, approxEq, isZero } from './tolerance';
import {
  columns,
  det,
  eqMat,
  IDENTITY,
  isDiagonal,
  isReflection,
  isRotation,
  isTriangular,
  isSymmetric,
  rank,
  scalarOf,
  ZERO_MAT,
} from './mat';
import { eigen } from './eigen';
import { toDegrees } from './vec';

/** A short, plain-language name for what a matrix does to the plane. */
export function describe(m: Mat2, eps: number = LOOSE_EPS): string {
  if (eqMat(m, IDENTITY, eps)) return 'Identity — nothing moves';
  if (eqMat(m, ZERO_MAT, eps)) return 'Everything collapses to the origin';

  const s = scalarOf(m, eps);
  if (s !== null) {
    if (s < 0) return `Uniform scale by ${fmt(s)} — a scale and a half turn`;
    return s > 1 ? `Uniform scale by ${fmt(s)}` : `Uniform shrink by ${fmt(s)}`;
  }

  if (isRotation(m, eps)) {
    const [col1] = columns(m);
    return `Rotation by ${fmt(toDegrees(Math.atan2(col1.y, col1.x)))} degrees`;
  }
  if (isReflection(m, eps)) {
    const [col1] = columns(m);
    return `Reflection across a line at ${fmt(toDegrees(Math.atan2(col1.y, col1.x) / 2))} degrees`;
  }

  const r = rank(m, eps);
  if (r === 1) return 'Singular — the plane flattens onto a line';

  if (approxEq(m.a, 1, eps) && approxEq(m.d, 1, eps) && isZero(m.c, eps)) {
    return `Horizontal shear by ${fmt(m.b)}`;
  }
  if (approxEq(m.a, 1, eps) && approxEq(m.d, 1, eps) && isZero(m.b, eps)) {
    return `Vertical shear by ${fmt(m.c)}`;
  }
  if (isDiagonal(m, eps)) return `Axis scaling: x by ${fmt(m.a)}, y by ${fmt(m.d)}`;

  const e = eigen(m, eps);
  if (e.kind === 'complex') return 'Complex eigenvalues — it spirals, no direction is fixed';
  if (e.defective) return 'Defective — one repeated eigenvalue, only one eigen-direction';

  const flip = det(m) < 0 ? ', and it flips orientation' : '';
  if (isSymmetric(m, eps)) return `Symmetric — perpendicular eigen-directions${flip}`;
  if (isTriangular(m, eps)) return `Triangular — eigenvalues sit on the diagonal${flip}`;
  return `General transform${flip}`;
}

function fmt(x: number): string {
  const r = Math.round(x * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

/** Tags used by the power-up cards and by the one-line insights. */
export interface MatrixTraits {
  singular: boolean;
  flipsOrientation: boolean;
  symmetric: boolean;
  triangular: boolean;
  rotation: boolean;
  reflection: boolean;
  scalar: boolean;
  defective: boolean;
  complexEigen: boolean;
}

export function traits(m: Mat2, eps: number = LOOSE_EPS): MatrixTraits {
  const e = eigen(m, eps);
  return {
    singular: rank(m, eps) < 2,
    flipsOrientation: det(m) < -eps,
    symmetric: isSymmetric(m, eps),
    triangular: isTriangular(m, eps),
    rotation: isRotation(m, eps),
    reflection: isReflection(m, eps),
    scalar: scalarOf(m, eps) !== null,
    defective: e.kind === 'real' && e.defective,
    complexEigen: e.kind === 'complex',
  };
}
