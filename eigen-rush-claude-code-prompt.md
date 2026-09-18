# Build "Eigen Rush": a linear algebra reflex game

You're building a mobile-first web game that teaches linear algebra through fast, visual rounds. Players watch a 2D grid get transformed by a matrix and answer quickly. The goal is intuition for what a matrix *does* to space, not arithmetic grinding. Every answer, right or wrong, is followed by a short replay of the transformation so the player learns from it.

Before writing code, read this whole brief, then reply with a short implementation plan (file tree, key modules, milestones) and wait for my OK. After that, work milestone by milestone, commit after each one, and stop at the end of each milestone so I can play-test.

## Tech stack

- Vite + React + TypeScript (strict mode)
- SVG for the grid and vectors (crisp on phones, easy to animate)
- KaTeX for rendering matrices and formulas
- Vitest for unit tests, ESLint + Prettier
- GitHub Actions workflow that deploys to GitHub Pages on push to `main` (set Vite `base` correctly for a project page)
- No backend. Store high scores and settings in `localStorage`.
- Ask me before adding any dependency not on this list.

## Architecture

Keep math, game logic, and rendering separate so the math can be tested on its own.

```
src/
  math/        pure functions, no React: Mat2, Vec2, multiply, det, trace, inverse,
               eigen (real and complex), angle helpers, tolerance compare
  generators/  matrix generators per mini-game and difficulty tier
  modes/       one folder per mini-game: question generator, answer checker, UI component
  game/        game loop, timer, scoring, streaks, lives, difficulty ramp (useReducer state machine)
  render/      <Plane> SVG component: grid, basis vectors, unit square, arrows, morph animation
  ui/          menus, HUD, results screen, settings
```

Conventions: column vectors, $A\mathbf{v}$ (never $\mathbf{v}A$). Applying $A$ then $B$ gives $BA$.

## Rendering rules (the core of the game)

- The transformed grid is the hero of every screen. Everything else stays quiet.
- Always draw: a faint reference grid, the transformed grid, $\hat{\imath}$ and $\hat{\jmath}$ as two colored arrows, and the image of the unit square shaded. Its area is $|\det A|$; tint it differently when $\det A < 0$.
- Animate the morph as $M(t) = (1-t)I + tA$ for $t \in [0,1]$, about 600 ms with easing. For pure rotations, interpolate the angle instead so the grid doesn't shrink midway. A flip ($\det A < 0$) passing through a flat frame is fine; it teaches something.
- Touch-first: one-finger tap and drag, hit targets at least 44 px, no hover-only interactions.
- Respect `prefers-reduced-motion` (skip morphs, show before and after).
- Colorblind-safe colors for $\hat{\imath}$, $\hat{\jmath}$, eigenvectors, and feedback. Never rely on color alone for right or wrong.

## Design direction

Before styling, propose a small token set: 4 to 6 named hex colors, typefaces and their roles, and a one-line layout concept, grounded in the subject (space, transformation, geometry). Avoid generic defaults: no cream-and-terracotta, no black-with-neon-green, no identical rounded cards with soft shadows, no ALL-CAPS labels. Spend the boldness on the grid animation and keep menus and HUD minimal. UI copy is plain and sentence case ("Start round", "Try again").

## Game loop (Arcade mode)

- A run is a sequence of rounds drawn from the unlocked mini-games.
- Each round has a timer: start at 10 s, shrink toward 5 s as the streak grows.
- Score = base points × streak multiplier (×1, ×2, ×3, capped at ×4) + small speed bonus.
- 3 lives. A wrong answer or timeout costs one.
- After every answer: show right or wrong, replay the morph, and show a one-line insight for that round (for example "The columns of $A$ are where $\hat{\imath}$ and $\hat{\jmath}$ land").
- End screen: score, best streak, accuracy per mini-game, high score.

## Difficulty tiers

- **Tier 1:** named transforms with small integers: rotations by multiples of $90^\circ$, shears, axis scalings, reflections.
- **Tier 2:** general $2\times 2$ integer matrices, entries in $[-4, 4]$, with integer eigenvalues.
- **Tier 3:** non-integer eigenvalues, decimal entries, near-singular and defective cases.
- **Tier 4:** complex eigenvalues, shown as spirals under repeated application.

To generate integer eigenvalues, build $A = PDP^{-1}$ with $D = \operatorname{diag}(\lambda_1, \lambda_2)$ and $P$ an integer matrix with $\det P = \pm 1$, so $A$ stays integer. Reject results outside the tier's entry range. Keep defective (non-diagonalizable) matrices out until Tier 3.

## Mini-games

### M1. Where does it land?
Show $A$ and a vector $\mathbf{v}$. Player taps where $A\mathbf{v}$ lands. In Tiers 1 and 2, snap taps to the nearest lattice point. Insight: the columns of $A$ are the images of the basis vectors.

### M2. Name that move
Play the morph without showing $A$. Player picks the matrix from 4 options rendered in KaTeX. Distractors must be plausible ($A^\top$, swapped columns, sign flips, $A^{-1}$), and all 4 options must be distinct and produce visibly different transforms.

### M3. Eigen hunt
Play the morph. Player drags an arrow $\mathbf{u}$ from the origin to find a direction that only stretches. While dragging, show $A\mathbf{u}$ live so they can see it line up. Accept either eigenvector, and treat $\mathbf{u}$ and $-\mathbf{u}$ as the same line. Correct if the angle to an eigenvector line is under $6^\circ$ (tighten with tier). Include a "No real direction" button for rotations and complex cases. If $A = cI$, every direction counts. After answering, draw both eigenvector lines with their $\lambda$ values.

### M4. Det dash
Rapid-fire questions on one matrix: "Does it flip orientation?" ($\det A < 0$), "Can it be undone?" ($\det A \neq 0$), "How much does area scale?" (pick $|\det A|$ from 4 options). The replay shows $ad - bc$ worked out.

### M5. Sum and product (milestone 3)
Player enters both eigenvalues of a $2\times 2$ matrix, any order, with a numeric keypad. Insight: $\lambda_1 + \lambda_2 = \operatorname{tr} A$ and $\lambda_1 \lambda_2 = \det A$.

### M6. Crush zone (milestone 3)
A singular matrix flattens the plane onto a line. Player drags the direction that gets sent to $\mathbf{0}$ (the null space). The replay shows the whole null line collapsing to the origin, with the image line highlighted.

### M7. Card puzzle (milestone 4, untimed)
Player gets a hand of transform cards and must turn a start shape into a target shape using the fewest cards. Show the running product. Include levels where the right cards in the wrong order fail, so players discover $AB \neq BA$ on their own. Store 15 hand-made levels in a JSON file.

### Boss round (milestone 4)
Show $\mathbf{v}, A\mathbf{v}, A^2\mathbf{v}, \dots$ as a trail. Player predicts the direction it settles toward (the dominant eigenvector). Include one level built on Fibonacci, $\begin{pmatrix}1 & 1\\ 1 & 0\end{pmatrix}$, and one on a 2-state Markov chain.

## Milestones

1. Scaffold, CI deploy to GitHub Pages, math core with full tests, the `<Plane>` renderer with morph animation, and a debug page where I can type any $2\times 2$ matrix and watch it transform.
2. Arcade loop (timer, score, streak, lives, end screen) with M1 to M4 on Tiers 1 and 2.
3. M5, M6, Tier 3, per-mini-game stats, settings (sound, reduced motion, practice mode with no timer).
4. M7, boss rounds, Tier 4 spirals, and power-up cards that unlock shortcuts ("Triangular: eigenvalues are on the diagonal", "Symmetric: eigenvectors are perpendicular").
5. Stretch: a $3\times 3$ mode with a rotatable 3D view, and a local 2-player duel on one phone (split screen, same matrix).

## Testing and quality

- Unit test every math function, including edge cases: $\det A = 0$, repeated eigenvalues, $A = cI$, rotations, defective matrices, values near zero.
- Property tests on generated matrices: $\operatorname{tr} A = \lambda_1 + \lambda_2$, $\det A = \lambda_1 \lambda_2$, and $A\mathbf{v} \approx \lambda \mathbf{v}$ for every returned eigenvector.
- Check every generator against its tier's constraints over 1,000 samples.
- Test every answer checker with right, wrong, and edge-case answers.
- Target 60 fps animation on a mid-range phone and a Lighthouse mobile performance score of at least 90.
- `npm run test`, `npm run lint`, and `npm run build` must pass before each commit.

## Repo hygiene

- One logical change per commit, with clear messages.
- README: what the game is, how to run it, how to add a new mini-game, and the live Pages link.
- Create a `CLAUDE.md` recording project conventions (vector and composition conventions above, tolerance values, tier rules) so future sessions stay consistent.
