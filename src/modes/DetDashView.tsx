import { useState } from 'react';
import { det } from '../math/mat';
import { Plane } from '../render/Plane';
import { Tex } from '../ui/Katex';
import { matrixTex, num } from '../ui/tex';
import { Choices } from '../ui/Choices';
import type { ModeViewProps } from './view';

/** M4. One matrix, one quick question. The replay works ad − bc out on screen. */
export function DetDashView({ question, t, answered, onAnswer }: ModeViewProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const data = question.data.kind === 'detDash' ? question.data : null;
  if (data === null) return null;

  const m = question.matrix;
  const D = det(m);
  const yesNo = data.question !== 'areaScale';
  const correctBool = data.question === 'flips' ? D < 0 : Math.abs(D) > 1e-9;

  return (
    <div className="mode-view">
      <Plane matrix={m} t={t} size={280} title={question.prompt} />

      <div className="det-matrix">
        <Tex>{matrixTex(m, 0)}</Tex>
      </div>

      {answered && (
        <p className="det-working">
          <Tex>{`\\det A = (${num(m.a, 0)})(${num(m.d, 0)}) - (${num(m.b, 0)})(${num(m.c, 0)}) = ${num(D, 0)}`}</Tex>
        </p>
      )}

      {yesNo ? (
        <Choices
          columns={2}
          options={['Yes', 'No']}
          disabled={answered}
          correctIndex={answered ? (correctBool ? 0 : 1) : undefined}
          pickedIndex={picked ?? undefined}
          onPick={(index) => {
            if (answered) return;
            setPicked(index);
            onAnswer({ kind: 'boolean', value: index === 0 });
          }}
        />
      ) : (
        <Choices
          columns={2}
          options={data.options.map((o, i) => (
            <span key={i} className="area-option">
              ×{num(o, 2)}
            </span>
          ))}
          disabled={answered}
          correctIndex={answered ? data.correctIndex : undefined}
          pickedIndex={picked ?? undefined}
          onPick={(index) => {
            if (answered) return;
            setPicked(index);
            onAnswer({ kind: 'choice', index });
          }}
        />
      )}
    </div>
  );
}
