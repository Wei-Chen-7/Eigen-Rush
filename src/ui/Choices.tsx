import type { ReactNode } from 'react';
import './choices.css';

export interface ChoicesProps {
  /** One entry per option. Rendered as a large tap target. */
  options: readonly ReactNode[];
  onPick: (index: number) => void;
  disabled?: boolean;
  /** Index of the right answer; only passed once the round is over. */
  correctIndex?: number | undefined;
  /** What the player picked, if anything. */
  pickedIndex?: number | undefined;
  /** Two columns for matrices, one for long text. */
  columns?: 1 | 2;
}

/**
 * The answer strip under the plane.
 *
 * Right and wrong are marked with a word and a glyph as well as a colour, so
 * the feedback survives without colour — the check and cross carry it.
 */
export function Choices({
  options,
  onPick,
  disabled = false,
  correctIndex,
  pickedIndex,
  columns = 2,
}: ChoicesProps) {
  const revealed = correctIndex !== undefined;

  return (
    <div className={`choices cols-${columns}`}>
      {options.map((option, i) => {
        const isCorrect = revealed && i === correctIndex;
        const isWrongPick = revealed && i === pickedIndex && i !== correctIndex;
        const className = [
          'choice',
          isCorrect ? 'correct' : '',
          isWrongPick ? 'wrong' : '',
          revealed && !isCorrect && !isWrongPick ? 'dim' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button key={i} className={className} onClick={() => onPick(i)} disabled={disabled}>
            <span className="choice-body">{option}</span>
            {isCorrect && (
              <span className="mark" aria-label="correct">
                ✓
              </span>
            )}
            {isWrongPick && (
              <span className="mark" aria-label="your answer, wrong">
                ✕
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
