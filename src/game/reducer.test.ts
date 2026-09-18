import { describe, expect, it } from 'vitest';
import { buildRound, gameReducer, initialState } from './reducer';
import { BASE_POINTS, MAX_ROUND_MS, STARTING_LIVES, roundDurationMs } from './scoring';
import type { GameState } from './types';
import type { Answer } from '../modes/types';
import { checkAnswer } from '../modes/registry';

/** Plays the current round correctly, whatever mini-game it is. */
function rightAnswer(state: GameState): Answer {
  const q = state.question!;
  switch (q.data.kind) {
    case 'whereLand':
      return { kind: 'point', at: q.data.target };
    case 'nameMove':
      return { kind: 'choice', index: q.data.correctIndex };
    case 'detDash':
      if (q.data.question === 'areaScale') return { kind: 'choice', index: q.data.correctIndex };
      return { kind: 'boolean', value: checkBoolean(state) };
    case 'eigenHunt':
      if (q.data.directions.length > 0) return { kind: 'direction', at: q.data.directions[0]! };
      return checkAnswer(q, { kind: 'noRealDirection' })
        ? { kind: 'noRealDirection' }
        : { kind: 'direction', at: { x: 1, y: 0 } };
  }
}

function checkBoolean(state: GameState): boolean {
  return checkAnswer(state.question!, { kind: 'boolean', value: true });
}

const start = (seed = 7) => gameReducer(initialState, { type: 'start', seed });

describe('starting a run', () => {
  it('deals a question and starts the clock at 10 seconds', () => {
    const s = start();
    expect(s.phase).toBe('playing');
    expect(s.question).not.toBeNull();
    expect(s.timeLeft).toBe(MAX_ROUND_MS);
    expect(s.lives).toBe(STARTING_LIVES);
    expect(s.score).toBe(0);
  });

  it('is deterministic for a seed', () => {
    expect(start(42).question).toEqual(start(42).question);
  });

  it('clears everything from a previous run', () => {
    let s = start();
    s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
    const fresh = gameReducer(s, { type: 'start', seed: 7 });
    expect(fresh.score).toBe(0);
    expect(fresh.streak).toBe(0);
    expect(fresh.lives).toBe(STARTING_LIVES);
    expect(fresh.roundIndex).toBe(0);
    expect(fresh.stats.whereLand.asked).toBe(0);
  });
});

describe('the clock', () => {
  it('runs down as it ticks', () => {
    let s = start();
    s = gameReducer(s, { type: 'tick', deltaMs: 1500 });
    expect(s.timeLeft).toBe(MAX_ROUND_MS - 1500);
    expect(s.phase).toBe('playing');
  });

  it('costs a life when it runs out', () => {
    let s = start();
    s = gameReducer(s, { type: 'tick', deltaMs: MAX_ROUND_MS });
    expect(s.phase).toBe('feedback');
    expect(s.lives).toBe(STARTING_LIVES - 1);
    expect(s.lastResult?.timedOut).toBe(true);
    expect(s.lastResult?.correct).toBe(false);
    expect(s.score).toBe(0);
  });

  it('does not run during feedback', () => {
    let s = start();
    s = gameReducer(s, { type: 'tick', deltaMs: MAX_ROUND_MS });
    const before = s;
    s = gameReducer(s, { type: 'tick', deltaMs: 5000 });
    expect(s).toBe(before);
  });

  it('stands still in practice mode', () => {
    let s = gameReducer(initialState, { type: 'start', seed: 7, untimed: true });
    s = gameReducer(s, { type: 'tick', deltaMs: 60_000 });
    expect(s.phase).toBe('playing');
    expect(s.timeLeft).toBe(MAX_ROUND_MS);
    expect(s.lives).toBe(STARTING_LIVES);
  });

  it('never leaves a negative time on the clock', () => {
    let s = start();
    s = gameReducer(s, { type: 'tick', deltaMs: 999_999 });
    expect(s.timeLeft).toBeGreaterThanOrEqual(0);
  });
});

describe('answering', () => {
  it('scores a correct answer and builds the streak', () => {
    let s = start();
    s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
    expect(s.lastResult?.correct).toBe(true);
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(1);
    expect(s.lives).toBe(STARTING_LIVES);
    expect(s.score).toBeGreaterThanOrEqual(BASE_POINTS);
  });

  it('costs a life and resets the streak on a wrong answer', () => {
    let s = start();
    s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
    s = gameReducer(s, { type: 'next' });
    s = gameReducer(s, { type: 'answer', answer: { kind: 'choice', index: -1 } });
    expect(s.lastResult?.correct).toBe(false);
    expect(s.streak).toBe(0);
    expect(s.lives).toBe(STARTING_LIVES - 1);
  });

  it('remembers the best streak even after it breaks', () => {
    let s = start();
    for (let i = 0; i < 3; i++) {
      s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
      s = gameReducer(s, { type: 'next' });
    }
    expect(s.streak).toBe(3);
    s = gameReducer(s, { type: 'answer', answer: { kind: 'choice', index: -1 } });
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(3);
  });

  it('ignores a second answer for the same round', () => {
    let s = start();
    s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
    const after = s;
    s = gameReducer(s, { type: 'answer', answer: { kind: 'choice', index: 0 } });
    expect(s).toBe(after);
  });

  it('pays more for answering fast than slow', () => {
    const fast = gameReducer(start(), { type: 'answer', answer: rightAnswer(start()) });
    let slow = start();
    slow = gameReducer(slow, { type: 'tick', deltaMs: 9_000 });
    slow = gameReducer(slow, { type: 'answer', answer: rightAnswer(slow) });
    expect(fast.score).toBeGreaterThan(slow.score);
  });

  it('tracks per-mini-game accuracy', () => {
    let s = start();
    const mode = s.question!.mode;
    s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
    expect(s.stats[mode]).toEqual({ asked: 1, correct: 1 });
  });
});

describe('moving on', () => {
  it('deals a new question and a shorter clock as the streak grows', () => {
    let s = start();
    s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
    const first = s.question;
    s = gameReducer(s, { type: 'next' });
    expect(s.phase).toBe('playing');
    expect(s.roundIndex).toBe(1);
    expect(s.question).not.toEqual(first);
    expect(s.duration).toBe(roundDurationMs(1));
    expect(s.lastResult).toBeNull();
  });

  it('never deals the same mini-game twice in a row', () => {
    let s = start(1234);
    for (let i = 0; i < 40; i++) {
      const before = s.question!.mode;
      s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
      s = gameReducer(s, { type: 'next' });
      if (s.phase !== 'playing') break;
      expect(s.question!.mode).not.toBe(before);
    }
  });

  it('does nothing unless the round has been answered', () => {
    const s = start();
    expect(gameReducer(s, { type: 'next' })).toBe(s);
  });
});

describe('ending a run', () => {
  it('is over once the third life is gone', () => {
    let s = start();
    for (let i = 0; i < STARTING_LIVES; i++) {
      s = gameReducer(s, { type: 'answer', answer: { kind: 'choice', index: -1 } });
      s = gameReducer(s, { type: 'next' });
    }
    expect(s.phase).toBe('over');
    expect(s.lives).toBe(0);
  });

  it('keeps the score and the best streak on the results screen', () => {
    let s = start();
    s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
    const score = s.score;
    s = gameReducer(s, { type: 'quit' });
    expect(s.phase).toBe('over');
    expect(s.score).toBe(score);
    expect(s.bestStreak).toBe(1);
  });

  it('survives a long correct run without losing a life', () => {
    let s = start(555);
    for (let i = 0; i < 30; i++) {
      s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
      expect(s.lastResult?.correct, `round ${i} (${s.question?.mode})`).toBe(true);
      s = gameReducer(s, { type: 'next' });
    }
    expect(s.lives).toBe(STARTING_LIVES);
    expect(s.bestStreak).toBe(30);
    expect(s.phase).toBe('playing');
  });

  it('reaches tier 2 as the run goes on', () => {
    let s = start(888);
    const tiers = new Set<number>();
    for (let i = 0; i < 25; i++) {
      tiers.add(s.question!.tier);
      s = gameReducer(s, { type: 'answer', answer: rightAnswer(s) });
      s = gameReducer(s, { type: 'next' });
    }
    expect(tiers.has(1)).toBe(true);
    expect(tiers.has(2)).toBe(true);
  });
});

describe('buildRound', () => {
  it('opens on tier 1 so the player finds their feet', () => {
    for (let seed = 1; seed < 40; seed++) {
      expect(buildRound(seed, 0, null).tier).toBe(1);
    }
  });

  it('is always tier 2 once the run is long enough', () => {
    for (let seed = 1; seed < 40; seed++) {
      expect(buildRound(seed, 20, null).tier).toBe(2);
    }
  });

  it('avoids the mode just played', () => {
    for (let seed = 1; seed < 40; seed++) {
      expect(buildRound(seed, 5, 'detDash').question.mode).not.toBe('detDash');
    }
  });
});
