import type { Question, Answer, ModeId } from '../modes/types';

/**
 * idle     — the start screen
 * playing  — a question is up and the clock is running
 * feedback — answered or timed out; the morph replays and the insight shows
 * over    — out of lives, on the results screen
 */
export type Phase = 'idle' | 'playing' | 'feedback' | 'over';

export interface RoundResult {
  readonly correct: boolean;
  readonly timedOut: boolean;
  readonly gained: number;
  readonly answer: Answer;
}

export interface ModeStat {
  readonly asked: number;
  readonly correct: number;
}

export interface GameState {
  readonly phase: Phase;
  readonly question: Question | null;
  readonly roundIndex: number;
  readonly score: number;
  readonly streak: number;
  readonly bestStreak: number;
  readonly lives: number;
  /** Milliseconds left on the clock. */
  readonly timeLeft: number;
  /** How long this round was given, for the speed bonus. */
  readonly duration: number;
  readonly lastResult: RoundResult | null;
  readonly stats: Readonly<Record<ModeId, ModeStat>>;
  /** Advances every round so the generators stay deterministic per run. */
  readonly seed: number;
  /** True while the timer is off — practice mode, or between rounds. */
  readonly untimed: boolean;
}

export type GameAction =
  | { type: 'start'; seed?: number; untimed?: boolean }
  | { type: 'tick'; deltaMs: number }
  | { type: 'answer'; answer: Answer }
  | { type: 'next' }
  | { type: 'quit' };
