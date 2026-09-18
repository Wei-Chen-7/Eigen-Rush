import type { Vec2 } from '../math/types';
import { eigen } from '../math/eigen';
import { isZeroVec, lineAngleBetween, toDegrees } from '../math/vec';
import { chance, type Rng } from '../math/rng';
import { generateRotationLike, generateWithRealEigen } from '../generators/matrices';
import { TIER_RULES, type Tier } from '../generators/tiers';
import type { Answer, ModeDefinition, Question } from './types';

/**
 * M3, "Eigen hunt": the morph plays, then the player drags an arrow out of the
 * origin looking for a direction that only stretches.
 *
 * One round in four has no real direction at all, so the "no real direction"
 * button is a live answer rather than decoration — without that, a player who
 * never presses it is never punished for it.
 */
export function generateEigenHunt(rng: Rng, tier: Tier): Question {
  const noRealDirection = chance(rng, 0.25);
  const { matrix } = noRealDirection ? generateRotationLike(rng) : generateWithRealEigen(rng, tier);
  const e = eigen(matrix);

  const directions = e.kind === 'real' ? (e.scalar ? [] : [...e.vectors]) : [];
  const values = e.kind === 'real' ? [...e.values] : [];

  return {
    mode: 'eigenHunt',
    tier,
    matrix,
    prompt: 'Drag to a direction that only stretches',
    insight:
      'An eigenvector keeps its line — the transform stretches or flips it, but never turns it off course.',
    data: {
      kind: 'eigenHunt',
      directions,
      values,
      toleranceDeg: TIER_RULES[tier].eigenToleranceDeg,
    },
  };
}

/**
 * Correct when the dragged direction lies within tolerance of an eigen-line.
 *
 * `u` and `-u` span the same line and count the same, which is why the
 * comparison is `lineAngleBetween` and not the angle between vectors. When
 * `A = cI` every direction is an eigenvector, so any drag is right. When the
 * eigenvalues are complex there is no real direction, so the only right answer
 * is the button.
 */
export function checkEigenHunt(question: Question, answer: Answer): boolean {
  if (question.data.kind !== 'eigenHunt') return false;
  const { directions, toleranceDeg } = question.data;
  const e = eigen(question.matrix);
  const everyDirectionWorks = e.kind === 'real' && e.scalar;
  const noRealDirection = e.kind === 'complex';

  if (answer.kind === 'noRealDirection') return noRealDirection;
  if (answer.kind !== 'direction') return false;
  if (isZeroVec(answer.at, 1e-6)) return false; // a tap on the origin points nowhere
  if (noRealDirection) return false;
  if (everyDirectionWorks) return true;

  return directions.some((d) => toDegrees(lineAngleBetween(answer.at, d)) <= toleranceDeg);
}

/** Eigen-lines to draw once the round is over, with their lambda labels. */
export function eigenLinesFor(question: Question): { direction: Vec2; label: string }[] {
  if (question.data.kind !== 'eigenHunt') return [];
  const { directions, values } = question.data;
  return directions.map((direction, i) => ({
    direction,
    label: `λ = ${Math.round((values[i] ?? 0) * 100) / 100}`,
  }));
}

export const eigenHuntMode: ModeDefinition = {
  id: 'eigenHunt',
  name: 'Eigen hunt',
  generate: generateEigenHunt,
  check: checkEigenHunt,
};
