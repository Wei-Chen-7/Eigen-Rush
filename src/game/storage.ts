import type { ModeId } from '../modes/types';
import type { ModeStat } from './types';

const KEY = 'eigen-rush:v1';

export interface Settings {
  readonly reducedMotion: boolean;
  readonly practice: boolean;
}

export interface SaveData {
  readonly highScore: number;
  readonly bestStreak: number;
  readonly runs: number;
  readonly lifetime: Partial<Record<ModeId, ModeStat>>;
  readonly settings: Settings;
}

export const EMPTY_SAVE: SaveData = {
  highScore: 0,
  bestStreak: 0,
  runs: 0,
  lifetime: {},
  settings: { reducedMotion: false, practice: false },
};

/**
 * Reads the save. Every failure path returns the empty save rather than
 * throwing: localStorage is unavailable in private windows and can hold
 * anything a previous version wrote, and neither should stop someone playing.
 */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return EMPTY_SAVE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_SAVE;
    const p = parsed as Partial<SaveData>;
    return {
      highScore: num(p.highScore),
      bestStreak: num(p.bestStreak),
      runs: num(p.runs),
      lifetime: typeof p.lifetime === 'object' && p.lifetime !== null ? p.lifetime : {},
      settings: {
        reducedMotion: p.settings?.reducedMotion === true,
        practice: p.settings?.practice === true,
      },
    };
  } catch {
    return EMPTY_SAVE;
  }
}

export function saveSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked. The run still counts; it just is not remembered.
  }
}

/** Folds a finished run into the save, keeping the better of each record. */
export function recordRun(
  save: SaveData,
  run: { score: number; bestStreak: number; stats: Record<ModeId, ModeStat> },
): SaveData {
  const lifetime: Partial<Record<ModeId, ModeStat>> = { ...save.lifetime };
  for (const [id, stat] of Object.entries(run.stats) as [ModeId, ModeStat][]) {
    const prev = lifetime[id] ?? { asked: 0, correct: 0 };
    lifetime[id] = { asked: prev.asked + stat.asked, correct: prev.correct + stat.correct };
  }
  return {
    ...save,
    highScore: Math.max(save.highScore, run.score),
    bestStreak: Math.max(save.bestStreak, run.bestStreak),
    runs: save.runs + 1,
    lifetime,
  };
}

/** Accuracy as a percentage, or `null` when the mini-game has not come up. */
export function accuracy(stat: ModeStat | undefined): number | null {
  if (stat === undefined || stat.asked === 0) return null;
  return Math.round((stat.correct / stat.asked) * 100);
}

const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
