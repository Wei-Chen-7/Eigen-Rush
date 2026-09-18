import { describe, expect, it } from 'vitest';
import { checkWhereLand, generateWhereLand, snapToLattice } from './whereLand';
import { checkNameMove, distractorsFor, generateNameMove, visiblyDifferent } from './nameMove';
import { checkEigenHunt, eigenLinesFor, generateEigenHunt } from './eigenHunt';
import { areaDistractors, checkDetDash, generateDetDash } from './detDash';
import { checkAnswer, MODES, modeById } from './registry';
import type { Question } from './types';
import { makeRng } from '../math/rng';
import { apply, det, eqMat, mat, rotationDeg, scaling } from '../math/mat';
import { eigen } from '../math/eigen';
import { vec } from '../math/vec';
import { satisfiesTier } from '../generators/tiers';

const TIERS = [1, 2] as const;

describe('M1 where does it land', () => {
  it('always has a reachable target on the plane', () => {
    const rng = makeRng(101);
    for (const tier of TIERS) {
      for (let i = 0; i < 500; i++) {
        const q = generateWhereLand(rng, tier);
        if (q.data.kind !== 'whereLand') throw new Error('wrong payload');
        expect(Math.hypot(q.data.target.x, q.data.target.y)).toBeLessThanOrEqual(4.5);
        expect(q.data.vector).not.toEqual(vec(0, 0));
        expect(satisfiesTier(q.matrix, tier)).toBe(true);
      }
    }
  });

  it('sets the target to A v, not something else', () => {
    const rng = makeRng(102);
    for (let i = 0; i < 300; i++) {
      const q = generateWhereLand(rng, 2);
      if (q.data.kind !== 'whereLand') throw new Error('wrong payload');
      expect(q.data.target).toEqual(apply(q.matrix, q.data.vector));
    }
  });

  it('accepts the exact right point', () => {
    const rng = makeRng(103);
    for (let i = 0; i < 300; i++) {
      const q = generateWhereLand(rng, 2);
      if (q.data.kind !== 'whereLand') throw new Error('wrong payload');
      expect(checkWhereLand(q, { kind: 'point', at: q.data.target })).toBe(true);
    }
  });

  it('rejects a point one lattice step away', () => {
    const rng = makeRng(104);
    for (let i = 0; i < 300; i++) {
      const q = generateWhereLand(rng, 2);
      if (q.data.kind !== 'whereLand') throw new Error('wrong payload');
      const off = vec(q.data.target.x + 1, q.data.target.y);
      expect(checkWhereLand(q, { kind: 'point', at: off })).toBe(false);
    }
  });

  it('forgives a sloppy tap by snapping to the lattice', () => {
    const rng = makeRng(105);
    const q = generateWhereLand(rng, 2);
    if (q.data.kind !== 'whereLand') throw new Error('wrong payload');
    const sloppy = vec(q.data.target.x + 0.31, q.data.target.y - 0.29);
    expect(checkWhereLand(q, { kind: 'point', at: sloppy })).toBe(true);
  });

  it('rejects a timeout and a wrong answer shape', () => {
    const rng = makeRng(106);
    const q = generateWhereLand(rng, 1);
    expect(checkWhereLand(q, { kind: 'timeout' })).toBe(false);
    expect(checkWhereLand(q, { kind: 'choice', index: 0 })).toBe(false);
  });

  it('snaps to the nearest lattice point, including across zero', () => {
    expect(snapToLattice(vec(1.4, -2.6))).toEqual(vec(1, -3));
    expect(snapToLattice(vec(-0.2, 0.2))).toEqual(vec(-0, 0));
  });
});

describe('M2 name that move', () => {
  it('always offers exactly four options', () => {
    const rng = makeRng(201);
    for (const tier of TIERS) {
      for (let i = 0; i < 400; i++) {
        const q = generateNameMove(rng, tier);
        if (q.data.kind !== 'nameMove') throw new Error('wrong payload');
        expect(q.data.options).toHaveLength(4);
      }
    }
  });

  it('includes the right answer and points at it', () => {
    const rng = makeRng(202);
    for (let i = 0; i < 400; i++) {
      const q = generateNameMove(rng, 2);
      if (q.data.kind !== 'nameMove') throw new Error('wrong payload');
      expect(q.data.correctIndex).toBeGreaterThanOrEqual(0);
      expect(eqMat(q.data.options[q.data.correctIndex]!, q.matrix, 1e-9)).toBe(true);
    }
  });

  it('keeps all four options distinct as matrices', () => {
    const rng = makeRng(203);
    for (const tier of TIERS) {
      for (let i = 0; i < 400; i++) {
        const q = generateNameMove(rng, tier);
        if (q.data.kind !== 'nameMove') throw new Error('wrong payload');
        const keys = new Set(q.data.options.map((m) => `${m.a},${m.b},${m.c},${m.d}`));
        expect(keys.size).toBe(4);
      }
    }
  });

  it('keeps all four visibly different, so the round is not a coin toss', () => {
    const rng = makeRng(204);
    for (const tier of TIERS) {
      for (let i = 0; i < 300; i++) {
        const q = generateNameMove(rng, tier);
        if (q.data.kind !== 'nameMove') throw new Error('wrong payload');
        const opts = q.data.options;
        for (let a = 0; a < opts.length; a++) {
          for (let b = a + 1; b < opts.length; b++) {
            expect(visiblyDifferent(opts[a]!, opts[b]!), `${JSON.stringify(opts)}`).toBe(true);
          }
        }
      }
    }
  });

  it('accepts the right index and rejects the others', () => {
    const rng = makeRng(205);
    for (let i = 0; i < 200; i++) {
      const q = generateNameMove(rng, 2);
      if (q.data.kind !== 'nameMove') throw new Error('wrong payload');
      expect(checkNameMove(q, { kind: 'choice', index: q.data.correctIndex })).toBe(true);
      for (let k = 0; k < 4; k++) {
        if (k === q.data.correctIndex) continue;
        expect(checkNameMove(q, { kind: 'choice', index: k })).toBe(false);
      }
    }
  });

  it('builds the misreadings a player actually makes', () => {
    const A = mat(1, 2, 3, 4);
    const ds = distractorsFor(A);
    expect(ds).toContainEqual(mat(1, 3, 2, 4)); // the transpose
    expect(ds).toContainEqual(mat(2, 1, 4, 3)); // swapped columns
  });

  it('calls a matrix different from itself not different', () => {
    expect(visiblyDifferent(mat(1, 2, 3, 4), mat(1, 2, 3, 4))).toBe(false);
  });

  it('spots a difference big enough to see', () => {
    expect(visiblyDifferent(rotationDeg(90), rotationDeg(180))).toBe(true);
    expect(visiblyDifferent(scaling(1), scaling(3))).toBe(true);
  });
});

describe('M3 eigen hunt', () => {
  it('accepts a drag along either eigen-direction', () => {
    const rng = makeRng(301);
    let checked = 0;
    for (let i = 0; i < 600 && checked < 200; i++) {
      const q = generateEigenHunt(rng, 2);
      if (q.data.kind !== 'eigenHunt' || q.data.directions.length === 0) continue;
      for (const d of q.data.directions) {
        expect(checkEigenHunt(q, { kind: 'direction', at: d })).toBe(true);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('treats u and -u as the same line', () => {
    const rng = makeRng(302);
    for (let i = 0; i < 400; i++) {
      const q = generateEigenHunt(rng, 2);
      if (q.data.kind !== 'eigenHunt' || q.data.directions.length === 0) continue;
      const d = q.data.directions[0]!;
      expect(checkEigenHunt(q, { kind: 'direction', at: vec(-d.x, -d.y) })).toBe(true);
      // Length must not matter either — a long drag is the same line.
      expect(checkEigenHunt(q, { kind: 'direction', at: vec(d.x * 7, d.y * 7) })).toBe(true);
    }
  });

  it('accepts a drag just inside the tolerance and rejects one just outside', () => {
    const q: Question = {
      mode: 'eigenHunt',
      tier: 2,
      matrix: scaling(2, 3),
      prompt: '',
      insight: '',
      data: { kind: 'eigenHunt', directions: [vec(1, 0)], values: [2], toleranceDeg: 6 },
    };
    const at = (deg: number) =>
      vec(Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180));
    expect(checkEigenHunt(q, { kind: 'direction', at: at(5.5) })).toBe(true);
    expect(checkEigenHunt(q, { kind: 'direction', at: at(6.5) })).toBe(false);
  });

  it('accepts any direction when A = cI', () => {
    const q: Question = {
      mode: 'eigenHunt',
      tier: 2,
      matrix: scaling(3),
      prompt: '',
      insight: '',
      data: { kind: 'eigenHunt', directions: [], values: [3, 3], toleranceDeg: 6 },
    };
    for (const d of [vec(1, 0), vec(0, 1), vec(1, 1), vec(-2, 5)]) {
      expect(checkEigenHunt(q, { kind: 'direction', at: d })).toBe(true);
    }
  });

  it('wants the button, not a drag, when there is no real direction', () => {
    const q: Question = {
      mode: 'eigenHunt',
      tier: 1,
      matrix: rotationDeg(90),
      prompt: '',
      insight: '',
      data: { kind: 'eigenHunt', directions: [], values: [], toleranceDeg: 6 },
    };
    expect(checkEigenHunt(q, { kind: 'noRealDirection' })).toBe(true);
    for (const d of [vec(1, 0), vec(1, 1), vec(0, 1)]) {
      expect(checkEigenHunt(q, { kind: 'direction', at: d })).toBe(false);
    }
  });

  it('rejects the button when there is a real direction', () => {
    const rng = makeRng(303);
    for (let i = 0; i < 300; i++) {
      const q = generateEigenHunt(rng, 2);
      if (eigen(q.matrix).kind === 'complex') continue;
      expect(checkEigenHunt(q, { kind: 'noRealDirection' })).toBe(false);
    }
  });

  it('rejects a drag that never left the origin', () => {
    const rng = makeRng(304);
    const q = generateEigenHunt(rng, 2);
    expect(checkEigenHunt(q, { kind: 'direction', at: vec(0, 0) })).toBe(false);
  });

  it('rejects a timeout', () => {
    const rng = makeRng(305);
    expect(checkEigenHunt(generateEigenHunt(rng, 2), { kind: 'timeout' })).toBe(false);
  });

  it('never poses a defective matrix below tier 3', () => {
    const rng = makeRng(306);
    for (const tier of TIERS) {
      for (let i = 0; i < 400; i++) {
        const e = eigen(generateEigenHunt(rng, tier).matrix);
        expect(e.kind === 'real' && e.defective).toBe(false);
      }
    }
  });

  it('does sometimes pose a no-real-direction round, so the button matters', () => {
    const rng = makeRng(307);
    let complex = 0;
    for (let i = 0; i < 400; i++) {
      if (eigen(generateEigenHunt(rng, 2).matrix).kind === 'complex') complex++;
    }
    expect(complex).toBeGreaterThan(50);
    expect(complex).toBeLessThan(200);
  });

  it('labels both eigen-lines for the replay', () => {
    const rng = makeRng(308);
    for (let i = 0; i < 200; i++) {
      const q = generateEigenHunt(rng, 2);
      if (q.data.kind !== 'eigenHunt' || q.data.directions.length === 0) continue;
      const lines = eigenLinesFor(q);
      expect(lines).toHaveLength(q.data.directions.length);
      for (const l of lines) expect(l.label).toMatch(/^λ = -?\d/);
    }
  });
});

describe('M4 det dash', () => {
  it('answers "does it flip" from the sign of the determinant', () => {
    const rng = makeRng(401);
    for (let i = 0; i < 600; i++) {
      const q = generateDetDash(rng, 2);
      if (q.data.kind !== 'detDash' || q.data.question !== 'flips') continue;
      const flips = det(q.matrix) < 0;
      expect(checkDetDash(q, { kind: 'boolean', value: flips })).toBe(true);
      expect(checkDetDash(q, { kind: 'boolean', value: !flips })).toBe(false);
    }
  });

  it('answers "can it be undone" from the determinant being non-zero', () => {
    const rng = makeRng(402);
    for (let i = 0; i < 600; i++) {
      const q = generateDetDash(rng, 2);
      if (q.data.kind !== 'detDash' || q.data.question !== 'invertible') continue;
      const undoable = Math.abs(det(q.matrix)) > 1e-9;
      expect(checkDetDash(q, { kind: 'boolean', value: undoable })).toBe(true);
      expect(checkDetDash(q, { kind: 'boolean', value: !undoable })).toBe(false);
    }
  });

  it('offers four distinct areas with |det A| among them', () => {
    const rng = makeRng(403);
    for (let i = 0; i < 600; i++) {
      const q = generateDetDash(rng, 2);
      if (q.data.kind !== 'detDash' || q.data.question !== 'areaScale') continue;
      expect(q.data.options).toHaveLength(4);
      expect(new Set(q.data.options).size).toBe(4);
      expect(q.data.options[q.data.correctIndex]).toBeCloseTo(Math.abs(det(q.matrix)), 9);
      expect(q.data.options.every((o) => o >= 0)).toBe(true);
    }
  });

  it('accepts the right area and rejects the rest', () => {
    const rng = makeRng(404);
    for (let i = 0; i < 400; i++) {
      const q = generateDetDash(rng, 2);
      if (q.data.kind !== 'detDash' || q.data.question !== 'areaScale') continue;
      expect(checkDetDash(q, { kind: 'choice', index: q.data.correctIndex })).toBe(true);
      for (let k = 0; k < 4; k++) {
        if (k === q.data.correctIndex) continue;
        expect(checkDetDash(q, { kind: 'choice', index: k })).toBe(false);
      }
    }
  });

  it('rejects the wrong answer shape and a timeout', () => {
    const rng = makeRng(405);
    for (let i = 0; i < 200; i++) {
      const q = generateDetDash(rng, 2);
      expect(checkDetDash(q, { kind: 'timeout' })).toBe(false);
    }
  });

  it('never offers a negative area as a distractor', () => {
    for (const area of [0, 1, 2, 6, 12]) {
      for (const d of areaDistractors(area)) expect(d).toBeGreaterThanOrEqual(0);
    }
  });

  it('never repeats the right answer among the distractors', () => {
    for (const area of [0, 1, 2, 3, 4, 6, 8, 9, 12]) {
      const ds = areaDistractors(area);
      expect(ds).toHaveLength(3);
      expect(new Set(ds).size).toBe(3);
      for (const d of ds) expect(Math.abs(d - area)).toBeGreaterThan(1e-9);
    }
  });
});

describe('registry', () => {
  it('holds all four mini-games', () => {
    expect(MODES).toHaveLength(4);
    expect(MODES.map((m) => m.id).sort()).toEqual([
      'detDash',
      'eigenHunt',
      'nameMove',
      'whereLand',
    ]);
  });

  it('routes an answer to the right checker', () => {
    const rng = makeRng(501);
    const q = generateWhereLand(rng, 2);
    if (q.data.kind !== 'whereLand') throw new Error('wrong payload');
    expect(checkAnswer(q, { kind: 'point', at: q.data.target })).toBe(true);
  });

  it('counts a timeout as wrong for every mini-game', () => {
    const rng = makeRng(502);
    for (const mode of MODES) {
      const q = mode.generate(rng, 2);
      expect(checkAnswer(q, { kind: 'timeout' })).toBe(false);
    }
  });

  it('throws on an unknown mode rather than failing quietly', () => {
    // @ts-expect-error deliberately wrong id
    expect(() => modeById('nope')).toThrow();
  });

  it('gives every generated question a prompt and an insight', () => {
    const rng = makeRng(503);
    for (const mode of MODES) {
      for (const tier of TIERS) {
        for (let i = 0; i < 100; i++) {
          const q = mode.generate(rng, tier);
          expect(q.prompt.length).toBeGreaterThan(0);
          expect(q.insight.length).toBeGreaterThan(0);
          expect(q.mode).toBe(mode.id);
        }
      }
    }
  });
});
