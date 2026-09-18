import type { Mat2, Vec2 } from '../math/types';
import type { Tier } from '../generators/tiers';
import type { Rng } from '../math/rng';

export type ModeId = 'whereLand' | 'nameMove' | 'eigenHunt' | 'detDash';

/** What the player sent back. Each mode narrows this to its own shape. */
export type Answer =
  | { kind: 'point'; at: Vec2 }
  | { kind: 'choice'; index: number }
  | { kind: 'direction'; at: Vec2 }
  | { kind: 'noRealDirection' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'timeout' };

/** Everything a round needs, built once when the round starts. */
export interface Question {
  readonly mode: ModeId;
  readonly tier: Tier;
  readonly matrix: Mat2;
  /** The sentence above the plane. Plain language, sentence case. */
  readonly prompt: string;
  /** The one-line lesson shown after answering, right or wrong. */
  readonly insight: string;
  /** Mode-specific payload. */
  readonly data: QuestionData;
}

export type QuestionData =
  | { kind: 'whereLand'; vector: Vec2; target: Vec2; snap: boolean }
  | { kind: 'nameMove'; options: readonly Mat2[]; correctIndex: number }
  | {
      kind: 'eigenHunt';
      directions: readonly Vec2[];
      values: readonly number[];
      toleranceDeg: number;
    }
  | { kind: 'detDash'; question: DetQuestion; options: readonly number[]; correctIndex: number };

export type DetQuestion = 'flips' | 'invertible' | 'areaScale';

export interface ModeDefinition {
  readonly id: ModeId;
  /** Shown on the results screen. Sentence case. */
  readonly name: string;
  readonly generate: (rng: Rng, tier: Tier) => Question;
  readonly check: (question: Question, answer: Answer) => boolean;
}
