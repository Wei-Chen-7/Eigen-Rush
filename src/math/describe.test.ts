import { describe, expect, it } from 'vitest';
import { describe as describeMatrix, traits } from './describe';
import { IDENTITY, ZERO_MAT, mat, reflection, rotationDeg, scaling, shearX, shearY } from './mat';

describe('describe', () => {
  it('names the identity and the zero matrix', () => {
    expect(describeMatrix(IDENTITY)).toMatch(/identity/i);
    expect(describeMatrix(ZERO_MAT)).toMatch(/collapses/i);
  });

  it('names uniform scales', () => {
    expect(describeMatrix(scaling(3))).toMatch(/uniform scale by 3/i);
    expect(describeMatrix(scaling(0.5))).toMatch(/shrink/i);
    expect(describeMatrix(scaling(-2))).toMatch(/half turn/i);
  });

  it('names rotations and reflections', () => {
    expect(describeMatrix(rotationDeg(90))).toMatch(/rotation by 90 degrees/i);
    expect(describeMatrix(reflection(0))).toMatch(/reflection/i);
  });

  it('names shears and axis scalings', () => {
    expect(describeMatrix(shearX(2))).toMatch(/horizontal shear by 2/i);
    expect(describeMatrix(shearY(-1))).toMatch(/vertical shear by -1/i);
    expect(describeMatrix(scaling(2, 3))).toMatch(/axis scaling/i);
  });

  it('names singular, defective and complex cases', () => {
    expect(describeMatrix(mat(1, 2, 2, 4))).toMatch(/flattens onto a line/i);
    expect(describeMatrix(mat(2, 1, 0, 2))).toMatch(/defective/i);
    expect(describeMatrix(mat(0, -2, 1, 0))).toMatch(/spirals/i);
  });

  it('mentions an orientation flip for a general transform', () => {
    expect(describeMatrix(mat(1, 2, 3, 4))).toMatch(/flips orientation/i);
  });

  it('never prints negative zero', () => {
    expect(describeMatrix(shearX(-0))).not.toMatch(/-0/);
  });
});

describe('traits', () => {
  it('tags a reflection', () => {
    const t = traits(reflection(0.3));
    expect(t.reflection).toBe(true);
    expect(t.flipsOrientation).toBe(true);
    expect(t.symmetric).toBe(true);
    expect(t.singular).toBe(false);
  });

  it('tags a rotation as having complex eigenvalues', () => {
    const t = traits(rotationDeg(37));
    expect(t.rotation).toBe(true);
    expect(t.complexEigen).toBe(true);
    expect(t.flipsOrientation).toBe(false);
  });

  it('tags a shear as defective and triangular', () => {
    const t = traits(shearX(1));
    expect(t.defective).toBe(true);
    expect(t.triangular).toBe(true);
  });

  it('tags a singular matrix', () => {
    const t = traits(mat(1, 2, 2, 4));
    expect(t.singular).toBe(true);
    expect(t.symmetric).toBe(true);
  });

  it('tags a scalar matrix', () => {
    expect(traits(scaling(5)).scalar).toBe(true);
  });
});
