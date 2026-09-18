import { useId, useMemo } from 'react';
import type { Mat2, Vec2 } from '../math/types';
import { IDENTITY, columns, det } from '../math/mat';
import { morphAt } from '../math/morph';
import { length, normalize, vec } from '../math/vec';
import { arrow, gridFamilyPath, lineThroughOrigin, trailPath, unitSquarePoints } from './paths';
import { createViewport, toScreen, type Viewport } from './viewport';
import './plane.css';

export interface EigenLine {
  readonly direction: Vec2;
  readonly label?: string;
}

export interface PlaneProps {
  /** The transformation being shown. */
  matrix: Mat2;
  /** Morph progress in `[0, 1]`. 0 is the identity, 1 is `matrix`. */
  t?: number;
  /** Viewport size in CSS pixels. */
  size?: number;
  /** How many world units fit across the viewport. */
  unitsAcross?: number;
  /** Draw the shaded image of the unit square. */
  showUnitSquare?: boolean;
  /** Draw the i-hat and j-hat arrows. */
  showBasis?: boolean;
  /** Eigen-direction lines to overlay, drawn dashed as well as coloured. */
  eigenLines?: readonly EigenLine[];
  /** Extra vectors to draw, for example `v` and `A v`. */
  vectors?: readonly { at: Vec2; color: string; label?: string }[];
  /** A trail of points, for orbits like `v, A v, A^2 v, ...`. */
  trail?: readonly Vec2[];
  /** Accessible description of what is on screen. */
  title?: string;
  /** Set by the interactive modes so taps and drags reach the plane. */
  svgRef?: React.Ref<SVGSVGElement>;
  pointerHandlers?: {
    onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerMove?: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp?: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerCancel?: (e: React.PointerEvent<SVGSVGElement>) => void;
  };
  /** Hides the transformed grid — for rounds where it would give the answer. */
  hideTransformed?: boolean;
  children?: React.ReactNode;
}

const GRID_EXTENT = 8;

/**
 * The plane: a faint reference grid, the transformed grid, the image of the unit
 * square, and the basis vectors as two arrows.
 *
 * The shaded square's area is |det A|. When the determinant is negative the
 * plane has been turned over, so the square is tinted differently *and* hatched
 * — the tint alone would leave colour carrying the meaning.
 */
export function Plane({
  matrix,
  t = 1,
  size = 320,
  unitsAcross = 9,
  showUnitSquare = true,
  showBasis = true,
  eigenLines = [],
  vectors = [],
  trail,
  title,
  svgRef,
  pointerHandlers,
  hideTransformed = false,
  children,
}: PlaneProps) {
  const uid = useId().replace(/:/g, '');
  const vp = useMemo(() => createViewport(size, unitsAcross), [size, unitsAcross]);

  // The frame currently on screen. Everything below is drawn from this, so the
  // whole picture stays consistent mid-morph.
  const frame = useMemo(() => morphAt(matrix, t), [matrix, t]);

  const reference = useMemo(
    () => ({
      vertical: gridFamilyPath(IDENTITY, vp, GRID_EXTENT, 'vertical'),
      horizontal: gridFamilyPath(IDENTITY, vp, GRID_EXTENT, 'horizontal'),
    }),
    [vp],
  );

  const grid = useMemo(
    () => ({
      vertical: gridFamilyPath(frame, vp, GRID_EXTENT, 'vertical'),
      horizontal: gridFamilyPath(frame, vp, GRID_EXTENT, 'horizontal'),
    }),
    [frame, vp],
  );

  const [col1, col2] = columns(frame);
  const iArrow = arrow(vp, col1);
  const jArrow = arrow(vp, col2);
  const flipped = det(frame) < 0;
  const origin = toScreen(vp, vec(0, 0));
  const hatchId = `hatch-${uid}`;

  return (
    <svg
      ref={svgRef}
      className="plane"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={title ?? 'The plane under the current transformation'}
      {...pointerHandlers}
    >
      <defs>
        <pattern
          id={hatchId}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--flip)" strokeWidth="1.6" opacity="0.7" />
        </pattern>
      </defs>

      <rect width={size} height={size} fill="var(--void)" />

      {/* Where the grid started: faint, and it never moves. */}
      <g className="plane-reference">
        <path d={reference.vertical} />
        <path d={reference.horizontal} />
      </g>

      {/* Where the grid is now. Hidden in rounds where showing it would hand
          the player the answer. */}
      {!hideTransformed && (
        <g className="plane-grid">
          <path d={grid.vertical} className="grid-rides-j" />
          <path d={grid.horizontal} className="grid-rides-i" />
        </g>
      )}

      {/* The axes of the original frame, so "which way was up" stays readable. */}
      <g className="plane-axes">
        <line x1="0" y1={origin.y} x2={size} y2={origin.y} />
        <line x1={origin.x} y1="0" x2={origin.x} y2={size} />
      </g>

      {showUnitSquare && !hideTransformed && (
        <>
          <polygon
            points={unitSquarePoints(frame, vp)}
            className={flipped ? 'unit-square flipped' : 'unit-square'}
          />
          {flipped && <polygon points={unitSquarePoints(frame, vp)} fill={`url(#${hatchId})`} />}
        </>
      )}

      {eigenLines.map((line, i) => {
        const d = lineThroughOrigin(vp, line.direction);
        if (d === null) return null;
        const label = line.label;
        const anchor = clampToView(
          vp,
          toScreen(vp, {
            x: line.direction.x * (unitsAcross / 2 - 1.2),
            y: line.direction.y * (unitsAcross / 2 - 1.2),
          }),
          26,
        );
        return (
          <g key={i} className="eigen-line">
            <path d={d} />
            {label !== undefined && (
              <text x={anchor.x} y={anchor.y} textAnchor="middle">
                {label}
              </text>
            )}
          </g>
        );
      })}

      {trail !== undefined && trail.length > 1 && (
        <g className="trail">
          <path d={trailPath(vp, trail)} />
          {trail.map((p, i) => {
            const s = toScreen(vp, p);
            return <circle key={i} cx={s.x} cy={s.y} r={i === 0 ? 4 : 3} />;
          })}
        </g>
      )}

      {vectors.map((v, i) => {
        const a = arrow(vp, v.at);
        if (a === null) return null;
        const tip = toScreen(vp, v.at);
        return (
          <g key={i} className="extra-vector" style={{ color: v.color }}>
            <path d={a.shaft} />
            <polygon points={a.head} />
            {v.label !== undefined && (
              <text x={tip.x + 10} y={tip.y - 8}>
                {v.label}
              </text>
            )}
          </g>
        );
      })}

      {showBasis && !hideTransformed && (
        <>
          {jArrow !== null && (
            <g className="basis j-hat">
              <path d={jArrow.shaft} />
              <polygon points={jArrow.head} />
              <text {...labelAt(vp, col2)}>ĵ</text>
            </g>
          )}
          {iArrow !== null && (
            <g className="basis i-hat">
              <path d={iArrow.shaft} />
              <polygon points={iArrow.head} />
              <text {...labelAt(vp, col1)}>î</text>
            </g>
          )}
        </>
      )}

      <circle cx={origin.x} cy={origin.y} r="3" className="origin" />
      {children}
    </svg>
  );
}

/** Keeps a label inside the viewport, so nothing gets sliced off at the edge. */
function clampToView(vp: Viewport, p: Vec2, inset = 14): Vec2 {
  return vec(
    Math.min(Math.max(p.x, inset), vp.width - inset),
    Math.min(Math.max(p.y, inset), vp.height - inset),
  );
}

/**
 * Puts a label just beyond the tip of an arrow, pushed out along the arrow's own
 * direction so it never sits on the head. A vector too short to have a direction
 * gets parked up and to the right of the origin instead. Vectors that run off
 * screen have their label pinned to the edge rather than lost.
 */
function labelAt(vp: Viewport, v: Vec2) {
  const tip = toScreen(vp, v);
  const dir = normalize(v);
  const out = length(dir) === 0 ? vec(0.7, 0.7) : dir;
  const p = clampToView(vp, vec(tip.x + out.x * 18, tip.y - out.y * 18 + 5));
  return { x: p.x, y: p.y, textAnchor: 'middle' as const };
}
