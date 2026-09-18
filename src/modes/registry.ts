import type { ModeDefinition, ModeId, Question, Answer } from './types';
import { whereLandMode } from './whereLand';
import { nameMoveMode } from './nameMove';
import { eigenHuntMode } from './eigenHunt';
import { detDashMode } from './detDash';

/** Every mini-game the arcade can draw from. Milestone 2 unlocks M1 to M4. */
export const MODES: readonly ModeDefinition[] = [
  whereLandMode,
  nameMoveMode,
  eigenHuntMode,
  detDashMode,
];

export const MODE_IDS = MODES.map((m) => m.id);

export function modeById(id: ModeId): ModeDefinition {
  const found = MODES.find((m) => m.id === id);
  if (!found) throw new Error(`unknown mode: ${id}`);
  return found;
}

/** Runs the right checker for whichever mini-game the question came from. */
export function checkAnswer(question: Question, answer: Answer): boolean {
  if (answer.kind === 'timeout') return false;
  return modeById(question.mode).check(question, answer);
}
