import { Plane } from '../render/Plane';
import { mat } from '../math/mat';
import { useMorph } from '../render/useMorph';
import { useEffect } from 'react';
import type { SaveData } from '../game/storage';
import './screens.css';

/** The opening. One tap to a round — nothing to read, nothing to configure. */
export function StartScreen({
  save,
  onStart,
  onPractice,
  onLab,
}: {
  save: SaveData;
  onStart: () => void;
  onPractice: () => void;
  onLab: () => void;
}) {
  const morph = useMorph(1400);
  const playMorph = morph.play;

  // A slow loop behind the title, so the first thing seen is the thing itself.
  // Keyed on `play`, which is stable — keying on the hook result would restart
  // the loop every frame and freeze the grid at t = 0.
  useEffect(() => {
    playMorph();
    const id = setInterval(playMorph, 2600);
    return () => clearInterval(id);
  }, [playMorph]);

  return (
    <div className="screen start">
      <div className="start-art" aria-hidden="true">
        <Plane matrix={mat(1, 1, 0, 1)} t={morph.t} size={240} unitsAcross={7} />
      </div>

      <div className="start-copy">
        <h1>Eigen Rush</h1>
        <p>A matrix bends the plane. Read what it did before the clock runs out.</p>
      </div>

      <div className="start-actions">
        <button className="primary" onClick={onStart}>
          Start round
        </button>
        <button onClick={onPractice}>Practice, no timer</button>
      </div>

      <div className="start-footer">
        {save.highScore > 0 && (
          <span>
            Best {save.highScore.toLocaleString()} · streak {save.bestStreak}
          </span>
        )}
        <button className="link" onClick={onLab}>
          Matrix lab
        </button>
      </div>
    </div>
  );
}
