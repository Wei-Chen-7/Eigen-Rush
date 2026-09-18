import { describe, expect, it } from 'vitest';
import { clipToViewport, createViewport, toScreen, toWorld, worldRadius } from './viewport';
import { vec } from '../math/vec';

const vp = createViewport(300, 10); // 30 px per world unit, centre at (150, 150)

describe('createViewport', () => {
  it('centres the origin and sets the scale', () => {
    expect(vp.scale).toBe(30);
    expect(vp.cx).toBe(150);
    expect(vp.cy).toBe(150);
    expect(worldRadius(vp)).toBe(5);
  });
});

describe('toScreen', () => {
  it('puts the origin in the middle', () => {
    expect(toScreen(vp, vec(0, 0))).toEqual(vec(150, 150));
  });

  it('flips the y axis, because maths points up', () => {
    expect(toScreen(vp, vec(0, 1))).toEqual(vec(150, 120));
    expect(toScreen(vp, vec(0, -1))).toEqual(vec(150, 180));
  });

  it('leaves x pointing right', () => {
    expect(toScreen(vp, vec(1, 0))).toEqual(vec(180, 150));
  });
});

describe('toWorld', () => {
  it('inverts toScreen', () => {
    for (const w of [vec(0, 0), vec(1, 2), vec(-3.5, 0.25), vec(4, -4)]) {
      const back = toWorld(vp, toScreen(vp, w));
      expect(back.x).toBeCloseTo(w.x, 9);
      expect(back.y).toBeCloseTo(w.y, 9);
    }
  });
});

describe('clipToViewport', () => {
  it('leaves a segment already inside alone', () => {
    const r = clipToViewport(vp, vec(10, 10), vec(200, 200));
    expect(r).not.toBeNull();
    expect(r![0]).toEqual(vec(10, 10));
    expect(r![1]).toEqual(vec(200, 200));
  });

  it('trims a segment that runs off the edge', () => {
    const r = clipToViewport(vp, vec(150, 150), vec(150, 100000), 0)!;
    expect(r).not.toBeNull();
    expect(r[1].y).toBeCloseTo(300, 6);
    expect(r[0]).toEqual(vec(150, 150));
  });

  it('trims both ends of a segment crossing right through', () => {
    const r = clipToViewport(vp, vec(-5000, 150), vec(5000, 150), 0)!;
    expect(r[0].x).toBeCloseTo(0, 6);
    expect(r[1].x).toBeCloseTo(300, 6);
  });

  it('rejects a segment that misses entirely', () => {
    expect(clipToViewport(vp, vec(-500, -500), vec(-400, -400))).toBeNull();
    expect(clipToViewport(vp, vec(1000, 0), vec(1000, 300))).toBeNull();
  });

  it('keeps a degenerate point inside and rejects one outside', () => {
    expect(clipToViewport(vp, vec(150, 150), vec(150, 150))).not.toBeNull();
    expect(clipToViewport(vp, vec(-900, -900), vec(-900, -900))).toBeNull();
  });

  it('bounds the output to the viewport plus margin', () => {
    const margin = 8;
    const r = clipToViewport(vp, vec(-1e6, -1e6), vec(1e6, 1e6), margin)!;
    for (const p of r) {
      expect(p.x).toBeGreaterThanOrEqual(-margin - 1e-6);
      expect(p.x).toBeLessThanOrEqual(vp.width + margin + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(-margin - 1e-6);
      expect(p.y).toBeLessThanOrEqual(vp.height + margin + 1e-6);
    }
  });
});
