import { useEffect, useRef } from 'react';
import { Hud } from '../ui/Hud';
import { StartScreen } from '../ui/StartScreen';
import { ResultScreen } from '../ui/ResultScreen';
import { WhereLandView } from '../modes/WhereLandView';
import { NameMoveView } from '../modes/NameMoveView';
import { EigenHuntView } from '../modes/EigenHuntView';
import { DetDashView } from '../modes/DetDashView';
import type { ModeViewProps } from '../modes/view';
import type { ModeId } from '../modes/types';
import { useMorph } from '../render/useMorph';
import { useGame } from './useGame';
import './arcade.css';

const VIEWS: Record<ModeId, (props: ModeViewProps) => React.ReactNode> = {
  whereLand: WhereLandView,
  nameMove: NameMoveView,
  eigenHunt: EigenHuntView,
  detDash: DetDashView,
};

/** The arcade: start screen, rounds, feedback, results. */
export function Arcade({ onLab }: { onLab: () => void }) {
  const game = useGame();
  const { state } = game;
  const morph = useMorph();
  // Depend on `play`, not on `morph`: the hook result is a fresh object every
  // frame, so an effect keyed on it would re-fire mid-animation and restart the
  // morph forever — it would never get past t = 0.
  const playMorph = morph.play;
  const roundKey = `${state.roundIndex}-${state.question?.mode ?? ''}`;

  // Each new round plays its morph once. Rounds that hide the transformed grid
  // still call this; their plane simply stays at t = 0 until the answer lands.
  const lastKey = useRef('');
  useEffect(() => {
    if (state.phase !== 'playing' || roundKey === lastKey.current) return;
    lastKey.current = roundKey;
    playMorph();
  }, [state.phase, roundKey, playMorph]);

  // Replay the morph as soon as the round resolves — the lesson of the round.
  useEffect(() => {
    if (state.phase === 'feedback') playMorph();
  }, [state.phase, playMorph]);

  if (state.phase === 'idle') {
    return (
      <StartScreen
        save={game.save}
        onStart={() => game.start(false)}
        onPractice={() => game.start(true)}
        onLab={onLab}
      />
    );
  }

  if (state.phase === 'over') {
    return (
      <ResultScreen
        state={state}
        save={game.save}
        onAgain={() => game.start(state.untimed)}
        onHome={() => game.quit()}
      />
    );
  }

  const question = state.question;
  if (question === null) return null;

  const View = VIEWS[question.mode];
  const answered = state.phase === 'feedback';
  const result = state.lastResult;

  return (
    <div className="arcade">
      <Hud
        score={state.score}
        streak={state.streak}
        lives={state.lives}
        timeFraction={game.timeFraction}
        untimed={state.untimed}
        gained={answered && result?.correct ? result.gained : null}
      />

      <p className="prompt">{question.prompt}</p>

      <div className="round" key={roundKey}>
        <View
          question={question}
          t={morph.t}
          answered={answered}
          result={result}
          onAnswer={game.answer}
        />
      </div>

      {answered && result !== null && (
        <div className="feedback">
          <p className={result.correct ? 'verdict right' : 'verdict wrong'}>
            <span aria-hidden="true">{result.correct ? '✓' : '✕'}</span>{' '}
            {result.correct ? 'Right' : result.timedOut ? 'Out of time' : 'Not quite'}
          </p>
          <p className="insight">{question.insight}</p>
          <button className="primary next" onClick={game.next} autoFocus>
            {state.lives <= 0 ? 'See results' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
