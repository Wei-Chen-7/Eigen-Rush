import { MODES } from '../modes/registry';
import { accuracy, type SaveData } from '../game/storage';
import type { GameState } from '../game/types';
import './screens.css';

/** The results. Score, best streak, and where the weak spots are. */
export function ResultScreen({
  state,
  save,
  onAgain,
  onHome,
}: {
  state: GameState;
  save: SaveData;
  onAgain: () => void;
  onHome: () => void;
}) {
  const isBest = state.score > 0 && state.score >= save.highScore;

  return (
    <div className="screen result">
      <div className="result-head">
        <span className="label">{isBest ? 'New best' : 'Run over'}</span>
        <span className="result-score">{state.score.toLocaleString()}</span>
        <span className="result-sub">
          best streak {state.bestStreak} · {state.roundIndex + 1} rounds
        </span>
      </div>

      <dl className="result-stats">
        {MODES.map((mode) => {
          const stat = state.stats[mode.id];
          const pct = accuracy(stat);
          return (
            <div key={mode.id}>
              <dt>{mode.name}</dt>
              <dd>
                {pct === null ? (
                  <span className="muted">not played</span>
                ) : (
                  <>
                    <span className="pct">{pct}%</span>
                    <span className="muted">
                      {' '}
                      {stat.correct}/{stat.asked}
                    </span>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {!isBest && save.highScore > 0 && (
        <p className="result-note">Best so far {save.highScore.toLocaleString()}.</p>
      )}

      <div className="result-actions">
        <button className="primary" onClick={onAgain}>
          Go again
        </button>
        <button onClick={onHome}>Home</button>
      </div>
    </div>
  );
}
