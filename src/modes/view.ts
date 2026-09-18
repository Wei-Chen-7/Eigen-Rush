import type { Answer, Question } from './types';
import type { RoundResult } from '../game/types';

/** What every mini-game screen is handed. */
export interface ModeViewProps {
  readonly question: Question;
  /** Morph progress in [0, 1], driven by the round's replay. */
  readonly t: number;
  /** True once the round is resolved: stop taking input, start revealing. */
  readonly answered: boolean;
  readonly result: RoundResult | null;
  readonly onAnswer: (answer: Answer) => void;
}
