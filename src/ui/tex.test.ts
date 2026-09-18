import { describe, expect, it } from 'vitest';
import { matrixTex, num, vectorTex } from './tex';
import { mat } from '../math/mat';
import { vec } from '../math/vec';

describe('num', () => {
  it('drops trailing zeros', () => {
    expect(num(2.5)).toBe('2.5');
    expect(num(2)).toBe('2');
    expect(num(2.004)).toBe('2');
  });

  it('never prints negative zero', () => {
    expect(num(-0)).toBe('0');
    expect(num(-0.0001)).toBe('0');
  });

  it('honours the digit count', () => {
    expect(num(1 / 3, 3)).toBe('0.333');
    expect(num(1 / 3, 0)).toBe('0');
  });

  it('marks non-finite values rather than printing NaN', () => {
    expect(num(NaN)).toBe('—');
    expect(num(Infinity)).toBe('—');
  });
});

describe('tex builders', () => {
  it('lays a matrix out in reading order', () => {
    expect(matrixTex(mat(1, 2, 3, 4))).toBe('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}');
  });

  it('stacks a vector', () => {
    expect(vectorTex(vec(1, -2))).toBe('\\begin{pmatrix} 1 \\\\ -2 \\end{pmatrix}');
  });
});
