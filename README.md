# Eigen Rush

A linear algebra reflex game. You watch a matrix bend the plane and answer fast.

The point is intuition, not arithmetic: after a few rounds you should be able to
glance at a grid and feel what the matrix did to it — which way space got
stretched, whether it flipped over, which direction survived untouched. Every
answer, right or wrong, replays the transformation and tells you the one thing
that round was about.

**Play:** https://wei-chen-7.github.io/Eigen-Rush/

> Milestone 1 of 5. Right now the site is the matrix lab — type any 2×2 matrix
> and watch it transform. The arcade loop lands in milestone 2.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173/Eigen-Rush/
```

Other scripts:

```bash
npm run test       # Vitest, once
npm run test:watch
npm run lint
npm run build      # typecheck + production bundle into dist/
npm run preview    # serve the built bundle
```

All three of `test`, `lint` and `build` must pass before a commit.

## How it is put together

```
src/
  math/        pure functions, no React — Mat2, Vec2, det, trace, inverse,
               eigen (real and complex), angles, tolerances, the morph path
  generators/  matrix generators per mini-game and difficulty tier
  modes/       one folder per mini-game: question, answer checker, UI
  game/        loop, timer, scoring, streaks, lives, difficulty ramp
  render/      <Plane> — the SVG grid, basis arrows, unit square, morph
  ui/          menus, HUD, results, settings, KaTeX helpers
  lab/         the matrix lab (debug page)
```

Maths, game logic and rendering stay separate, so the maths can be tested on its
own — and it is: 160-odd tests, including property tests over a thousand
generated matrices checking that `tr A = λ₁ + λ₂`, `det A = λ₁λ₂`, and
`A v = λ v` for every eigenvector the solver hands back.

Conventions (column vectors, composition order, tolerances, tier rules) are
written down in [CLAUDE.md](./CLAUDE.md). Read that before changing the maths.

## Adding a new mini-game

A mini-game is three things: something to ask, a way to check the answer, and a
screen to ask it on. Each lives in its own folder under `src/modes/`.

1. **Make a folder**, `src/modes/myGame/`.

2. **Write the question generator.** It takes a tier and a seeded random source
   and returns a question — usually a matrix plus whatever else the round needs:

   ```ts
   export function generateMyGame(tier: Tier, rng: () => number): MyGameQuestion {
     const matrix = generateForTier(tier, rng);
     return { matrix, prompt: '…' };
   }
   ```

   Pull matrices from `src/generators/` rather than rolling your own, so tier
   rules stay in one place. Remember that defective matrices are not allowed
   before tier 3.

3. **Write the answer checker** as a pure function — no React, no DOM:

   ```ts
   export function checkMyGame(q: MyGameQuestion, answer: Answer): boolean;
   ```

   Keep it pure and it stays testable, which the next step needs.

4. **Test both.** Check the generator against its tier's constraints over 1,000
   samples, and the checker with right answers, wrong answers, and the edge
   cases that matter for your question — `det A = 0`, `A = cI`, repeated
   eigenvalues, and `u` versus `−u` if the answer is a direction.

5. **Write the component.** Render the question with `<Plane>`, take the
   player's input, and call the checker. Hit targets are at least 44 px, no
   hover-only interactions, and the grid is the loudest thing on screen.

6. **Write the one-line insight** shown after every answer. One sentence, plain
   language, about the idea rather than the arithmetic — "the columns of A are
   where î and ĵ land", not "multiply row by column".

7. **Register it** in the mode registry so the arcade loop can draw it, and say
   which tiers it appears in.

## Deploying

Pushing to `main` builds and publishes to GitHub Pages
(`.github/workflows/deploy.yml`). The Vite `base` is `/Eigen-Rush/`, matching the
repository name — GitHub Pages paths are case-sensitive, so that string has to
stay in step with the repo if it is ever renamed.

The base applies to the dev and preview servers too, not just builds, so all
three serve the site at the same path. That is deliberate: with a build-only
base, `npm run preview` mounts at `/` while the built `index.html` asks for
`/Eigen-Rush/...`, and every asset request quietly falls back to `index.html` —
a blank page that looks like a code bug and can never verify the real deploy.
