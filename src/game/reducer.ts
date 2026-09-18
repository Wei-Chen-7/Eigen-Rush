import { makeRng, pick } from '../math/rng';
import { MODES, checkAnswer, modeById } from '../modes/registry';
import type { Answer, ModeId, Question } from '../modes/types';
import type { Tier } from '../generators/tiers';
import { roundDurationMs, roundScore, STARTING_LIVES, tierChanceForRound } from './scoring';
import type { GameAction, GameState, ModeStat } from './types';

const EMPTY_STATS: Record<ModeId, ModeStat> = {
  whereLand: { asked: 0, correct: 0 },
  nameMove: { asked: 0, correct: 0 },
  eigenHunt: { asked: 0, correct: 0 },
  detDash: { asked: 0, correct: 0 },
};

export const initialState: GameState = {
  phase: 'idle',
  question: null,
  roundIndex: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  lives: STARTING_LIVES,
  timeLeft: 0,
  duration: 0,
  lastResult: null,
  stats: EMPTY_STATS,
  seed: 1,
  untimed: false,
};

/**
 * Builds the next round. The mode is drawn at random but never repeats the one
 * just played — back-to-back rounds of the same mini-game make a run feel
 * shorter than it is.
 */
export function buildRound(
  seed: number,
  roundIndex: number,
  previous: ModeId | null,
): { question: Question; tier: Tier } {
  const rng = makeRng(seed);
  const choices = MODES.filter((m) => m.id !== previous);
  const mode = pick(rng, choices.length > 0 ? choices : MODES);
  const tier: Tier = rng() < tierChanceForRound(roundIndex) ? 2 : 1;
  return { question: modeById(mode.id).generate(rng, tier), tier };
}

/**
 * The whole run, as one pure reducer. Keeping it pure means a run can be
 * replayed action by action in a test — the timer, the scoring, the lives and
 * the difficulty ramp all without rendering anything.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start': {
      const seed = action.seed ?? Math.floor(Math.random() * 2 ** 31);
      const { question } = buildRound(seed, 0, null);
      const duration = roundDurationMs(0);
      return {
        ...initialState,
        phase: 'playing',
        question,
        seed,
        untimed: action.untimed ?? false,
        duration,
        timeLeft: duration,
      };
    }

    case 'tick': {
      if (state.phase !== 'playing' || state.untimed) return state;
      const timeLeft = state.timeLeft - action.deltaMs;
      if (timeLeft > 0) return { ...state, timeLeft };
      return resolve(state, { kind: 'timeout' }, 0);
    }

    case 'answer': {
      if (state.phase !== 'playing') return state;
      return resolve(state, action.answer, state.timeLeft);
    }

    case 'next': {
      if (state.phase !== 'feedback') return state;
      if (state.lives <= 0) return { ...state, phase: 'over' };

      const roundIndex = state.roundIndex + 1;
      const seed = (state.seed * 1664525 + 1013904223) >>> 0;
      const { question } = buildRound(seed, roundIndex, state.question?.mode ?? null);
      const duration = roundDurationMs(state.streak);
      return {
        ...state,
        phase: 'playing',
        question,
        roundIndex,
        seed,
        duration,
        timeLeft: duration,
        lastResult: null,
      };
    }

    case 'quit':
      return { ...state, phase: 'over' };
  }
}

/** Scores an answer, updates the streak and lives, and moves to feedback. */
function resolve(state: GameState, answer: Answer, timeLeft: number): GameState {
  const question = state.question;
  if (question === null) return state;

  const timedOut = answer.kind === 'timeout';
  const correct = checkAnswer(question, answer);
  const gained = correct ? roundScore(state.streak, timeLeft, state.duration) : 0;
  const streak = correct ? state.streak + 1 : 0;
  const lives = correct ? state.lives : state.lives - 1;

  const prev = state.stats[question.mode];
  const stats = {
    ...state.stats,
    [question.mode]: {
      asked: prev.asked + 1,
      correct: prev.correct + (correct ? 1 : 0),
    },
  };

  return {
    ...state,
    phase: 'feedback',
    score: state.score + gained,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    lives,
    timeLeft: Math.max(0, timeLeft),
    stats,
    lastResult: { correct, timedOut, gained, answer },
  };
}
