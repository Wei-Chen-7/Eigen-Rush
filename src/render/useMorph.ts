import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MORPH_DURATION_MS, easeInOutCubic } from '../math/morph';

/** True when the reader has asked the system to cut down on animation. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface Morph {
  /** Eased progress in `[0, 1]`, ready to hand to `morphAt`. */
  readonly t: number;
  readonly isPlaying: boolean;
  /** Runs the morph from the identity to the matrix. */
  readonly play: () => void;
  /** Snaps to a fixed progress and stops any run in flight. */
  readonly seek: (t: number) => void;
}

/**
 * Drives morph progress with requestAnimationFrame.
 *
 * With reduced motion on, `play` jumps straight to the finished state: the
 * before and after are still both visible, just without the sweep between them.
 */
export function useMorph(durationMs: number = MORPH_DURATION_MS): Morph {
  const [t, setT] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const frame = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(() => {
    stop();
    if (prefersReducedMotion() || durationMs <= 0) {
      setT(1);
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    setT(0);
    const start = performance.now();
    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / durationMs);
      setT(easeInOutCubic(raw));
      if (raw < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        frame.current = null;
        setIsPlaying(false);
      }
    };
    frame.current = requestAnimationFrame(tick);
  }, [durationMs, stop]);

  const seek = useCallback(
    (next: number) => {
      stop();
      setIsPlaying(false);
      setT(Math.min(1, Math.max(0, next)));
    },
    [stop],
  );

  // `play` and `seek` are stable, so an effect can depend on them without
  // re-firing every render. `t` changes each frame, so the object as a whole
  // cannot be — depend on `play`, never on the whole hook result.
  return useMemo(() => ({ t, isPlaying, play, seek }), [t, isPlaying, play, seek]);
}
