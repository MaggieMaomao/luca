# Concepts

## Two engines, one collection

Luca ships **two** engines under `@luca-game/engine`, because puzzles and action
games want different loops:

| Engine | Import | For | Games |
|---|---|---|---|
| **Turn-based** | `@luca-game/engine` | Discrete-move puzzles | sudoku, 2048, chess, sokoban… |
| **Action / 3D** | `@luca-game/engine/action` | Real-time, gesture-driven, optional 3D | hoops (3D), toss (2D) |

Both are consumed by [`@luca-game/platform`](https://github.com/MaggieMaomao/luca/tree/main/packages/platform),
which holds the game **registry**, the **gallery**, and the **`PlayPage`** that
mounts a game by slug.

## The action engine's `Game` contract

An action game is a plain object implementing `Game<State, Intent, Event>`. The
engine owns time, input, audio, scoring, and rendering; your game owns its state
machine and its look.

```ts
interface Game<State, Intent, Ev extends string> {
  meta: { id; title; renderer: 'canvas2d' | 'r3f'; hint?; description? }
  init(): State
  step(s: State, dt: number, emit: (e: Ev) => void): State   // pure, fixed-step
  mapGesture(g: Gesture): Intent | null                       // flick/tap → intent
  apply(s: State, i: Intent, emit): State                     // pure
  outcome(s: State, prev: State): Outcome | null              // scoring hook
  draw?(ctx, state, view)   // canvas2d
  Scene?(...)               // r3f (3D) — lazy-loaded, three.js optional
  Hud?; Overlay?; Controls?; sounds?
}
```

Everything the engine calls (`init/step/apply/mapGesture/outcome`) is a **pure
function**, which is why game logic lives in a plain `.ts` file and is
unit-testable head-lessly under `node --experimental-strip-types` — no React, no
DOM. You mount it with `<GameHost game={yourGame} />`.

### Renderer-agnostic

`meta.renderer` picks the adapter: `canvas2d` (lean, always available) or `r3f`
(three.js / react-three-fiber). The 3D adapter is **lazy-loaded**, so 2D games —
and 2D-only apps — never bundle three.js.

## Conventions

- **Non-test source** uses extensionless relative imports; **`*.test.ts`** uses
  explicit `.ts` extensions (they run under Node's type-stripping and are
  excluded from the build).
- Keep game **logic pure** — no React/DOM in `<slug>.ts` — so the test harness
  and the LLM tooling can exercise it directly.
- Every game ships a `<slug>.test.ts`; `npm test` must stay green.

## Server-side scoring (optional)

Games can POST a completion to a host's completion API for server-side
validation + leaderboards. Puzzles ship a Python validator port; skill/action
games can trust the client score. See [Completion API](/COMPLETION_API).
