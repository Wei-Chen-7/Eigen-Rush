import { useMemo, useState } from 'react';
import type { Vec2 } from '../math/types';
import { apply } from '../math/mat';
import { isZeroVec, length, normalize, scale } from '../math/vec';
import { Plane } from '../render/Plane';
import { createViewport } from '../render/viewport';
import { usePointerWorld } from '../render/usePointerWorld';
import { eigenLinesFor } from './eigenHunt';
import type { ModeViewProps } from './view';

const SIZE = 320;
const UNITS = 9;
/** How long the dragged arrow is drawn, in world units. */
const ARROW_LENGTH = 2.6;

/**
 * M3. Drag out of the origin and `A u` is drawn alongside live, so the moment
 * the two arrows line up is visible rather than guessed at.
 */
export function EigenHuntView({ question, t, answered, result, onAnswer }: ModeViewProps) {
  const vp = useMemo(() => createViewport(SIZE, UNITS), []);
  const [drag, setDrag] = useState<Vec2 | null>(null);
  const data = question.data.kind === 'eigenHunt' ? question.data : null;

  const pointer = usePointerWorld(vp, (world, done) => {
    if (answered) return;
    if (isZeroVec(world, 0.2)) return; // ignore a stray tap right on the origin
    setDrag(world);
    if (done) onAnswer({ kind: 'direction', at: world });
  });

  if (data === null) return null;

  // Draw the drag at a fixed length so only its direction reads, and the image
  // at its true length so the stretch reads too.
  const u = drag === null ? null : scale(normalize(drag), ARROW_LENGTH);
  const Au = u === null ? null : apply(question.matrix, u);
  const alignedish =
    u !== null && Au !== null && length(Au) > 1e-6
      ? Math.abs(normalize(u).x * normalize(Au).x + normalize(u).y * normalize(Au).y)
      : 0;

  const vectors: { at: Vec2; color: string; label?: string }[] = [];
  if (u !== null) vectors.push({ at: u, color: 'var(--chalk)', label: 'u' });
  if (Au !== null && length(Au) > 0.05) {
    vectors.push({
      at: Au,
      color: alignedish > 0.995 ? 'var(--eigen)' : 'var(--flip)',
      label: 'Au',
    });
  }

  return (
    <div className="mode-view">
      <Plane
        matrix={question.matrix}
        t={t}
        size={SIZE}
        unitsAcross={UNITS}
        showUnitSquare={false}
        vectors={vectors}
        eigenLines={answered ? eigenLinesFor(question) : []}
        svgRef={pointer.svgRef}
        pointerHandlers={pointer.handlers}
        title="Drag to a direction that only stretches"
      />

      <p className="hunt-hint">
        {answered
          ? data.directions.length === 0
            ? 'No real direction survives — every arrow gets turned.'
            : 'The dashed lines are the directions that only stretch.'
          : drag === null
            ? 'Drag out from the middle. Au is drawn as you go.'
            : alignedish > 0.995
              ? 'Lined up — let go.'
              : 'Keep turning until u and Au sit on the same line.'}
      </p>

      <button
        className="no-direction"
        disabled={answered}
        onClick={() => !answered && onAnswer({ kind: 'noRealDirection' })}
      >
        No real direction
        {answered && data.directions.length === 0 && <span className="mark"> ✓</span>}
        {answered && !result?.correct && data.directions.length > 0 && ''}
      </button>
    </div>
  );
}
