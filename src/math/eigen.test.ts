import { describe, expect, it } from 'vitest';
import {
  discriminant,
  dominantEigenvalue,
  dominantEigenvector,
  eigen,
  eigenvectorFor,
  fromEigen,
  hasNoRealDirection,
  isComplex,
  isReal,
} from './eigen';
import {
  IDENTITY,
  ZERO_MAT,
  apply,
  det,
  mat,
  projection,
  reflection,
  rotationDeg,
  scaling,
  shearX,
  trace,
} from './mat';
import { I_HAT, eqVec, isParallel, length, sub, scale as scaleVec, vec } from './vec';
import { makeRng, randIntMat, randRealMat } from './testing';
import { LOOSE_EPS } from './tolerance';

describe('distinct real eigenvalues', () => {
  it('solves a simple symmetric matrix', () => {
    const e = eigen(mat(2, 1, 1, 2));
    expect(isReal(e)).toBe(true);
    if (!isReal(e)) return;
    expect(e.values[0]).toBeCloseTo(3, 9);
    expect(e.values[1]).toBeCloseTo(1, 9);
    expect(e.defective).toBe(false);
    expect(e.scalar).toBe(false);
    expect(isParallel(e.vectors[0], vec(1, 1))).toBe(true);
    expect(isParallel(e.vectors[1], vec(1, -1))).toBe(true);
  });

  it('sorts values descending and matches vectors by index', () => {
    const A = mat(1, 2, 3, 4);
    const e = eigen(A);
    if (!isReal(e)) throw new Error('expected real');
    expect(e.values[0]).toBeGreaterThan(e.values[1]);
    for (let i = 0; i < 2; i++) {
      const v = e.vectors[i]!;
      const lambda = e.values[i]!;
      expect(length(sub(apply(A, v), scaleVec(v, lambda)))).toBeLessThan(1e-9);
    }
  });

  it('returns unit eigenvectors', () => {
    const e = eigen(mat(1, 2, 3, 4));
    if (!isReal(e)) throw new Error('expected real');
    expect(length(e.vectors[0])).toBeCloseTo(1, 12);
    expect(length(e.vectors[1])).toBeCloseTo(1, 12);
  });

  it('reads eigenvalues straight off a triangular diagonal', () => {
    const e = eigen(mat(3, 7, 0, -2));
    if (!isReal(e)) throw new Error('expected real');
    expect([...e.values].sort((x, y) => x - y)).toEqual([-2, 3]);
  });
});

describe('singular matrices', () => {
  it('gives a zero eigenvalue whose eigenvector is the null direction', () => {
    const A = mat(1, 2, 2, 4);
    const e = eigen(A);
    if (!isReal(e)) throw new Error('expected real');
    expect(e.values[1]).toBeCloseTo(0, 9);
    expect(e.values[0]).toBeCloseTo(5, 9);
    expect(length(apply(A, e.vectors[1]))).toBeLessThan(1e-9);
  });

  it('handles a projection: eigenvalues 1 and 0', () => {
    const e = eigen(projection(Math.PI / 3));
    if (!isReal(e)) throw new Error('expected real');
    expect(e.values[0]).toBeCloseTo(1, 9);
    expect(e.values[1]).toBeCloseTo(0, 9);
  });

  it('handles the zero matrix as a scalar multiple of I', () => {
    const e = eigen(ZERO_MAT);
    if (!isReal(e)) throw new Error('expected real');
    expect(e.values).toEqual([0, 0]);
    expect(e.scalar).toBe(true);
    expect(e.defective).toBe(false);
  });
});

describe('A = cI', () => {
  it('reports every direction as an eigenvector', () => {
    const e = eigen(scaling(3));
    if (!isReal(e)) throw new Error('expected real');
    expect(e.scalar).toBe(true);
    expect(e.defective).toBe(false);
    expect(e.values).toEqual([3, 3]);
    expect(e.vectors[0]).toEqual({ x: 1, y: 0 });
    expect(e.vectors[1]).toEqual({ x: 0, y: 1 });
  });

  it('treats the identity the same way', () => {
    const e = eigen(IDENTITY);
    if (!isReal(e)) throw new Error('expected real');
    expect(e.scalar).toBe(true);
    expect(e.values).toEqual([1, 1]);
  });
});

describe('defective matrices', () => {
  it('flags a shear as defective with one eigen-direction', () => {
    const e = eigen(shearX(1));
    if (!isReal(e)) throw new Error('expected real');
    expect(e.defective).toBe(true);
    expect(e.scalar).toBe(false);
    expect(e.values).toEqual([1, 1]);
    expect(isParallel(e.vectors[0], I_HAT)).toBe(true);
    expect(eqVec(e.vectors[0], e.vectors[1])).toBe(true);
  });

  it('flags a general repeated-eigenvalue matrix as defective', () => {
    // [2 1; 0 2] has lambda = 2 twice but only one eigen-direction.
    const e = eigen(mat(2, 1, 0, 2));
    if (!isReal(e)) throw new Error('expected real');
    expect(e.defective).toBe(true);
    expect(e.values).toEqual([2, 2]);
  });

  it('keeps A v = lambda v for the single defective eigenvector', () => {
    const A = mat(2, 1, 0, 2);
    const e = eigen(A);
    if (!isReal(e)) throw new Error('expected real');
    const v = e.vectors[0];
    expect(length(sub(apply(A, v), scaleVec(v, e.values[0])))).toBeLessThan(1e-9);
  });
});

describe('complex eigenvalues', () => {
  it('reports a rotation as having no real direction', () => {
    const e = eigen(rotationDeg(90));
    expect(isComplex(e)).toBe(true);
    if (!isComplex(e)) return;
    expect(e.re).toBeCloseTo(0, 9);
    expect(e.im).toBeCloseTo(1, 9);
    expect(e.modulus).toBeCloseTo(1, 9);
    expect(e.argument).toBeCloseTo(Math.PI / 2, 9);
    expect(hasNoRealDirection(rotationDeg(90))).toBe(true);
  });

  it('measures the spiral growth of a scaled rotation', () => {
    const A = mat(0, -2, 2, 0); // rotation by 90 degrees, scaled by 2
    const e = eigen(A);
    if (!isComplex(e)) throw new Error('expected complex');
    expect(e.modulus).toBeCloseTo(2, 9);
  });

  it('always reports a positive imaginary part', () => {
    const e = eigen(rotationDeg(-90));
    if (!isComplex(e)) throw new Error('expected complex');
    expect(e.im).toBeGreaterThan(0);
  });

  it('treats a half turn as real, not complex', () => {
    // Rotation by 180 degrees is -I, which is a scalar matrix.
    const e = eigen(rotationDeg(180));
    expect(isReal(e)).toBe(true);
    if (!isReal(e)) return;
    expect(e.scalar).toBe(true);
    expect(e.values[0]).toBeCloseTo(-1, 9);
  });
});

describe('reflections', () => {
  it('has eigenvalues 1 and -1 with perpendicular directions', () => {
    const e = eigen(reflection(Math.PI / 6));
    if (!isReal(e)) throw new Error('expected real');
    expect(e.values[0]).toBeCloseTo(1, 9);
    expect(e.values[1]).toBeCloseTo(-1, 9);
    const dotProduct = e.vectors[0].x * e.vectors[1].x + e.vectors[0].y * e.vectors[1].y;
    expect(dotProduct).toBeCloseTo(0, 9);
  });
});

describe('eigenvectorFor', () => {
  it('returns null when A - lambda I vanishes', () => {
    expect(eigenvectorFor(scaling(3), 3)).toBeNull();
  });

  it('finds a direction even when the first row is zero', () => {
    const A = mat(2, 0, 5, 3);
    const v = eigenvectorFor(A, 2)!;
    expect(length(sub(apply(A, v), scaleVec(v, 2)))).toBeLessThan(1e-9);
  });
});

describe('dominant eigen-direction', () => {
  it('finds the direction repeated application settles toward', () => {
    const fib = mat(1, 1, 1, 0);
    const golden = (1 + Math.sqrt(5)) / 2;
    expect(dominantEigenvalue(fib)).toBeCloseTo(golden, 9);
    expect(isParallel(dominantEigenvector(fib)!, vec(golden, 1), 1e-6)).toBe(true);
  });

  it('has none for a rotation', () => {
    expect(dominantEigenvalue(rotationDeg(37))).toBeNull();
    expect(dominantEigenvector(rotationDeg(37))).toBeNull();
  });

  it('has none when the two eigenvalues tie in magnitude', () => {
    expect(dominantEigenvector(reflection(0.4))).toBeNull();
  });

  it('has none for scalar or defective matrices', () => {
    expect(dominantEigenvector(scaling(2))).toBeNull();
    expect(dominantEigenvector(shearX(1))).toBeNull();
  });
});

describe('fromEigen builds integer matrices with chosen integer eigenvalues', () => {
  it('produces the requested spectrum', () => {
    const P = mat(1, 1, 0, 1); // det 1, integer
    const A = fromEigen(P, 3, -2)!;
    expect(Number.isInteger(A.a)).toBe(true);
    expect(Number.isInteger(A.b)).toBe(true);
    expect(Number.isInteger(A.c)).toBe(true);
    expect(Number.isInteger(A.d)).toBe(true);
    const e = eigen(A);
    if (!isReal(e)) throw new Error('expected real');
    expect([...e.values].sort((x, y) => x - y)).toEqual([-2, 3]);
  });

  it('rejects a singular P', () => {
    expect(fromEigen(mat(1, 2, 2, 4), 1, 2)).toBeNull();
  });

  it('stays integer for every unimodular P over many samples', () => {
    const rng = makeRng(99);
    const Ps = [
      mat(1, 0, 0, 1),
      mat(1, 1, 0, 1),
      mat(1, 0, 1, 1),
      mat(0, -1, 1, 0),
      mat(2, 1, 1, 1),
    ];
    for (let i = 0; i < 300; i++) {
      const P = Ps[Math.floor(rng() * Ps.length)]!;
      const l1 = Math.floor(rng() * 9) - 4;
      const l2 = Math.floor(rng() * 9) - 4;
      const A = fromEigen(P, l1, l2)!;
      for (const entry of [A.a, A.b, A.c, A.d]) {
        expect(Number.isInteger(entry)).toBe(true);
      }
      expect(trace(A)).toBeCloseTo(l1 + l2, 9);
      expect(det(A)).toBeCloseTo(l1 * l2, 9);
    }
  });
});

describe('property tests over 1000 random matrices', () => {
  it('keeps trace = sum of eigenvalues and det = product', () => {
    const rng = makeRng(2024);
    for (let i = 0; i < 1000; i++) {
      const A = randIntMat(rng, -4, 4);
      const e = eigen(A);
      if (isReal(e)) {
        expect(e.values[0] + e.values[1]).toBeCloseTo(trace(A), 8);
        expect(e.values[0] * e.values[1]).toBeCloseTo(det(A), 8);
      } else {
        // A conjugate pair: sum is 2*re, product is re^2 + im^2.
        expect(2 * e.re).toBeCloseTo(trace(A), 8);
        expect(e.re * e.re + e.im * e.im).toBeCloseTo(det(A), 8);
      }
    }
  });

  it('keeps A v = lambda v for every returned eigenvector', () => {
    const rng = makeRng(31337);
    for (let i = 0; i < 1000; i++) {
      const A = randIntMat(rng, -4, 4);
      const e = eigen(A);
      if (!isReal(e)) continue;
      for (let k = 0; k < 2; k++) {
        const v = e.vectors[k]!;
        const lambda = e.values[k]!;
        expect(length(sub(apply(A, v), scaleVec(v, lambda)))).toBeLessThan(1e-7);
      }
    }
  });

  it('holds for decimal matrices too', () => {
    const rng = makeRng(4242);
    for (let i = 0; i < 1000; i++) {
      const A = randRealMat(rng, 4);
      const e = eigen(A);
      if (isReal(e)) {
        expect(e.values[0] + e.values[1]).toBeCloseTo(trace(A), 8);
        expect(e.values[0] * e.values[1]).toBeCloseTo(det(A), 8);
        if (e.defective || e.scalar) continue;
        for (let k = 0; k < 2; k++) {
          const v = e.vectors[k]!;
          const lambda = e.values[k]!;
          expect(length(sub(apply(A, v), scaleVec(v, lambda)))).toBeLessThan(1e-5);
        }
      } else {
        expect(2 * e.re).toBeCloseTo(trace(A), 8);
        expect(e.re * e.re + e.im * e.im).toBeCloseTo(det(A), 8);
      }
    }
  });

  it('agrees with the sign of the discriminant', () => {
    const rng = makeRng(555);
    for (let i = 0; i < 1000; i++) {
      const A = randIntMat(rng, -4, 4);
      const disc = discriminant(A);
      const e = eigen(A);
      if (disc < -LOOSE_EPS) expect(e.kind).toBe('complex');
      if (disc > LOOSE_EPS) expect(e.kind).toBe('real');
    }
  });
});

describe('values near zero', () => {
  it('treats a tiny perturbation of a shear as defective, not as two roots', () => {
    const e = eigen(mat(1, 1, 1e-15, 1));
    if (!isReal(e)) throw new Error('expected real');
    expect(e.defective).toBe(true);
  });

  it('separates eigenvalues that are genuinely distinct but close', () => {
    const e = eigen(mat(1, 0, 0, 1.01));
    if (!isReal(e)) throw new Error('expected real');
    expect(e.defective).toBe(false);
    expect(e.values[0]).toBeCloseTo(1.01, 9);
    expect(e.values[1]).toBeCloseTo(1, 9);
  });

  it('handles very small entries without losing the scalar case', () => {
    const e = eigen(mat(1e-8, 0, 0, 1e-8));
    if (!isReal(e)) throw new Error('expected real');
    expect(e.scalar).toBe(true);
  });
});
