import type { Mat2 } from '../math/types';
import { apply, columns, eqMat, fromColumns, inverse, mat, scaleMat, transpose } from '../math/mat';
import { I_HAT, J_HAT, angleBetween, length, sub, vec } from '../math/vec';
import { shuffle, type Rng } from '../math/rng';
import { generateMatrix } from '../generators/matrices';
import type { Tier } from '../generators/tiers';
import type { Answer, ModeDefinition, Question } from './types';

/**
 * Two matrices count as visibly different when at least one basis vector lands
 * somewhere clearly else — a noticeable turn, or a noticeable change in length.
 * Four options that all look the same on screen would make the round a coin
 * toss, which is the failure mode this guards against.
 */
export function visiblyDifferent(x: Mat2, y: Mat2): boolean {
  for (const basis of [I_HAT, J_HAT]) {
    const px = apply(x, basis);
    const py = apply(y, basis);
    if (length(sub(px, py)) < 0.35) continue;
    const bothNonZero = length(px) > 1e-6 && length(py) > 1e-6;
    // A clear turn, or a clear change in length, either one will read on screen.
    if (!bothNonZero) return true;
    if (angleBetween(px, py) > 0.2) return true;
    if (Math.abs(length(px) - length(py)) > 0.35) return true;
  }
  return false;
}

/** The plausible wrong answers: the mistakes a player actually makes. */
export function distractorsFor(m: Mat2): Mat2[] {
  const [c1, c2] = columns(m);
  const inv = inverse(m);
  const candidates: Mat2[] = [
    transpose(m), // read the matrix along the rows instead of the columns
    fromColumns(c2, c1), // swapped the two columns
    mat(-m.a, m.b, m.c, -m.d), // sign slip on the diagonal
    mat(m.a, -m.b, -m.c, m.d), // sign slip off the diagonal
    scaleMat(m, -1), // whole thing negated
    fromColumns(c1, vec(-c2.x, -c2.y)), // one basis vector flipped
    fromColumns(vec(-c1.x, -c1.y), c2),
  ];
  if (inv !== null) candidates.push(inv); // ran the transform backwards
  return candidates;
}

/**
 * M2, "Name that move": the morph plays without the matrix on screen, and the
 * player picks it out of four. Distractors are the plausible misreadings, and
 * every option must be distinct from the answer *and* from the others — both as
 * a matrix and as something you can see.
 */
export function generateNameMove(rng: Rng, tier: Tier): Question {
  const { matrix } = generateMatrix(rng, tier);

  const chosen: Mat2[] = [];
  for (const candidate of shuffle(rng, distractorsFor(matrix))) {
    if (chosen.length === 3) break;
    const against = [matrix, ...chosen];
    if (against.some((m) => eqMat(m, candidate, 1e-6))) continue;
    if (!against.every((m) => visiblyDifferent(m, candidate))) continue;
    chosen.push(candidate);
  }

  // Integer nudges as a fallback, so a symmetric matrix with few usable
  // distractors still gets a full set of four rather than a short list.
  for (let k = 1; chosen.length < 3 && k <= 3; k++) {
    const nudges = [
      mat(matrix.a + k, matrix.b, matrix.c, matrix.d),
      mat(matrix.a, matrix.b + k, matrix.c, matrix.d),
      mat(matrix.a, matrix.b, matrix.c + k, matrix.d),
      mat(matrix.a, matrix.b, matrix.c, matrix.d + k),
    ];
    for (const nudge of nudges) {
      if (chosen.length === 3) break;
      const against = [matrix, ...chosen];
      if (against.some((m) => eqMat(m, nudge, 1e-6))) continue;
      if (!against.every((m) => visiblyDifferent(m, nudge))) continue;
      chosen.push(nudge);
    }
  }

  const options = shuffle(rng, [matrix, ...chosen]);
  const correctIndex = options.findIndex((m) => eqMat(m, matrix, 1e-9));

  return {
    mode: 'nameMove',
    tier,
    matrix,
    prompt: 'Which matrix did that?',
    insight: 'Watch where î and ĵ end up — those two arrows are the columns of the matrix.',
    data: { kind: 'nameMove', options, correctIndex },
  };
}

export function checkNameMove(question: Question, answer: Answer): boolean {
  if (question.data.kind !== 'nameMove') return false;
  if (answer.kind !== 'choice') return false;
  return answer.index === question.data.correctIndex;
}

export const nameMoveMode: ModeDefinition = {
  id: 'nameMove',
  name: 'Name that move',
  generate: generateNameMove,
  check: checkNameMove,
};
