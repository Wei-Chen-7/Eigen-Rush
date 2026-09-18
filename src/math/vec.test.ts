import { describe, expect, it } from 'vitest';
import {
  add,
  angle,
  angleBetween,
  canonicalDirection,
  cross,
  distance,
  dot,
  eqVec,
  isParallel,
  isZeroVec,
  I_HAT,
  J_HAT,
  length,
  lengthSq,
  lerpVec,
  lineAngleBetween,
  negate,
  normalize,
  rotate,
  scale,
  sub,
  toDegrees,
  toRadians,
  vec,
  ZERO,
} from './vec';

describe('vec arithmetic', () => {
  it('adds, subtracts, scales and negates', () => {
    expect(add(vec(1, 2), vec(3, 4))).toEqual(vec(4, 6));
    expect(sub(vec(1, 2), vec(3, 4))).toEqual(vec(-2, -2));
    expect(scale(vec(1, -2), 3)).toEqual(vec(3, -6));
    expect(negate(vec(1, -2))).toEqual(vec(-1, 2));
  });

  it('computes dot and cross', () => {
    expect(dot(I_HAT, J_HAT)).toBe(0);
    expect(dot(vec(1, 2), vec(3, 4))).toBe(11);
    expect(cross(I_HAT, J_HAT)).toBe(1);
    expect(cross(J_HAT, I_HAT)).toBe(-1);
  });

  it('measures length and distance', () => {
    expect(length(vec(3, 4))).toBe(5);
    expect(lengthSq(vec(3, 4))).toBe(25);
    expect(distance(vec(1, 1), vec(4, 5))).toBe(5);
    expect(length(ZERO)).toBe(0);
  });

  it('detects the zero vector', () => {
    expect(isZeroVec(ZERO)).toBe(true);
    expect(isZeroVec(vec(1e-12, 0))).toBe(true);
    expect(isZeroVec(vec(0.1, 0))).toBe(false);
  });
});

describe('normalize', () => {
  it('produces unit vectors', () => {
    expect(length(normalize(vec(3, 4)))).toBeCloseTo(1, 12);
    expect(normalize(vec(5, 0))).toEqual(vec(1, 0));
  });

  it('returns the zero vector unchanged rather than dividing by zero', () => {
    expect(normalize(ZERO)).toEqual(ZERO);
    expect(normalize(vec(1e-15, 1e-15))).toEqual(ZERO);
  });
});

describe('angles', () => {
  it('reads a direction', () => {
    expect(angle(I_HAT)).toBeCloseTo(0, 12);
    expect(angle(J_HAT)).toBeCloseTo(Math.PI / 2, 12);
    expect(angle(vec(-1, 0))).toBeCloseTo(Math.PI, 12);
    expect(angle(ZERO)).toBe(0);
  });

  it('rotates', () => {
    const r = rotate(I_HAT, Math.PI / 2);
    expect(r.x).toBeCloseTo(0, 12);
    expect(r.y).toBeCloseTo(1, 12);
  });

  it('measures the unsigned angle between vectors', () => {
    expect(angleBetween(I_HAT, J_HAT)).toBeCloseTo(Math.PI / 2, 12);
    expect(angleBetween(I_HAT, vec(-1, 0))).toBeCloseTo(Math.PI, 12);
    expect(angleBetween(I_HAT, I_HAT)).toBeCloseTo(0, 12);
    expect(angleBetween(ZERO, I_HAT)).toBe(0);
  });

  it('treats u and -u as the same line', () => {
    expect(lineAngleBetween(I_HAT, vec(-1, 0))).toBeCloseTo(0, 12);
    expect(lineAngleBetween(I_HAT, J_HAT)).toBeCloseTo(Math.PI / 2, 12);
    expect(lineAngleBetween(vec(1, 1), vec(-1, -1))).toBeCloseTo(0, 12);
    // Never exceeds a right angle.
    expect(lineAngleBetween(vec(1, 0), vec(-1, 0.1))).toBeLessThanOrEqual(Math.PI / 2);
  });

  it('detects parallel lines in both directions', () => {
    expect(isParallel(vec(2, 4), vec(-1, -2))).toBe(true);
    expect(isParallel(vec(1, 0), vec(0, 1))).toBe(false);
    expect(isParallel(ZERO, I_HAT)).toBe(false);
  });

  it('converts degrees and radians', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 12);
    expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 12);
  });
});

describe('canonicalDirection', () => {
  it('picks one representative per line', () => {
    expect(eqVec(canonicalDirection(vec(1, 1)), canonicalDirection(vec(-1, -1)))).toBe(true);
    expect(eqVec(canonicalDirection(vec(3, 0)), I_HAT)).toBe(true);
    expect(eqVec(canonicalDirection(vec(-3, 0)), I_HAT)).toBe(true);
  });

  it('always points into the upper half plane', () => {
    for (const v of [vec(1, -1), vec(-1, -1), vec(0, -5), vec(2, -0.001)]) {
      expect(canonicalDirection(v).y).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns zero for the zero vector', () => {
    expect(canonicalDirection(ZERO)).toEqual(ZERO);
  });
});

describe('lerpVec', () => {
  it('hits both ends exactly', () => {
    expect(lerpVec(vec(1, 2), vec(3, 4), 0)).toEqual(vec(1, 2));
    expect(lerpVec(vec(1, 2), vec(3, 4), 1)).toEqual(vec(3, 4));
    expect(lerpVec(vec(0, 0), vec(2, 4), 0.5)).toEqual(vec(1, 2));
  });
});
