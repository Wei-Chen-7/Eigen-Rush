import type { Vec2 } from './types';
import { EPS, approxEq, isZero } from './tolerance';

export const ZERO: Vec2 = { x: 0, y: 0 };
/** i-hat, the first basis vector. */
export const I_HAT: Vec2 = { x: 1, y: 0 };
/** j-hat, the second basis vector. */
export const J_HAT: Vec2 = { x: 0, y: 1 };

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(u: Vec2, v: Vec2): Vec2 {
  return { x: u.x + v.x, y: u.y + v.y };
}

export function sub(u: Vec2, v: Vec2): Vec2 {
  return { x: u.x - v.x, y: u.y - v.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function negate(v: Vec2): Vec2 {
  return { x: -v.x, y: -v.y };
}

export function dot(u: Vec2, v: Vec2): number {
  return u.x * v.x + u.y * v.y;
}

/** The z-component of the 3D cross product; its sign says which side `v` is on. */
export function cross(u: Vec2, v: Vec2): number {
  return u.x * v.y - u.y * v.x;
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function distance(u: Vec2, v: Vec2): number {
  return Math.hypot(u.x - v.x, u.y - v.y);
}

export function isZeroVec(v: Vec2, eps: number = EPS): boolean {
  return length(v) <= eps;
}

/** Unit vector in the same direction. The zero vector is returned unchanged. */
export function normalize(v: Vec2, eps: number = EPS): Vec2 {
  const len = length(v);
  if (len <= eps) return ZERO;
  return { x: v.x / len, y: v.y / len };
}

export function lerpVec(u: Vec2, v: Vec2, t: number): Vec2 {
  return { x: u.x + (v.x - u.x) * t, y: u.y + (v.y - u.y) * t };
}

export function eqVec(u: Vec2, v: Vec2, eps: number = EPS): boolean {
  return approxEq(u.x, v.x, eps) && approxEq(u.y, v.y, eps);
}

/** Direction of `v` in radians, in `(-pi, pi]`. The zero vector gives 0. */
export function angle(v: Vec2): number {
  if (isZeroVec(v)) return 0;
  return Math.atan2(v.y, v.x);
}

export function rotate(v: Vec2, radians: number): Vec2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: cos * v.x - sin * v.y, y: sin * v.x + cos * v.y };
}

/** Unsigned angle between two vectors in `[0, pi]`. Zero vectors give 0. */
export function angleBetween(u: Vec2, v: Vec2): number {
  if (isZeroVec(u) || isZeroVec(v)) return 0;
  // atan2 of the cross and dot is stable at both ends of the range, unlike acos.
  return Math.abs(Math.atan2(cross(u, v), dot(u, v)));
}

/**
 * Angle between the *lines* spanned by `u` and `v`, in `[0, pi/2]`. This is the
 * measure used everywhere eigen-directions are compared, because `u` and `-u`
 * span the same line and must count as the same answer.
 */
export function lineAngleBetween(u: Vec2, v: Vec2): number {
  const a = angleBetween(u, v);
  return a > Math.PI / 2 ? Math.PI - a : a;
}

/** True when `u` and `v` span the same line, to within `eps` radians. */
export function isParallel(u: Vec2, v: Vec2, eps = 1e-9): boolean {
  if (isZeroVec(u) || isZeroVec(v)) return false;
  return lineAngleBetween(u, v) <= eps;
}

/**
 * One canonical representative per line: flipped so it points into the upper
 * half plane, or along +x when it is horizontal. Lets us compare and render
 * eigen-directions without sign flicker.
 */
export function canonicalDirection(v: Vec2): Vec2 {
  const n = normalize(v);
  if (isZeroVec(n)) return ZERO;
  if (n.y < -EPS) return negate(n);
  if (isZero(n.y) && n.x < 0) return negate(n);
  return n;
}

export const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
export const toDegrees = (radians: number): number => (radians * 180) / Math.PI;
