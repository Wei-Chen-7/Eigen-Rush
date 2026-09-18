import { describe, expect, it } from 'vitest';
import { MORPH_DURATION_MS, easeInOutCubic, morphAt, morphFrame, morphIsRotational } from './morph';
import {
  IDENTITY,
  det,
  eqMat,
  isRotation,
  mat,
  reflection,
  rotationDeg,
  scaleMat,
  scaling,
  shearX,
} from './mat';
import { makeRng, randRealMat } from './testing';

describe('easing', () => {
  it('pins both ends', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 12);
  });

  it('clamps out-of-range input', () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
  });

  it('never goes backwards', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const y = easeInOutCubic(i / 100);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });
});

describe('morphAt', () => {
  it('starts at the identity and ends at the target', () => {
    const rng = makeRng(11);
    for (let i = 0; i < 200; i++) {
      const A = randRealMat(rng);
      expect(eqMat(morphAt(A, 0), IDENTITY, 1e-9)).toBe(true);
      expect(eqMat(morphAt(A, 1), A, 1e-9)).toBe(true);
    }
  });

  it('clamps t outside [0, 1]', () => {
    const A = mat(1, 2, 3, 4);
    expect(eqMat(morphAt(A, -1), IDENTITY, 1e-9)).toBe(true);
    expect(eqMat(morphAt(A, 5), A, 1e-9)).toBe(true);
  });

  it('interpolates entrywise for a shear', () => {
    expect(morphIsRotational(shearX(2))).toBe(false);
    expect(eqMat(morphAt(shearX(2), 0.5), shearX(1), 1e-12)).toBe(true);
  });

  it('interpolates the angle for a rotation, so the grid never shrinks', () => {
    const A = rotationDeg(180);
    expect(morphIsRotational(A)).toBe(true);
    // A straight blend would pass through the zero matrix at t = 0.5.
    const half = morphAt(A, 0.5);
    expect(eqMat(half, rotationDeg(90), 1e-12)).toBe(true);
    expect(det(half)).toBeCloseTo(1, 12);
  });

  it('keeps every frame of a rotation a rotation', () => {
    for (const deg of [30, 90, 180, -90, 270]) {
      const A = rotationDeg(deg);
      for (let i = 0; i <= 20; i++) {
        expect(isRotation(morphAt(A, i / 20), 1e-9)).toBe(true);
      }
    }
  });

  it('never collapses a rotation midway', () => {
    const A = rotationDeg(180);
    for (let i = 0; i <= 20; i++) {
      expect(Math.abs(det(morphAt(A, i / 20)))).toBeGreaterThan(0.99);
    }
  });

  it('grows a scaled rotation geometrically', () => {
    const A = scaleMat(rotationDeg(90), 4);
    expect(morphIsRotational(A)).toBe(true);
    const half = morphAt(A, 0.5);
    // Scale 4 at t = 1 means scale 2 at t = 0.5.
    expect(Math.hypot(half.a, half.c)).toBeCloseTo(2, 12);
  });

  it('lets a flip pass through a flat frame — that is the lesson', () => {
    const A = reflection(0); // det -1, not a similarity
    expect(morphIsRotational(A)).toBe(false);
    const dets = [];
    for (let i = 0; i <= 20; i++) dets.push(det(morphAt(A, i / 20)));
    expect(Math.min(...dets.map(Math.abs))).toBeLessThan(0.01);
    expect(dets[dets.length - 1]).toBeCloseTo(-1, 9);
  });

  it('holds the identity still', () => {
    for (let i = 0; i <= 10; i++) {
      expect(eqMat(morphAt(IDENTITY, i / 10), IDENTITY, 1e-12)).toBe(true);
    }
  });

  it('treats a uniform scale as a similarity and keeps it positive throughout', () => {
    const A = scaling(0.25);
    expect(morphIsRotational(A)).toBe(true);
    for (let i = 0; i <= 10; i++) {
      expect(det(morphAt(A, i / 10))).toBeGreaterThan(0);
    }
  });

  it('does not treat a singular matrix as a similarity', () => {
    expect(morphIsRotational(mat(0, 0, 0, 0))).toBe(false);
    expect(morphIsRotational(mat(1, 2, 2, 4))).toBe(false);
  });
});

describe('morphFrame', () => {
  it('applies easing but keeps the endpoints', () => {
    const A = mat(1, 2, 3, 4);
    expect(eqMat(morphFrame(A, 0), IDENTITY, 1e-9)).toBe(true);
    expect(eqMat(morphFrame(A, 1), A, 1e-9)).toBe(true);
    expect(eqMat(morphFrame(A, 0.5), morphAt(A, 0.5), 1e-9)).toBe(true);
  });
});

describe('duration', () => {
  it('is the 600 ms the design calls for', () => {
    expect(MORPH_DURATION_MS).toBe(600);
  });
});
