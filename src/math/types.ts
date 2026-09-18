/**
 * Core types.
 *
 * CONVENTION (see CLAUDE.md): vectors are columns and matrices act on the left,
 * `A v`. Composition "apply A, then B" is the product `B A`.
 *
 *        | a  b |            | a |                  | b |
 *   A =  |      |   A e1 =   |   |   (col 1)  A e2 =|   |  (col 2)
 *        | c  d |            | c |                  | d |
 */

/** A 2D column vector. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** A 2x2 matrix, named after its entries in reading order. */
export interface Mat2 {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

/** A complex number, used only for complex eigenvalues. */
export interface Complex {
  readonly re: number;
  readonly im: number;
}

/** Two distinct real eigenvalues, or a repeated one. */
export interface EigenReal {
  readonly kind: 'real';
  /** Sorted descending by value, so `values[0] >= values[1]`. */
  readonly values: readonly [number, number];
  /**
   * Unit eigenvectors, matched by index to `values`. For a defective matrix
   * both entries are the same vector; for `A = cI` they are i-hat and j-hat.
   */
  readonly vectors: readonly [Vec2, Vec2];
  /** Repeated eigenvalue with only a one-dimensional eigenspace. */
  readonly defective: boolean;
  /** `A = cI`: every direction is an eigenvector. */
  readonly scalar: boolean;
}

/** A conjugate pair of complex eigenvalues: no real invariant direction. */
export interface EigenComplex {
  readonly kind: 'complex';
  /** `lambda = re +/- i*im`, with `im > 0`. */
  readonly re: number;
  readonly im: number;
  /** `|lambda|` — how much the spiral grows per application. */
  readonly modulus: number;
  /** `arg(lambda)` in radians — how far the spiral turns per application. */
  readonly argument: number;
}

export type Eigen = EigenReal | EigenComplex;
