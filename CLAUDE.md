# Eigen Rush — project conventions

Read this before changing anything. These are the rules the whole codebase
already follows; breaking one silently will make the maths and the picture
disagree.

## Maths conventions

- **Column vectors, matrix on the left.** Always `A v`, never `v A`.
- **`Mat2` is named in reading order**: `{ a, b, c, d }` means

  ```
  | a  b |
  | c  d |
  ```

  so `apply(A, v) = (a·x + b·y, c·x + d·y)`.

- **The columns are where the basis vectors land.** `columns(A)` returns
  `[A e1, A e2] = [(a, c), (b, d)]`. This is the single most important fact the
  game teaches, so the renderer draws exactly those two vectors as î and ĵ.
- **Composition is right to left.** "Apply `A`, then `B`" is `multiply(B, A)`.
  `compose(A, B, C)` is the left-to-right convenience wrapper and equals
  `C·B·A`.
- **Everything in `src/math/` is pure.** No React, no DOM, no randomness that
  isn't passed in. That is what makes it testable on its own.

## Tolerances

All of these live in `src/math/tolerance.ts`. Never hard-code a new epsilon.

| Constant              | Value  | Used for                                                                     |
| --------------------- | ------ | ---------------------------------------------------------------------------- |
| `EPS`                 | `1e-9` | Exact-ish comparisons: matrix equality, "is this singular", parallel vectors |
| `LOOSE_EPS`           | `1e-6` | Eigen decomposition, classification, anything after a chain of float ops     |
| eigen-hunt angle (M3) | 6°     | Tier 1–2; tighten with tier                                                  |

`approxEq` is absolute near zero and relative for large values, so it behaves
sensibly at both ends. The eigen solver scales its "is the discriminant zero?"
threshold by the size of the matrix, which is why a shear perturbed by `1e-15`
is still reported as defective rather than as two distinct roots.

## Eigen results

`eigen(A)` returns a tagged union. Handle all four shapes:

1. **Two distinct real eigenvalues** — `values` sorted descending,
   `vectors[i]` matches `values[i]`, all unit length.
2. **`scalar: true`** (`A = cI`) — every direction is an eigenvector. Never draw
   two eigen-lines here; it would imply the other directions are wrong.
3. **`defective: true`** — repeated eigenvalue, one-dimensional eigenspace.
   Both entries of `vectors` are the same vector. Keep these out of tiers 1–2.
4. **`kind: 'complex'`** — no real invariant line. `modulus` is how much the
   spiral grows per application, `argument` how far it turns.

Eigenvectors are canonicalised (`canonicalDirection`): one representative per
line, pointing into the upper half plane. Treat `u` and `-u` as the same answer
everywhere — `lineAngleBetween` is the function for that.

## Tier rules

| Tier | Matrices                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------- |
| 1    | Named transforms, small integers: rotations by multiples of 90°, shears, axis scalings, reflections |
| 2    | General integer matrices, entries in `[-4, 4]`, **integer eigenvalues**                             |
| 3    | Non-integer eigenvalues, decimal entries, near-singular and defective cases                         |
| 4    | Complex eigenvalues, shown as spirals under repeated application                                    |

Integer eigenvalues come from `fromEigen(P, λ1, λ2)`, which builds `P D P⁻¹`.
Give it an integer `P` with `det P = ±1` and the result stays integer. Reject
any result whose entries fall outside the tier's range and draw again.

**Defective matrices do not appear before tier 3 — with one recorded
exception.** Shears are named tier-1 moves and every shear is defective
(`λ = 1` twice, one eigen-direction). The brief lists shears in tier 1 and also
says to keep defective matrices out until tier 3, so the two rules collide.
The reading in force: the defective rule guards the _general_-matrix tier, where
a non-diagonalizable matrix turns up unannounced and teaches nothing. A shear
announces itself. So tier 1 allows defective, tier 2 rejects it, and the eigen
hunt draws through `generateWithRealEigen`, which rejects defective at every
tier — the one mini-game where a lone eigen-direction genuinely misleads never
sees one. Other generators must check `eigen(A).defective` and reject.

## Rendering rules

- The transformed grid is the hero of every screen. Everything else stays quiet.
- Always draw: faint reference grid, transformed grid, î and ĵ as arrows, and
  the shaded image of the unit square (its area is `|det A|`).
- `det A < 0` gets a different tint **and** diagonal hatching. Colour never
  carries meaning on its own — not for the flip, not for eigen-lines (also
  dashed), not for right/wrong (also a word).
- The morph is `M(t) = (1-t)I + tA` over 600 ms, eased. **Except** for
  similarity transforms (rotation × uniform scale), where the angle and scale
  are interpolated instead, so the grid turns at a steady size rather than
  collapsing through the middle. `morphIsRotational(A)` says which path is used.
- A flip passing through a flat frame is deliberate — it teaches something.
- Geometry is computed in JS and emitted in **screen space**, so stroke widths
  and arrowheads stay a constant size however far the matrix stretches the
  plane. Each grid family is a single `<path>`, so a whole grid is two DOM
  nodes and stays cheap to rebuild every frame.
- Line segments are clipped to the viewport (`clipToViewport`), which keeps path
  data bounded when a matrix throws points a thousand units off screen.
- Touch first: hit targets at least 44 px (`--tap`), no hover-only interaction.
- Honour `prefers-reduced-motion`: `useMorph` jumps straight to the end state.

## Design tokens

Six named colours, in `src/ui/tokens.css`. Do not add a seventh without a
reason; derive surfaces from `--chalk` at low opacity instead.

| Token     | Hex       | Role                                      |
| --------- | --------- | ----------------------------------------- |
| `--void`  | `#10131C` | the field everything sits on              |
| `--chalk` | `#E9E7E2` | text, and the reference grid at low alpha |
| `--ihat`  | `#F2A541` | î — amber                                 |
| `--jhat`  | `#4CC9F0` | ĵ — cyan                                  |
| `--eigen` | `#B388FF` | eigen-directions (always dashed too)      |
| `--flip`  | `#FF6B8A` | `det A < 0` (always hatched too)          |

Amber/cyan is the pair that stays separable under every common form of colour
blindness. Type: Space Grotesk for labels and numerals, the system sans for
prose, KaTeX's Computer Modern for maths — so maths visibly reads as maths.

UI copy is plain and sentence case: "Start round", "Try again". No ALL-CAPS
labels, no shouting.

## Game rules

These live in `src/game/scoring.ts` as tested pure functions. Change them there,
not inline.

| Rule        | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Base points | 100, multiplied by the streak multiplier                       |
| Multiplier  | ×1/×2/×3/×4, stepping up every 2 correct, capped at ×4         |
| Speed bonus | up to +50, scaled by fraction of time left, **not** multiplied |
| Round clock | `5000 + 5000 × 0.85^streak` ms — 10 s down toward 5 s          |
| Lives       | 3; a wrong answer or a timeout costs one                       |
| Tier ramp   | tier 1 for rounds 0–3, then fading to all tier 2 by round 12   |

The run is a pure reducer in `src/game/reducer.ts`. Keep it pure: it is what
lets a whole run be replayed in a test.

**React hooks that return an object**: memoize it, and depend on the stable
callback rather than the whole result. `useMorph` returns fresh `t` every frame;
an effect keyed on the hook result re-fires mid-animation and resets the morph
forever. Depend on `morph.play`.

## Testing

- Every maths function has unit tests, including `det A = 0`, repeated
  eigenvalues, `A = cI`, rotations, defective matrices, and values near zero.
- Property tests run over 1,000 generated matrices and check
  `tr A = λ₁ + λ₂`, `det A = λ₁λ₂`, and `A v ≈ λ v` for every returned
  eigenvector. Use the seeded `makeRng` in `src/math/testing.ts` so failures
  reproduce.
- Every generator must be checked against its tier's constraints over 1,000
  samples.
- Every answer checker needs right, wrong, and edge-case answers.
- `npm run test`, `npm run lint` and `npm run build` all pass before any commit.

## Dependencies

Vite, React, TypeScript, KaTeX, Vitest, ESLint, Prettier. **Ask before adding
anything else.** No backend: high scores and settings go in `localStorage`.

## Watch list

- The bundle is ~130 kB gzipped, most of it KaTeX. If Lighthouse mobile
  performance drops below 90, lazy-load KaTeX rather than trimming the game.
