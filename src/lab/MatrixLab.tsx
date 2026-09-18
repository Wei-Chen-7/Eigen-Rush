import { useMemo, useState } from 'react';
import type { Mat2 } from '../math/types';
import { det, mat, rank, trace } from '../math/mat';
import { eigen } from '../math/eigen';
import { describe } from '../math/describe';
import { morphIsRotational } from '../math/morph';
import { Plane, type EigenLine } from '../render/Plane';
import { useMorph } from '../render/useMorph';
import { Tex } from '../ui/Katex';
import { matrixTex, num } from '../ui/tex';
import { PRESETS } from './presets';
import './lab.css';

type Entry = 'a' | 'b' | 'c' | 'd';
const ENTRIES: readonly Entry[] = ['a', 'b', 'c', 'd'];

/** Kept as strings so half-typed values like "-" or "1." survive a keystroke. */
type Draft = Record<Entry, string>;

const toDraft = (m: Mat2): Draft => ({
  a: String(m.a),
  b: String(m.b),
  c: String(m.c),
  d: String(m.d),
});

function parseDraft(draft: Draft): Mat2 {
  const read = (s: string): number => {
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };
  return mat(read(draft.a), read(draft.b), read(draft.c), read(draft.d));
}

/**
 * The debug page: type any 2x2 matrix and watch it transform. Also the quickest
 * way to sanity-check the maths core against the picture.
 */
export function MatrixLab() {
  const [draft, setDraft] = useState<Draft>(() => toDraft(mat(2, 1, 1, 2)));
  const matrix = useMemo(() => parseDraft(draft), [draft]);
  const morph = useMorph();

  const e = useMemo(() => eigen(matrix), [matrix]);
  const D = det(matrix);

  const eigenLines: EigenLine[] = useMemo(() => {
    if (e.kind !== 'real') return [];
    if (e.scalar) return []; // every direction qualifies; drawing two would mislead
    const lines: EigenLine[] = [{ direction: e.vectors[0], label: `λ = ${num(e.values[0])}` }];
    if (!e.defective) {
      lines.push({ direction: e.vectors[1], label: `λ = ${num(e.values[1])}` });
    }
    return lines;
  }, [e]);

  const load = (m: Mat2) => {
    setDraft(toDraft(m));
    morph.play();
  };

  return (
    <div className="lab stack">
      <div className="stage">
        <Plane
          matrix={matrix}
          t={morph.t}
          size={320}
          eigenLines={eigenLines}
          title={`The plane under ${describe(matrix)}`}
        />
      </div>

      <p className="lab-caption">{describe(matrix)}</p>

      <div className="lab-entry">
        <div className="lab-bracket" aria-hidden="true" />
        <div className="lab-grid">
          {ENTRIES.map((key) => (
            <label key={key} className="lab-cell">
              <span className="sr-only">{`entry ${key}`}</span>
              <input
                inputMode="decimal"
                value={draft[key]}
                onChange={(ev) => setDraft((prev) => ({ ...prev, [key]: ev.target.value }))}
                onFocus={(ev) => ev.target.select()}
                aria-label={`Matrix entry ${key}`}
              />
            </label>
          ))}
        </div>
        <div className="lab-bracket right" aria-hidden="true" />
      </div>

      <div className="row spread">
        <button onClick={morph.play} disabled={morph.isPlaying}>
          Replay the morph
        </button>
        <label className="scrub">
          <span className="label">Scrub</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={morph.t}
            onChange={(ev) => morph.seek(Number(ev.target.value))}
            aria-label="Scrub the morph"
          />
        </label>
      </div>

      <dl className="readout">
        <div>
          <dt>det</dt>
          <dd>{num(D, 3)}</dd>
        </div>
        <div>
          <dt>trace</dt>
          <dd>{num(trace(matrix), 3)}</dd>
        </div>
        <div>
          <dt>rank</dt>
          <dd>{rank(matrix)}</dd>
        </div>
        <div>
          <dt>area scale</dt>
          <dd>{num(Math.abs(D), 3)}</dd>
        </div>
      </dl>

      <div className="eigen-readout">
        <span className="label">Eigenvalues</span>
        {e.kind === 'complex' ? (
          <p>
            <Tex>{`\\lambda = ${num(e.re)} \\pm ${num(e.im)}i`}</Tex> — no real direction is fixed.
            Repeated use spirals, growing by {num(e.modulus)} and turning{' '}
            {num((e.argument * 180) / Math.PI, 1)}° each step.
          </p>
        ) : e.scalar ? (
          <p>
            <Tex>{`\\lambda = ${num(e.values[0])}`}</Tex> twice, and{' '}
            <Tex>{`A = ${num(e.values[0])}I`}</Tex> — every direction is an eigenvector.
          </p>
        ) : e.defective ? (
          <p>
            <Tex>{`\\lambda = ${num(e.values[0])}`}</Tex> twice, but only one eigen-direction. The
            matrix is defective.
          </p>
        ) : (
          <p>
            <Tex>{`\\lambda_1 = ${num(e.values[0])},\\ \\lambda_2 = ${num(e.values[1])}`}</Tex>
            {' — '}
            they sum to the trace and multiply to the determinant.
          </p>
        )}
      </div>

      <details className="lab-detail">
        <summary>What the morph is doing</summary>
        <p>
          {morphIsRotational(matrix) ? (
            <>
              This is a rotation (possibly with a uniform scale), so the angle is interpolated
              rather than the entries. The grid turns at a steady size instead of shrinking through
              the middle.
            </>
          ) : (
            <>
              <Tex>{`M(t) = (1-t)I + tA`}</Tex> over 600 ms.{' '}
              {D < 0 &&
                'The determinant is negative, so the plane passes through a flat frame and lands mirrored.'}
            </>
          )}
        </p>
        <p className="mono">
          <Tex display>{`A = ${matrixTex(matrix, 3)}`}</Tex>
        </p>
      </details>

      <div className="presets">
        <span className="label">Presets</span>
        <div className="preset-list">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => load(p.matrix)} title={p.note}>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
