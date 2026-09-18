import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_SAVE, accuracy, loadSave, recordRun, saveSave } from './storage';
import type { ModeId } from '../modes/types';
import type { ModeStat } from './types';

/** A minimal in-memory stand-in, so these tests do not need a browser. */
function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});

const stats: Record<ModeId, ModeStat> = {
  whereLand: { asked: 4, correct: 3 },
  nameMove: { asked: 2, correct: 2 },
  eigenHunt: { asked: 0, correct: 0 },
  detDash: { asked: 1, correct: 0 },
};

describe('loadSave', () => {
  it('returns the empty save when nothing is stored', () => {
    expect(loadSave()).toEqual(EMPTY_SAVE);
  });

  it('round-trips a save', () => {
    const data = recordRun(EMPTY_SAVE, { score: 900, bestStreak: 5, stats });
    saveSave(data);
    expect(loadSave()).toEqual(data);
  });

  it('survives corrupt JSON rather than throwing', () => {
    localStorage.setItem('eigen-rush:v1', '{not json');
    expect(loadSave()).toEqual(EMPTY_SAVE);
  });

  it('survives a stored value of the wrong shape', () => {
    localStorage.setItem('eigen-rush:v1', '"a string"');
    expect(loadSave()).toEqual(EMPTY_SAVE);
    localStorage.setItem('eigen-rush:v1', 'null');
    expect(loadSave()).toEqual(EMPTY_SAVE);
  });

  it('coerces junk fields to something usable', () => {
    localStorage.setItem('eigen-rush:v1', JSON.stringify({ highScore: 'lots', runs: NaN }));
    const s = loadSave();
    expect(s.highScore).toBe(0);
    expect(s.runs).toBe(0);
  });

  it('keeps playing when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadSave()).toEqual(EMPTY_SAVE);
    expect(() => saveSave(EMPTY_SAVE)).not.toThrow();
  });
});

describe('recordRun', () => {
  it('keeps the better high score and best streak', () => {
    let save = recordRun(EMPTY_SAVE, { score: 500, bestStreak: 4, stats });
    expect(save.highScore).toBe(500);
    save = recordRun(save, { score: 200, bestStreak: 9, stats });
    expect(save.highScore).toBe(500);
    expect(save.bestStreak).toBe(9);
  });

  it('counts runs and adds up lifetime stats', () => {
    let save = recordRun(EMPTY_SAVE, { score: 1, bestStreak: 1, stats });
    save = recordRun(save, { score: 1, bestStreak: 1, stats });
    expect(save.runs).toBe(2);
    expect(save.lifetime.whereLand).toEqual({ asked: 8, correct: 6 });
  });

  it('leaves the previous save untouched', () => {
    const before = structuredClone(EMPTY_SAVE);
    recordRun(EMPTY_SAVE, { score: 999, bestStreak: 9, stats });
    expect(EMPTY_SAVE).toEqual(before);
  });
});

describe('accuracy', () => {
  it('reports a percentage', () => {
    expect(accuracy({ asked: 4, correct: 3 })).toBe(75);
    expect(accuracy({ asked: 3, correct: 3 })).toBe(100);
  });

  it('is null when the mini-game never came up, rather than 0 or NaN', () => {
    expect(accuracy({ asked: 0, correct: 0 })).toBeNull();
    expect(accuracy(undefined)).toBeNull();
  });
});
