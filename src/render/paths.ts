import type { Mat2, Vec2 } from '../math/types';
import { apply, columns } from '../math/mat';
import { add, length, normalize, scale, sub, vec } from '../math/vec';
import { clipToViewport, toScreen, type Viewport } from './viewport';

const fmt = (n: number): string => (Math.round(n * 100) / 100).toString();

const moveLine = (p: Vec2, q: Vec2): string => `M${fmt(p.x)} ${fmt(p.y)}L${fmt(q.x)} ${fmt(q.y)}`;

/**
 * One SVG path holding every line of a grid family, so a whole grid costs two
 * DOM nodes instead of fifty. Cheap enough to rebuild on every animation frame.
 *
 * `family` picks which lines to draw: the images of the vertical lines `x = k`,
 * or of the horizontal lines `y = k`.
 */
export function gridFamilyPath(
  m: Mat2,
  vp: Viewport,
  extent: number,
  family: 'vertical' | 'horizontal',
  step = 1,
): string {
  const parts: string[] = [];
  const reach = extent;
  for (let k = -extent; k <= extent + 1e-9; k += step) {
    const [w1, w2] =
      family === 'vertical' ? [vec(k, -reach), vec(k, reach)] : [vec(-reach, k), vec(reach, k)];
    const p = toScreen(vp, apply(m, w1));
    const q = toScreen(vp, apply(m, w2));
    if (!Number.isFinite(p.x) || !Number.isFinite(q.x)) continue;
    const clipped = clipToViewport(vp, p, q);
    if (clipped === null) continue;
    parts.push(moveLine(clipped[0], clipped[1]));
  }
  return parts.join('');
}

/** The image of the unit square, as a closed polygon in screen space. */
export function unitSquarePoints(m: Mat2, vp: Viewport): string {
  const [c1, c2] = columns(m);
  const corners = [vec(0, 0), c1, add(c1, c2), c2].map((w) => toScreen(vp, w));
  return corners.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
}

/**
 * An arrow from the origin to `v`, in screen space: the shaft (stopped short so
 * it does not poke through the head) and the head as a triangle. The head is
 * sized in pixels, so it stays readable whether the vector is tiny or huge.
 *
 * Returns `null` when the vector is too short on screen to draw an arrow.
 */
export function arrow(
  vp: Viewport,
  v: Vec2,
  headLength = 11,
  headWidth = 8,
): { shaft: string; head: string } | null {
  const origin = toScreen(vp, vec(0, 0));
  const tip = toScreen(vp, v);
  const along = sub(tip, origin);
  const len = length(along);
  if (!Number.isFinite(len) || len < 2) return null;

  const dir = normalize(along);
  const perp = vec(-dir.y, dir.x);
  // A short vector gets a proportionally shorter head rather than no arrow.
  const hl = Math.min(headLength, len * 0.5);
  const hw = (headWidth * hl) / headLength;

  const base = sub(tip, scale(dir, hl));
  const left = add(base, scale(perp, hw / 2));
  const right = sub(base, scale(perp, hw / 2));

  return {
    shaft: moveLine(origin, base),
    head: [tip, left, right].map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' '),
  };
}

/**
 * A line through the origin in direction `dir`, drawn right across the
 * viewport. Used for eigen-direction lines and for the collapse line of a
 * singular matrix.
 */
export function lineThroughOrigin(vp: Viewport, dir: Vec2): string | null {
  const d = normalize(dir);
  if (length(d) === 0) return null;
  const reach = (vp.width + vp.height) * 2;
  const origin = toScreen(vp, vec(0, 0));
  const far = vec(d.x * reach, -d.y * reach);
  const p = sub(origin, far);
  const q = add(origin, far);
  const clipped = clipToViewport(vp, p, q, 0);
  return clipped === null ? null : moveLine(clipped[0], clipped[1]);
}

/** Screen-space polyline through a list of world points, for orbit trails. */
export function trailPath(vp: Viewport, points: readonly Vec2[]): string {
  const screen = points.map((w) => toScreen(vp, w)).filter((p) => Number.isFinite(p.x));
  if (screen.length < 2) return '';
  const [first, ...rest] = screen as [Vec2, ...Vec2[]];
  return `M${fmt(first.x)} ${fmt(first.y)}` + rest.map((p) => `L${fmt(p.x)} ${fmt(p.y)}`).join('');
}
