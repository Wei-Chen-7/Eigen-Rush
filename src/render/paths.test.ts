import { describe, expect, it } from 'vitest';
import { arrow, gridFamilyPath, lineThroughOrigin, trailPath, unitSquarePoints } from './paths';
import { createViewport } from './viewport';
import { IDENTITY, ZERO_MAT, mat, scaling, shearX } from '../math/mat';
import { vec } from '../math/vec';

const vp = createViewport(300, 10);

describe('gridFamilyPath', () => {
  it('emits one move-line per grid line', () => {
    const d = gridFamilyPath(IDENTITY, vp, 4, 'vertical');
    // Nine lines from x = -4 to x = 4, all crossing the viewport.
    expect(d.match(/M/g)?.length).toBe(9);
  });

  it('draws the two families differently', () => {
    const v = gridFamilyPath(IDENTITY, vp, 4, 'vertical');
    const h = gridFamilyPath(IDENTITY, vp, 4, 'horizontal');
    expect(v).not.toBe(h);
  });

  it('drops lines that fall outside the viewport', () => {
    // A 100x scale pushes all but the central line off screen.
    const d = gridFamilyPath(scaling(100), vp, 4, 'vertical');
    expect(d.match(/M/g)?.length).toBe(1);
  });

  it('survives a singular matrix collapsing the grid onto a line', () => {
    const d = gridFamilyPath(mat(1, 2, 2, 4), vp, 4, 'vertical');
    expect(d.length).toBeGreaterThan(0);
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('produces no output for the zero matrix rather than NaN', () => {
    const d = gridFamilyPath(ZERO_MAT, vp, 4, 'vertical');
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('keeps every coordinate finite under a shear', () => {
    const d = gridFamilyPath(shearX(3), vp, 6, 'horizontal');
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('honours the step size', () => {
    const fine = gridFamilyPath(IDENTITY, vp, 2, 'vertical', 0.5);
    expect(fine.match(/M/g)?.length).toBe(9);
  });
});

describe('unitSquarePoints', () => {
  it('walks the four corners of the image of the unit square', () => {
    const pts = unitSquarePoints(IDENTITY, vp).split(' ');
    expect(pts).toEqual(['150,150', '180,150', '180,120', '150,120']);
  });

  it('follows the columns of the matrix', () => {
    // Under [[2,0],[0,3]] the square becomes 2 wide and 3 tall.
    const pts = unitSquarePoints(scaling(2, 3), vp).split(' ');
    expect(pts[1]).toBe('210,150'); // 2 units right
    expect(pts[3]).toBe('150,60'); // 3 units up
  });

  it('collapses to a degenerate polygon when singular, without NaN', () => {
    expect(unitSquarePoints(mat(1, 2, 2, 4), vp)).not.toMatch(/NaN/);
  });
});

describe('arrow', () => {
  it('starts at the origin and ends at the vector', () => {
    const a = arrow(vp, vec(3, 0))!;
    expect(a).not.toBeNull();
    expect(a.shaft).toMatch(/^M150 150L/);
    // The tip of the head is the first point of the triangle.
    expect(a.head.split(' ')[0]).toBe('240,150');
  });

  it('stops the shaft short of the head so they do not overlap', () => {
    const a = arrow(vp, vec(3, 0))!;
    const endX = Number(a.shaft.split('L')[1]!.split(' ')[0]);
    expect(endX).toBeLessThan(240);
    expect(endX).toBeGreaterThan(220);
  });

  it('returns null for a vector too short to draw', () => {
    expect(arrow(vp, vec(0, 0))).toBeNull();
    expect(arrow(vp, vec(0.01, 0))).toBeNull();
  });

  it('shrinks the head rather than overrunning a short vector', () => {
    const a = arrow(vp, vec(0.2, 0))!;
    expect(a).not.toBeNull();
    expect(a.head).not.toMatch(/NaN/);
  });

  it('points the right way after a rotation', () => {
    const a = arrow(vp, vec(0, 3))!;
    const [tipX, tipY] = a.head.split(' ')[0]!.split(',').map(Number);
    expect(tipX).toBeCloseTo(150, 6);
    expect(tipY).toBeCloseTo(60, 6); // up the screen
  });

  it('handles a vector far outside the viewport', () => {
    const a = arrow(vp, vec(1000, 1000))!;
    expect(a.shaft).not.toMatch(/NaN|Infinity/);
  });
});

describe('lineThroughOrigin', () => {
  it('spans the viewport', () => {
    const d = lineThroughOrigin(vp, vec(1, 0))!;
    expect(d).toBe('M0 150L300 150');
  });

  it('works for a diagonal direction', () => {
    const d = lineThroughOrigin(vp, vec(1, 1))!;
    expect(d).toBe('M0 300L300 0');
  });

  it('ignores the length of the direction vector', () => {
    expect(lineThroughOrigin(vp, vec(5, 0))).toBe(lineThroughOrigin(vp, vec(1, 0)));
  });

  it('returns null for the zero direction', () => {
    expect(lineThroughOrigin(vp, vec(0, 0))).toBeNull();
  });
});

describe('trailPath', () => {
  it('joins the points in order', () => {
    expect(trailPath(vp, [vec(0, 0), vec(1, 0), vec(1, 1)])).toBe('M150 150L180 150L180 120');
  });

  it('needs at least two points', () => {
    expect(trailPath(vp, [])).toBe('');
    expect(trailPath(vp, [vec(0, 0)])).toBe('');
  });

  it('handles an arbitrary trail without producing NaN', () => {
    const orbit = [vec(0, 0), vec(2, 2), vec(-2, 3), vec(-40, 90)];
    expect(trailPath(vp, orbit)).not.toMatch(/NaN|Infinity/);
  });
});
