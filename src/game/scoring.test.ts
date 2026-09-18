import { describe, expect, it } from 'vitest';
import {
  BASE_POINTS,
  MAX_ROUND_MS,
  MAX_SPEED_BONUS,
  MIN_ROUND_MS,
  roundDurationMs,
  roundScore,
  speedBonus,
  streakMultiplier,
  tierChanceForRound,
  toNextMultiplier,
} from './scoring';

describe('streakMultiplier', () => {
  it('climbs every two correct answers and caps at x4', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 20].map(streakMultiplier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 4]);
  });

  it('never exceeds the cap the brief sets', () => {
    for (let s = 0; s < 500; s++) expect(streakMultiplier(s)).toBeLessThanOrEqual(4);
  });

  it('never goes backwards', () => {
    let prev = 0;
    for (let s = 0; s < 50; s++) {
      const m = streakMultiplier(s);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });
});

describe('toNextMultiplier', () => {
  it('counts down to the next step', () => {
    expect([0, 1, 2, 3, 4, 5].map(toNextMultiplier)).toEqual([2, 1, 2, 1, 2, 1]);
  });

  it('reports 0 at the cap', () => {
    expect(toNextMultiplier(6)).toBe(0);
    expect(toNextMultiplier(99)).toBe(0);
  });
});

describe('roundDurationMs', () => {
  it('starts at 10 seconds', () => {
    expect(roundDurationMs(0)).toBe(MAX_ROUND_MS);
  });

  it('shrinks toward 5 seconds but never below', () => {
    for (let s = 0; s < 200; s++) {
      const d = roundDurationMs(s);
      expect(d).toBeGreaterThanOrEqual(MIN_ROUND_MS);
      expect(d).toBeLessThanOrEqual(MAX_ROUND_MS);
    }
    expect(roundDurationMs(100)).toBe(MIN_ROUND_MS);
  });

  it('is monotonically decreasing', () => {
    let prev = Infinity;
    for (let s = 0; s < 40; s++) {
      const d = roundDurationMs(s);
      expect(d).toBeLessThanOrEqual(prev);
      prev = d;
    }
  });

  it('squeezes gently at first', () => {
    // Still over 8 seconds after two correct answers.
    expect(roundDurationMs(2)).toBeGreaterThan(8000);
  });
});

describe('speedBonus', () => {
  it('is full for an instant answer and zero at the buzzer', () => {
    expect(speedBonus(10_000, 10_000)).toBe(MAX_SPEED_BONUS);
    expect(speedBonus(0, 10_000)).toBe(0);
  });

  it('scales with the fraction of time left', () => {
    expect(speedBonus(5_000, 10_000)).toBe(MAX_SPEED_BONUS / 2);
  });

  it('clamps out-of-range input rather than paying out extra', () => {
    expect(speedBonus(99_999, 10_000)).toBe(MAX_SPEED_BONUS);
    expect(speedBonus(-500, 10_000)).toBe(0);
    expect(speedBonus(1000, 0)).toBe(0);
  });
});

describe('roundScore', () => {
  it('is base points plus the speed bonus at streak 0', () => {
    expect(roundScore(0, 10_000, 10_000)).toBe(BASE_POINTS + MAX_SPEED_BONUS);
  });

  it('multiplies the base but not the bonus, as the brief spells out', () => {
    // 100 * 4 + 25 = 425, not (100 + 25) * 4.
    expect(roundScore(6, 5_000, 10_000)).toBe(BASE_POINTS * 4 + 25);
  });

  it('always beats a lower streak for the same speed', () => {
    for (let s = 1; s < 20; s++) {
      expect(roundScore(s, 5_000, 10_000)).toBeGreaterThanOrEqual(roundScore(s - 1, 5_000, 10_000));
    }
  });

  it('never returns a fraction of a point', () => {
    for (let s = 0; s < 10; s++) {
      for (const t of [0, 1234, 4321, 9999]) {
        expect(Number.isInteger(roundScore(s, t, 10_000))).toBe(true);
      }
    }
  });
});

describe('tierChanceForRound', () => {
  it('keeps the opening rounds on tier 1', () => {
    expect([0, 1, 2, 3].map(tierChanceForRound)).toEqual([0, 0, 0, 0]);
  });

  it('fades tier 2 in and hands over completely by round 12', () => {
    expect(tierChanceForRound(4)).toBeCloseTo(0.125, 6);
    expect(tierChanceForRound(11)).toBe(1);
    expect(tierChanceForRound(50)).toBe(1);
  });

  it('never leaves [0, 1]', () => {
    for (let r = 0; r < 100; r++) {
      const c = tierChanceForRound(r);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});
