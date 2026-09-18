import { useCallback, useRef, useState } from 'react';
import type { Vec2 } from '../math/types';
import { vec } from '../math/vec';
import { toWorld, type Viewport } from './viewport';

/**
 * Turns pointer events on an SVG into world coordinates.
 *
 * One finger, no hover: pointer events cover mouse, pen and touch with the same
 * code, and pointer capture keeps a drag alive when the finger slides off the
 * plane — which happens constantly when the answer is near the edge.
 */
export function usePointerWorld(vp: Viewport, onChange?: (world: Vec2, done: boolean) => void) {
  const [dragging, setDragging] = useState(false);
  const [world, setWorld] = useState<Vec2 | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const toWorldPoint = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const svg = svgRef.current;
      if (svg === null) return vec(0, 0);
      const rect = svg.getBoundingClientRect();
      // The SVG is laid out at a CSS size that may differ from its viewBox.
      const scaleX = vp.width / rect.width;
      const scaleY = vp.height / rect.height;
      return toWorld(vp, vec((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY));
    },
    [vp],
  );

  const handle = useCallback(
    (e: React.PointerEvent<SVGSVGElement>, done: boolean) => {
      const point = toWorldPoint(e.clientX, e.clientY);
      setWorld(point);
      onChange?.(point, done);
    },
    [toWorldPoint, onChange],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      handle(e, false);
    },
    [handle],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return;
      handle(e, false);
    },
    [dragging, handle],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return;
      setDragging(false);
      handle(e, true);
    },
    [dragging, handle],
  );

  const reset = useCallback(() => {
    setWorld(null);
    setDragging(false);
  }, []);

  return {
    svgRef,
    world,
    dragging,
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
