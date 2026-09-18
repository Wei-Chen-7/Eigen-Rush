import type { Mat2, Vec2 } from '../math/types';

/** Trims trailing zeros so 2.50 reads as 2.5, and -0 reads as 0. */
export function num(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return '—';
  const r = Number(x.toFixed(digits));
  return Object.is(r, -0) ? '0' : String(r);
}

export function matrixTex(m: Mat2, digits = 2): string {
  return `\\begin{pmatrix} ${num(m.a, digits)} & ${num(m.b, digits)} \\\\ ${num(m.c, digits)} & ${num(m.d, digits)} \\end{pmatrix}`;
}

export function vectorTex(v: Vec2, digits = 2): string {
  return `\\begin{pmatrix} ${num(v.x, digits)} \\\\ ${num(v.y, digits)} \\end{pmatrix}`;
}
