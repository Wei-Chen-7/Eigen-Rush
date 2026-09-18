import { describe, expect, it } from 'vitest';
import {
  addMat,
  apply,
  columnSpaceDirection,
  columns,
  compose,
  det,
  eqMat,
  fromColumns,
  IDENTITY,
  inverse,
  isDiagonal,
  isOrthogonal,
  isReflection,
  isRotation,
  isSingular,
  isSymmetric,
  isTriangular,
  lerpMat,
  mat,
  multiply,
  nullSpaceDirection,
  power,
  projection,
  rank,
  reflection,
  rotationDeg,
  rows,
  scalarOf,
  scaleMat,
  scaling,
  shearX,
  shearY,
  similarityOf,
  subMat,
  trace,
  transpose,
  ZERO_MAT,
} from './mat';
import { I_HAT, J_HAT, eqVec, isParallel, isZeroVec, length, vec } from './vec';
import { makeRng, randIntMat } from './testing';

describe('columns are where the basis vectors land', () => {
  it('matches A e1 and A e2', () => {
    const A = mat(1, 2, 3, 4);
    const [c1, c2] = columns(A);
    expect(eqVec(c1, apply(A, I_HAT))).toBe(true);
    expect(eqVec(c2, apply(A, J_HAT))).toBe(true);
  });

  it('round-trips through fromColumns', () => {
    const A = mat(1, 2, 3, 4);
    const [c1, c2] = columns(A);
    expect(eqMat(fromColumns(c1, c2), A)).toBe(true);
  });

  it('reads rows in order', () => {
    expect(rows(mat(1, 2, 3, 4))).toEqual([vec(1, 2), vec(3, 4)]);
  });
});

describe('apply', () => {
  it('uses the column-vector convention A v', () => {
    // [1 2; 3 4] * (1, 1) = (3, 7), not (4, 6).
    expect(apply(mat(1, 2, 3, 4), vec(1, 1))).toEqual(vec(3, 7));
  });

  it('leaves the origin fixed', () => {
    expect(apply(mat(9, -3, 2, 7), vec(0, 0))).toEqual(vec(0, 0));
  });
});

describe('multiply and compose', () => {
  it('is not commutative', () => {
    const A = shearX(1);
    const B = rotationDeg(90);
    expect(eqMat(multiply(A, B), multiply(B, A))).toBe(false);
  });

  it('agrees with applying one matrix after the other', () => {
    const A = shearX(2);
    const B = scaling(3, -1);
    const v = vec(2, -3);
    // "A then B" is the product B A.
    expect(eqVec(apply(multiply(B, A), v), apply(B, apply(A, v)))).toBe(true);
  });

  it('composes left to right', () => {
    const A = shearX(2);
    const B = scaling(3, -1);
    const C = rotationDeg(90);
    expect(eqMat(compose(A, B, C), multiply(C, multiply(B, A)))).toBe(true);
    expect(eqMat(compose(), IDENTITY)).toBe(true);
  });

  it('keeps the identity neutral', () => {
    const A = mat(1, 2, 3, 4);
    expect(eqMat(multiply(A, IDENTITY), A)).toBe(true);
    expect(eqMat(multiply(IDENTITY, A), A)).toBe(true);
  });
});

describe('det and trace', () => {
  it('computes ad - bc', () => {
    expect(det(mat(1, 2, 3, 4))).toBe(-2);
    expect(det(IDENTITY)).toBe(1);
    expect(det(ZERO_MAT)).toBe(0);
  });

  it('is multiplicative', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 200; i++) {
      const A = randIntMat(rng);
      const B = randIntMat(rng);
      expect(det(multiply(A, B))).toBeCloseTo(det(A) * det(B), 9);
    }
  });

  it('is negative exactly when orientation flips', () => {
    expect(det(reflection(0))).toBeCloseTo(-1, 12);
    expect(det(rotationDeg(37))).toBeCloseTo(1, 12);
  });

  it('sums the diagonal', () => {
    expect(trace(mat(1, 2, 3, 4))).toBe(5);
  });

  it('is invariant under transpose', () => {
    const A = mat(1, 2, 3, 4);
    expect(det(transpose(A))).toBe(det(A));
    expect(trace(transpose(A))).toBe(trace(A));
  });
});

describe('inverse', () => {
  it('undoes the matrix', () => {
    const A = mat(1, 2, 3, 4);
    const inv = inverse(A);
    expect(inv).not.toBeNull();
    expect(eqMat(multiply(A, inv!), IDENTITY, 1e-9)).toBe(true);
    expect(eqMat(multiply(inv!, A), IDENTITY, 1e-9)).toBe(true);
  });

  it('returns null for a singular matrix', () => {
    expect(inverse(mat(1, 2, 2, 4))).toBeNull();
    expect(inverse(ZERO_MAT)).toBeNull();
  });

  it('returns null for a near-singular matrix inside tolerance', () => {
    expect(inverse(mat(1, 1, 1, 1 + 1e-15))).toBeNull();
  });
});

describe('power', () => {
  it('handles 0, 1 and n', () => {
    const A = mat(1, 1, 1, 0); // Fibonacci
    expect(eqMat(power(A, 0)!, IDENTITY)).toBe(true);
    expect(eqMat(power(A, 1)!, A)).toBe(true);
    // A^n = [F(n+1) F(n); F(n) F(n-1)]
    expect(power(A, 10)).toEqual({ a: 89, b: 55, c: 55, d: 34 });
  });

  it('handles negative exponents through the inverse', () => {
    const A = mat(2, 0, 0, 4);
    expect(eqMat(power(A, -1)!, inverse(A)!)).toBe(true);
    expect(power(ZERO_MAT, -1)).toBeNull();
  });

  it('rejects non-integers', () => {
    expect(() => power(IDENTITY, 1.5)).toThrow();
  });
});

describe('named transforms', () => {
  it('rotates counter-clockwise', () => {
    const r = apply(rotationDeg(90), I_HAT);
    expect(r.x).toBeCloseTo(0, 12);
    expect(r.y).toBeCloseTo(1, 12);
  });

  it('shears the right axis', () => {
    // A horizontal shear leaves i-hat alone and slides j-hat sideways.
    expect(eqVec(apply(shearX(2), I_HAT), I_HAT)).toBe(true);
    expect(eqVec(apply(shearX(2), J_HAT), vec(2, 1))).toBe(true);
    expect(eqVec(apply(shearY(2), I_HAT), vec(1, 2))).toBe(true);
    expect(eqVec(apply(shearY(2), J_HAT), J_HAT)).toBe(true);
  });

  it('reflects across the given line', () => {
    expect(eqVec(apply(reflection(0), J_HAT), vec(0, -1), 1e-12)).toBe(true);
    // Reflecting across the 45-degree line swaps the axes.
    expect(eqVec(apply(reflection(Math.PI / 4), I_HAT), J_HAT, 1e-12)).toBe(true);
  });

  it('makes reflections their own inverse', () => {
    const R = reflection(0.7);
    expect(eqMat(multiply(R, R), IDENTITY, 1e-12)).toBe(true);
  });

  it('projects idempotently onto a line', () => {
    const P = projection(Math.PI / 4);
    expect(eqMat(multiply(P, P), P, 1e-12)).toBe(true);
    expect(det(P)).toBeCloseTo(0, 12);
  });

  it('scales each axis', () => {
    expect(scaling(2)).toEqual(mat(2, 0, 0, 2));
    expect(apply(scaling(2, 3), vec(1, 1))).toEqual(vec(2, 3));
  });
});

describe('classification', () => {
  it('recognises symmetry, triangularity and diagonality', () => {
    expect(isSymmetric(mat(1, 2, 2, 3))).toBe(true);
    expect(isSymmetric(mat(1, 2, 5, 3))).toBe(false);
    expect(isTriangular(mat(1, 2, 0, 3))).toBe(true);
    expect(isTriangular(mat(1, 0, 5, 3))).toBe(true);
    expect(isTriangular(mat(1, 2, 5, 3))).toBe(false);
    expect(isDiagonal(mat(1, 0, 0, 3))).toBe(true);
  });

  it('recognises rotations and reflections', () => {
    expect(isRotation(rotationDeg(31))).toBe(true);
    expect(isReflection(rotationDeg(31))).toBe(false);
    expect(isReflection(reflection(0.31))).toBe(true);
    expect(isRotation(reflection(0.31))).toBe(false);
    expect(isOrthogonal(scaling(2))).toBe(false);
    expect(isRotation(IDENTITY)).toBe(true);
  });

  it('spots multiples of the identity', () => {
    expect(scalarOf(scaling(3))).toBe(3);
    expect(scalarOf(ZERO_MAT)).toBe(0);
    expect(scalarOf(scaling(3, 4))).toBeNull();
    expect(scalarOf(mat(3, 1, 0, 3))).toBeNull();
  });

  it('spots similarity transforms, which morph along an arc', () => {
    expect(similarityOf(rotationDeg(90))).toMatchObject({ scale: 1 });
    const s = similarityOf(scaleMat(rotationDeg(90), 2));
    expect(s?.scale).toBeCloseTo(2, 12);
    expect(s?.angle).toBeCloseTo(Math.PI / 2, 12);
    expect(similarityOf(shearX(1))).toBeNull();
    expect(similarityOf(reflection(0))).toBeNull();
    expect(similarityOf(ZERO_MAT)).toBeNull();
  });
});

describe('rank, null space and column space', () => {
  it('ranks 2, 1 and 0', () => {
    expect(rank(mat(1, 2, 3, 4))).toBe(2);
    expect(rank(mat(1, 2, 2, 4))).toBe(1);
    expect(rank(ZERO_MAT)).toBe(0);
    expect(isSingular(mat(1, 2, 2, 4))).toBe(true);
  });

  it('finds a null direction that really maps to zero', () => {
    const A = mat(1, 2, 2, 4);
    const n = nullSpaceDirection(A)!;
    expect(isZeroVec(apply(A, n), 1e-12)).toBe(true);
    expect(length(n)).toBeCloseTo(1, 12);
  });

  it('has no null direction when invertible', () => {
    expect(nullSpaceDirection(mat(1, 2, 3, 4))).toBeNull();
  });

  it('handles a rank-1 matrix with a zero row', () => {
    const A = mat(0, 0, 3, 6);
    const n = nullSpaceDirection(A)!;
    expect(isZeroVec(apply(A, n), 1e-12)).toBe(true);
  });

  it('returns a representative direction for the zero matrix', () => {
    expect(nullSpaceDirection(ZERO_MAT)).toEqual(vec(1, 0));
  });

  it('finds the line everything collapses onto', () => {
    const A = mat(1, 2, 2, 4);
    const img = columnSpaceDirection(A)!;
    expect(isParallel(img, apply(A, vec(1, 0)))).toBe(true);
    expect(columnSpaceDirection(mat(1, 2, 3, 4))).toBeNull();
    expect(columnSpaceDirection(ZERO_MAT)).toBeNull();
  });
});

describe('matrix arithmetic and blending', () => {
  it('adds, subtracts and scales entrywise', () => {
    expect(addMat(mat(1, 2, 3, 4), mat(1, 1, 1, 1))).toEqual(mat(2, 3, 4, 5));
    expect(subMat(mat(1, 2, 3, 4), mat(1, 1, 1, 1))).toEqual(mat(0, 1, 2, 3));
    expect(scaleMat(mat(1, 2, 3, 4), 2)).toEqual(mat(2, 4, 6, 8));
  });

  it('lerps exactly at the ends', () => {
    const A = mat(1, 2, 3, 4);
    expect(eqMat(lerpMat(IDENTITY, A, 0), IDENTITY)).toBe(true);
    expect(eqMat(lerpMat(IDENTITY, A, 1), A)).toBe(true);
  });
});
