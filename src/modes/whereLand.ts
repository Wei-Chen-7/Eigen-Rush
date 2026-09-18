import type { Vec2 } from '../math/types';
import { apply } from '../math/mat';
import { eqVec, length, vec } from '../math/vec';
import { drawUntil, randInt, type Rng } from '../math/rng';
import { generateMatrix } from '../generators/matrices';
import type { Tier } from '../generators/tiers';
import type { Answer, ModeDefinition, Question } from './types';

/** How far from the origin an answer may land and still fit on the plane. */
const MAX_REACH = 4.5;

/**
 * M1, "Where does it land?": the matrix is shown but the transformed grid is
 * not — otherwise the answer could simply be read off the picture. The player
 * has to work out `A v` and tap the spot.
 */
export function generateWhereLand(rng: Rng, tier: Tier): Question {
  const { matrix } = generateMatrix(rng, tier);
  const vector = drawUntil(
    () => vec(randInt(rng, -2, 2), randInt(rng, -2, 2)),
    (v) => length(v) > 0 && length(apply(matrix, v)) <= MAX_REACH,
  );
  const target = apply(matrix, vector);

  return {
    mode: 'whereLand',
    tier,
    matrix,
    prompt: 'Tap where the arrow lands',
    insight: 'The columns of A are where î and ĵ land — every other vector follows from those.',
    data: { kind: 'whereLand', vector, target, snap: tier <= 2 },
  };
}

/**
 * Correct when the tapped point is the image of the vector. Taps snap to the
 * lattice in tiers 1 and 2, where the answer is always a lattice point, so a
 * near-miss on a touchscreen is not punished. Above that the raw tap is
 * compared with a small radius.
 */
export function checkWhereLand(question: Question, answer: Answer): boolean {
  if (question.data.kind !== 'whereLand') return false;
  if (answer.kind !== 'point') return false;
  const { target, snap } = question.data;
  if (snap) return eqVec(snapToLattice(answer.at), target, 1e-6);
  return length(vec(answer.at.x - target.x, answer.at.y - target.y)) < 0.4;
}

/** Nearest lattice point. */
export function snapToLattice(v: Vec2): Vec2 {
  return vec(Math.round(v.x), Math.round(v.y));
}

export const whereLandMode: ModeDefinition = {
  id: 'whereLand',
  name: 'Where does it land?',
  generate: generateWhereLand,
  check: checkWhereLand,
};
