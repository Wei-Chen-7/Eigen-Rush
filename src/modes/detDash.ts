import { det } from '../math/mat';
import { pick, shuffle, type Rng } from '../math/rng';
import { generateMatrix } from '../generators/matrices';
import type { Tier } from '../generators/tiers';
import type { Answer, DetQuestion, ModeDefinition, Question } from './types';

const PROMPTS: Record<DetQuestion, string> = {
  flips: 'Does it flip the plane over?',
  invertible: 'Can it be undone?',
  areaScale: 'How much does area scale?',
};

const INSIGHTS: Record<DetQuestion, string> = {
  flips: 'A negative determinant means the plane got turned over.',
  invertible: 'A transform can be undone exactly when its determinant is not zero.',
  areaScale: 'Area scales by |det A| — that is what the determinant measures.',
};

/**
 * M4, "Det dash": one matrix, one quick question about its determinant. The
 * replay works `ad − bc` out on screen.
 */
export function generateDetDash(rng: Rng, tier: Tier): Question {
  const { matrix } = generateMatrix(rng, tier);
  const question = pick(rng, ['flips', 'invertible', 'areaScale'] as const);
  const area = Math.abs(det(matrix));

  let options: number[] = [];
  let correctIndex = -1;
  if (question === 'areaScale') {
    options = shuffle(rng, [area, ...areaDistractors(area)]);
    correctIndex = options.indexOf(area);
  }

  return {
    mode: 'detDash',
    tier,
    matrix,
    prompt: PROMPTS[question],
    insight: INSIGHTS[question],
    data: { kind: 'detDash', question, options, correctIndex },
  };
}

/**
 * Three wrong areas, near enough that the round needs the arithmetic rather
 * than the eye. The pool runs wider than three so that small areas — where the
 * neighbours below zero are not usable — still fill out a full set; an area of
 * 0 would otherwise yield only two options and give the answer away by shape.
 * Negative areas are never offered: |det A| cannot be negative, so such an
 * option is not a plausible mistake, it is a tell.
 */
export function areaDistractors(area: number): number[] {
  const candidates = [
    area + 1,
    area - 1,
    area * 2,
    area + 2,
    area - 2,
    area + 3,
    area * 3,
    area + 4,
    area + 5,
    area + 6,
  ];
  const out: number[] = [];
  for (const n of candidates) {
    if (out.length === 3) break;
    if (n < 0) continue;
    if (Math.abs(n - area) < 1e-9) continue;
    if (out.some((o) => Math.abs(o - n) < 1e-9)) continue;
    out.push(n);
  }
  return out;
}

export function checkDetDash(question: Question, answer: Answer): boolean {
  if (question.data.kind !== 'detDash') return false;
  const D = det(question.matrix);

  switch (question.data.question) {
    case 'flips':
      return answer.kind === 'boolean' && answer.value === D < 0;
    case 'invertible':
      return answer.kind === 'boolean' && answer.value === Math.abs(D) > 1e-9;
    case 'areaScale':
      return answer.kind === 'choice' && answer.index === question.data.correctIndex;
  }
}

export const detDashMode: ModeDefinition = {
  id: 'detDash',
  name: 'Det dash',
  generate: generateDetDash,
  check: checkDetDash,
};
