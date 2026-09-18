import type { Vec2 } from '../math/types';
import { vec } from '../math/vec';

/**
 * Maps world coordinates to SVG coordinates.
 *
 * All geometry is computed in JS and emitted in screen space, so stroke widths
 * and arrowheads stay a constant size no matter how far the matrix stretches
 * the plane. The y axis is flipped, because maths points up and SVG points down.
 */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  /** Screen pixels per world unit. */
  readonly scale: number;
  readonly cx: number;
  readonly cy: number;
}

/** A square viewport `unitsAcross` world units wide, origin at the centre. */
export function createViewport(size: number, unitsAcross: number): Viewport {
  return {
    width: size,
    height: size,
    scale: size / unitsAcross,
    cx: size / 2,
    cy: size / 2,
  };
}

export function toScreen(vp: Viewport, v: Vec2): Vec2 {
  return vec(vp.cx + v.x * vp.scale, vp.cy - v.y * vp.scale);
}

export function toWorld(vp: Viewport, p: Vec2): Vec2 {
  return vec((p.x - vp.cx) / vp.scale, (vp.cy - p.y) / vp.scale);
}

/** Half the viewport width, in world units — how far the visible area reaches. */
export function worldRadius(vp: Viewport): number {
  return vp.cx / vp.scale;
}

/**
 * Clips the screen-space segment `p -> q` to the viewport (Liang-Barsky), with a
 * small margin so strokes near the edge are not cut short. Returns `null` when
 * the segment misses the viewport entirely. Keeps path data bounded even when a
 * matrix throws points a thousand units off screen.
 */
export function clipToViewport(
  vp: Viewport,
  p: Vec2,
  q: Vec2,
  margin = 8,
): readonly [Vec2, Vec2] | null {
  const xMin = -margin;
  const yMin = -margin;
  const xMax = vp.width + margin;
  const yMax = vp.height + margin;

  const dx = q.x - p.x;
  const dy = q.y - p.y;

  let t0 = 0;
  let t1 = 1;

  const edges: ReadonlyArray<readonly [number, number]> = [
    [-dx, p.x - xMin],
    [dx, xMax - p.x],
    [-dy, p.y - yMin],
    [dy, yMax - p.y],
  ];

  for (const [num, den] of edges) {
    if (num === 0) {
      // Parallel to this edge: outside means the whole segment is outside.
      if (den < 0) return null;
      continue;
    }
    const r = den / num;
    if (num < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }

  return [vec(p.x + t0 * dx, p.y + t0 * dy), vec(p.x + t1 * dx, p.y + t1 * dy)] as const;
}
