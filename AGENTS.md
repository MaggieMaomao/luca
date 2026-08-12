# AGENTS.md — building a Luca game with an AI coding agent

This file is the canonical, unambiguous guide for an AI agent (Claude, Cursor,
Copilot, …) adding or modifying a game in Luca. Follow it literally. There is
also an [MCP server](./packages/mcp) that exposes these steps as tools.

## Ground truth

- Monorepo (npm workspaces). Node ≥ 18.
- `packages/engine` — the engines. Games use the **action engine**:
  `@luca-game/engine/action` (values) and `@luca-game/engine/action/input`
  (pure input values, safe for `node --experimental-strip-types` tests).
- `packages/platform` — the games collection. **Games live in
  `packages/platform/src/games/<slug>/`.**
- Verify your work with: `npm test`, `npm run lint`, and `luca validate <slug>`.

## The one command to start

```bash
npx create-luca-game <slug>       # slug: lowercase letters/digits/underscores
```

This generates a **valid, test-passing** action game and prints the exact
registration edits. Prefer this over hand-writing files.

## The `Game` contract (action engine)

A game is a plain object `Game<State, Intent, Ev>`. Logic functions are **pure**
(no React/DOM) so they're testable head-lessly.

```ts
interface Game<State, Intent, Ev extends string> {
  meta: { id: string; title: string; renderer: 'canvas2d' | 'r3f'; hint?: string; description?: string }
  init(): State
  step(s: State, dt: number, emit: (e: Ev) => void): State   // pure, fixed-step
  mapGesture(g: Gesture): Intent | null                       // g.type: 'tap'|'swipe'|'cancel'|'in-progress'
  apply(s: State, i: Intent, emit: (e: Ev) => void): State    // pure
  outcome(s: State, prev: State): Outcome | null              // { points, won, comboBonus, label }
  draw?(ctx: CanvasRenderingContext2D, s: State, view: { width; height }): void   // canvas2d
  Scene?: ComponentType<...>   // r3f (3D); three.js lazy-loads
  Hud?; Overlay?; Controls?; sounds?: Partial<Record<Ev, SoundCue>>
}
```

Mount it with `<GameHost game={yourGame} />`.

## Steps to add a game

1. **Scaffold**: `npx create-luca-game <slug>`. It creates in
   `packages/platform/src/games/<slug>/`:
   - `<slug>.ts` — pure logic (edit this to be your game).
   - `<slug>.test.ts` — logic test (keep it green; extend it).
   - `<slug>Definition.tsx` — the `Game` object.
   - `<Slug>Game.tsx` — the React component (`<GameHost .../>`).
   - `index.ts` — exports (`default` = the Game object, `Component` = the React comp).

2. **Register** (three edits the scaffold prints):
   - `packages/platform/src/registry.ts` — add a `GAMES` entry
     `{ slug, title, icon, description, status: 'playable', difficulty }`.
   - `packages/platform/src/games/index.ts` — `export { default as <slug> } from './<slug>'`.
   - `packages/platform/src/PlayPage.tsx` — `import <Slug>Game from './games/<slug>/<Slug>Game'`
     and add `'<slug>': <Slug>Game,` to `EAGER_GAMES`.

3. **Implement** the logic in `<slug>.ts` (`init/mapGesture/apply/step/outcome/draw`),
   and **update `<slug>.test.ts`** to assert it.

4. **Verify** — all three must pass:
   ```bash
   luca validate <slug>     # structured check (files, registration, test)
   npm test
   npm run lint
   ```

## Rules (do NOT break these)

- **Logic files are pure** — no React/DOM imports in `<slug>.ts`. Put JSX in
  `*.tsx`. This keeps `node --experimental-strip-types` tests and the validator
  working.
- **Import extensions**: non-test source uses **extensionless** relative imports;
  **`*.test.ts`** uses explicit **`.ts`** extensions.
- **Runtime engine values** (`ThrowSystem`, …) come from
  `@luca-game/engine/action/input`; **types** from `@luca-game/engine/action`.
- Every game **must** ship a `<slug>.test.ts` that prints `RESULT: X passed, Y failed`
  and exits non-zero on failure. `npm test` must stay green.
- Keep `meta.id` === the directory slug === the registry slug.

## Self-verification loop

Generate → `luca validate <slug> --json` → read the structured issues → fix →
repeat until `npm test` and `luca validate` are clean. See also
[`llms.txt`](./llms.txt) and [docs/GAME_DEFINITION.md](./docs/GAME_DEFINITION.md).
