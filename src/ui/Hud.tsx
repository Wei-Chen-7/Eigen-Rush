import { streakMultiplier, toNextMultiplier } from '../game/scoring';
import { STARTING_LIVES } from '../game/scoring';
import './hud.css';

export interface HudProps {
  score: number;
  streak: number;
  lives: number;
  timeFraction: number;
  untimed: boolean;
  /** Set briefly after a correct answer so the score can flash. */
  gained: number | null;
}

/**
 * The rail above the plane: lives, score, streak. Deliberately quiet — the
 * boldness belongs to the grid. The one loud element is the clock, because
 * urgency is the thing a HUD actually has to convey.
 */
export function Hud({ score, streak, lives, timeFraction, untimed, gained }: HudProps) {
  const multiplier = streakMultiplier(streak);
  const toNext = toNextMultiplier(streak);
  const urgent = !untimed && timeFraction < 0.3;

  return (
    <div className="hud">
      <div className="hud-row">
        <div className="lives" aria-label={`${lives} lives left`}>
          {Array.from({ length: STARTING_LIVES }, (_, i) => (
            <span key={i} className={i < lives ? 'life' : 'life spent'} aria-hidden="true" />
          ))}
        </div>

        <div className="score-block">
          <span className="score" aria-label={`Score ${score}`}>
            {score.toLocaleString()}
          </span>
          {gained !== null && gained > 0 && (
            <span className="gained" key={score}>
              +{gained}
            </span>
          )}
        </div>

        <div className={multiplier > 1 ? 'streak live' : 'streak'}>
          <span className="multiplier">×{multiplier}</span>
          <span className="streak-note">
            {multiplier === 4 ? 'max' : toNext === 1 ? '1 to go' : `${streak} streak`}
          </span>
        </div>
      </div>

      <div className={urgent ? 'clock urgent' : 'clock'} role="timer" aria-hidden={untimed}>
        <div
          className="clock-fill"
          style={{ transform: `scaleX(${untimed ? 1 : timeFraction})` }}
        />
      </div>
    </div>
  );
}
