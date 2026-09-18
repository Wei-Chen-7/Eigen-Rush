/**
 * Scoring and pacing. Pure functions, so the feel of the run can be tuned and
 * tested without playing it.
 */

/** Points a correct answer is worth before the multiplier. */
export const BASE_POINTS = 100;
/** The most a fast answer can add on top. */
export const MAX_SPEED_BONUS = 50;
/** Lives at the start of a run. */
export const STARTING_LIVES = 3;

export const MAX_ROUND_MS = 10_000;
export const MIN_ROUND_MS = 5_000;

/**
 * The streak multiplier: x1, x2, x3, capped at x4.
 *
 * It climbs every two correct answers, so x4 lands at a streak of six. That is
 * far enough to feel earned and near enough to chase — a slower ramp and most
 * runs would end before the multiplier ever mattered.
 */
export function streakMultiplier(streak: number): 1 | 2 | 3 | 4 {
  if (streak < 2) return 1;
  if (streak < 4) return 2;
  if (streak < 6) return 3;
  return 4;
}

/** How many more correct answers until the multiplier goes up, or 0 at the cap. */
export function toNextMultiplier(streak: number): number {
  if (streak >= 6) return 0;
  return 2 - (streak % 2);
}

/**
 * How long a round lasts, shrinking from 10 s toward 5 s as the streak grows.
 *
 * The decay is geometric rather than linear so the early squeeze is gentle and
 * the floor is approached but never crossed — a run never becomes impossible,
 * only tight.
 */
export function roundDurationMs(streak: number): number {
  const span = MAX_ROUND_MS - MIN_ROUND_MS;
  return Math.round(MIN_ROUND_MS + span * 0.85 ** streak);
}

/** A small bonus for answering early, scaled by the fraction of time left. */
export function speedBonus(timeLeftMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  const fraction = Math.max(0, Math.min(1, timeLeftMs / durationMs));
  return Math.round(MAX_SPEED_BONUS * fraction);
}

/**
 * Points for one correct answer: base times the streak multiplier, plus the
 * speed bonus. `streak` is the streak *before* this answer.
 */
export function roundScore(streak: number, timeLeftMs: number, durationMs: number): number {
  return BASE_POINTS * streakMultiplier(streak) + speedBonus(timeLeftMs, durationMs);
}

/**
 * Which tier a round is drawn from. The first few rounds are tier 1 so the
 * player finds their feet, then tier 2 fades in and has taken over by round 12.
 */
export function tierChanceForRound(roundIndex: number): number {
  if (roundIndex < 4) return 0;
  return Math.min(1, (roundIndex - 3) / 8);
}
