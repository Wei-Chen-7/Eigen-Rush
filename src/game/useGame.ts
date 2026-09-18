import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { gameReducer, initialState } from './reducer';
import { loadSave, recordRun, saveSave, type SaveData } from './storage';
import type { Answer } from '../modes/types';

/**
 * Wires the reducer to a real clock and to localStorage.
 *
 * The clock runs on requestAnimationFrame rather than an interval so the bar
 * drains smoothly instead of stepping, and so it pauses with the tab.
 */
export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const recorded = useRef(false);

  const running = state.phase === 'playing' && !state.untimed;

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      dispatch({ type: 'tick', deltaMs: delta });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  // Fold a finished run into the save exactly once.
  useEffect(() => {
    if (state.phase !== 'over' || recorded.current) return;
    recorded.current = true;
    const next = recordRun(loadSave(), {
      score: state.score,
      bestStreak: state.bestStreak,
      stats: state.stats,
    });
    saveSave(next);
    setSave(next);
  }, [state.phase, state.score, state.bestStreak, state.stats]);

  const start = useCallback((untimed = false) => {
    recorded.current = false;
    dispatch({ type: 'start', untimed });
  }, []);

  const answer = useCallback((a: Answer) => dispatch({ type: 'answer', answer: a }), []);
  const next = useCallback(() => dispatch({ type: 'next' }), []);
  const quit = useCallback(() => dispatch({ type: 'quit' }), []);

  /** Time left as a fraction, for the draining bar. */
  const timeFraction = useMemo(
    () => (state.duration > 0 ? Math.max(0, Math.min(1, state.timeLeft / state.duration)) : 1),
    [state.timeLeft, state.duration],
  );

  return { state, save, setSave, start, answer, next, quit, timeFraction };
}
