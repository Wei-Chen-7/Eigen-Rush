import { useMemo, useState } from 'react';
import type { Vec2 } from '../math/types';
import { Plane } from '../render/Plane';
import { createViewport, toScreen } from '../render/viewport';
import { usePointerWorld } from '../render/usePointerWorld';
import { Tex } from '../ui/Katex';
import { matrixTex, vectorTex } from '../ui/tex';
import { snapToLattice } from './whereLand';
import type { ModeViewProps } from './view';

const SIZE = 320;
const UNITS = 11;

/**
 * M1. The matrix is on screen but the transformed grid is not — the player has
 * to work out where the arrow goes rather than read it off the picture.
 */
export function WhereLandView({ question, t, answered, result, onAnswer }: ModeViewProps) {
  const vp = useMemo(() => createViewport(SIZE, UNITS), []);
  const [tap, setTap] = useState<Vec2 | null>(null);
  const data = question.data.kind === 'whereLand' ? question.data : null;

  const pointer = usePointerWorld(vp, (world, done) => {
    if (answered || data === null) return;
    const point = data.snap ? snapToLattice(world) : world;
    setTap(point);
    if (done) onAnswer({ kind: 'point', at: point });
  });

  if (data === null) return null;

  const marks: { at: Vec2; color: string; label?: string }[] = [
    { at: data.vector, color: 'var(--chalk)', label: 'v' },
  ];

  return (
    <div className="mode-view">
      <Plane
        matrix={question.matrix}
        t={answered ? t : 0}
        size={SIZE}
        unitsAcross={UNITS}
        hideTransformed={!answered}
        vectors={marks}
        svgRef={pointer.svgRef}
        pointerHandlers={pointer.handlers}
        title="Tap where the arrow lands"
      >
        {/* The answer marker, and once the round is over, the right spot. */}
        {tap !== null && !answered && <Crosshair at={tap} vp={vp} className="tap" />}
        {answered && tap !== null && (
          <Crosshair at={tap} vp={vp} className={result?.correct ? 'tap correct' : 'tap wrong'} />
        )}
        {answered && <Crosshair at={data.target} vp={vp} className="tap target" />}
      </Plane>

      <div className="mode-side">
        <Tex>{`${matrixTex(question.matrix, 0)}${vectorTex(data.vector, 0)}`}</Tex>
      </div>
    </div>
  );
}

function Crosshair({
  at,
  vp,
  className,
}: {
  at: Vec2;
  vp: ReturnType<typeof createViewport>;
  className: string;
}) {
  const p = toScreen(vp, at);
  return (
    <g className={`crosshair ${className}`}>
      <circle cx={p.x} cy={p.y} r="9" />
      <line x1={p.x - 13} y1={p.y} x2={p.x + 13} y2={p.y} />
      <line x1={p.x} y1={p.y - 13} x2={p.x} y2={p.y + 13} />
    </g>
  );
}
