import type { Mat2 } from './types';
import { IDENTITY, lerpMat, rotation, scaleMat, similarityOf } from './mat';
import { clamp } from './tolerance';

/** How long a morph runs, in milliseconds. */
export const MORPH_DURATION_MS = 600;

/** Smooth start and stop, so the eye can follow the middle of the motion. */
export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * The frame of the morph at time `t` in `[0, 1]`, going from the identity to `A`.
 *
 * The default path is the straight line `M(t) = (1-t) I + t A`. That path is
 * wrong for rotations: a 180-degree turn would pass through the zero matrix and
 * the grid would collapse instead of turning. So when `A` is a rotation (or a
 * rotation with a uniform scale) we interpolate the angle and the scale instead,
 * and the grid sweeps around at a steady size.
 *
 * A flip (`det A < 0`) still passes through a flat frame on the straight path,
 * and that is deliberate: seeing the plane fold is the lesson.
 */
export function morphAt(target: Mat2, t: number): Mat2 {
  const u = clamp(t, 0, 1);
  const sim = similarityOf(target);
  if (sim !== null) {
    // Scale moves geometrically so that t=0 is exactly 1 and t=1 is exactly s.
    const s = sim.scale ** u;
    return scaleMat(rotation(sim.angle * u), s);
  }
  return lerpMat(IDENTITY, target, u);
}

/** True when `morphAt` will take the arc path rather than the straight one. */
export function morphIsRotational(target: Mat2): boolean {
  return similarityOf(target) !== null;
}

/** Eased frame, for use straight from an animation clock. */
export function morphFrame(target: Mat2, t: number): Mat2 {
  return morphAt(target, easeInOutCubic(t));
}
