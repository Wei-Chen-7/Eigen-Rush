import { describe, expect, it } from 'vitest';
import { approxEq, clamp, isInteger, isZero, round } from './tolerance';

describe('tolerance', () => {
  it('treats exact equality as equal', () => {
    expect(approxEq(0, 0)).toBe(true);
    expect(approxEq(-1.5, -1.5)).toBe(true);
  });

  it('compares near zero absolutely', () => {
    expect(approxEq(0, 1e-12)).toBe(true);
    expect(approxEq(0, 1e-3)).toBe(false);
  });

  it('compares large values relatively', () => {
    expect(approxEq(1e12, 1e12 + 1)).toBe(true);
    expect(approxEq(1e12, 1.5e12)).toBe(false);
  });

  it('detects zero within tolerance', () => {
    expect(isZero(1e-12)).toBe(true);
    expect(isZero(-1e-12)).toBe(true);
    expect(isZero(0.1)).toBe(false);
    expect(isZero(0.1, 0.2)).toBe(true);
  });

  it('rounds without producing negative zero', () => {
    expect(Object.is(round(-1e-12), 0)).toBe(true);
    expect(round(1.23456789, 3)).toBe(1.235);
  });

  it('recognises integers within tolerance', () => {
    expect(isInteger(3)).toBe(true);
    expect(isInteger(3 + 1e-12)).toBe(true);
    expect(isInteger(3.5)).toBe(false);
  });

  it('clamps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});
