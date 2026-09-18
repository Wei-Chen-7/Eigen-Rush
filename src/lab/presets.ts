import type { Mat2 } from '../math/types';
import { mat, reflection, rotationDeg, scaling, shearX } from '../math/mat';

/** The matrices worth having one tap away in the lab. */
export interface Preset {
  readonly name: string;
  readonly matrix: Mat2;
  /** Why this one is in the list. */
  readonly note: string;
}

export const PRESETS: readonly Preset[] = [
  { name: 'Identity', matrix: mat(1, 0, 0, 1), note: 'Nothing moves.' },
  { name: 'Rotate 90°', matrix: rotationDeg(90), note: 'No real eigen-direction — it spirals.' },
  { name: 'Rotate 180°', matrix: rotationDeg(180), note: 'The morph turns instead of collapsing.' },
  {
    name: 'Shear x',
    matrix: shearX(1),
    note: 'Defective: one repeated eigenvalue, one direction.',
  },
  { name: 'Scale 2, 0.5', matrix: scaling(2, 0.5), note: 'Area unchanged: det = 1.' },
  { name: 'Reflect in x', matrix: reflection(0), note: 'det < 0 — the plane turns over.' },
  { name: 'Singular', matrix: mat(1, 2, 2, 4), note: 'Everything lands on one line.' },
  {
    name: 'Integer eigen',
    matrix: mat(3, 1, 0, -2),
    note: 'Triangular: eigenvalues on the diagonal.',
  },
  { name: 'Symmetric', matrix: mat(2, 1, 1, 2), note: 'Eigen-directions are perpendicular.' },
  { name: 'Fibonacci', matrix: mat(1, 1, 1, 0), note: 'Repeated use settles on the golden ratio.' },
  { name: 'Spiral out', matrix: mat(1, -1, 1, 1), note: 'Complex eigenvalues with modulus > 1.' },
  {
    name: 'Collapse',
    matrix: mat(0, 0, 0, 0),
    note: 'Rank 0: the whole plane goes to the origin.',
  },
];
