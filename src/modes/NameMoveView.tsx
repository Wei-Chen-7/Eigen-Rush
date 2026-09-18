import { useState } from 'react';
import { Plane } from '../render/Plane';
import { Tex } from '../ui/Katex';
import { matrixTex } from '../ui/tex';
import { Choices } from '../ui/Choices';
import type { ModeViewProps } from './view';

/** M2. The morph plays; the matrix that did it is not shown until after. */
export function NameMoveView({ question, t, answered, onAnswer }: ModeViewProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const data = question.data.kind === 'nameMove' ? question.data : null;
  if (data === null) return null;

  return (
    <div className="mode-view">
      <Plane matrix={question.matrix} t={t} size={300} title="Which matrix did that?" />

      <Choices
        columns={2}
        options={data.options.map((m, i) => (
          <Tex key={i}>{matrixTex(m, 0)}</Tex>
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
    </div>
  );
}
