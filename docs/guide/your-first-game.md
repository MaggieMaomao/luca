# Build your first game

We'll scaffold a game, see it in the gallery, then make it ours. ~15 minutes.

## 1. Scaffold

From the repo root:

```bash
npx create-luca-game star_catch
```

This generates `packages/platform/src/games/star_catch/`:

```
star_catch.ts            pure logic (no React) — unit-testable
star_catch.test.ts       a passing logic test
star_catchDefinition.tsx the action Game object (logic + sounds)
StarCatchGame.tsx        the React component (<GameHost game={…}/>)
index.ts                 public exports
```

The scaffold is a minimal **tapper** (tap to score) — valid and already tested.

## 2. Register it (3 edits)

The CLI prints these — make them so the game routes + shows in the gallery:

::: code-group
```ts [src/registry.ts]
// add to the GAMES array
{ slug: 'star_catch', title: 'Star Catch', icon: '⭐',
  description: 'Catch the falling stars.', status: 'playable', difficulty: 'easy' },
```
```ts [src/games/index.ts]
export { default as star_catch } from './star_catch'
```
```ts [src/PlayPage.tsx]
import StarCatchGame from './games/star_catch/StarCatchGame'
// …then in EAGER_GAMES:
'star_catch': StarCatchGame,
```
:::

## 3. Run the tests

```bash
npm test        # star_catch.test.ts is already green
npm run lint    # type-check
```

## 4. Make it yours

Open `star_catch.ts` — this is the whole game, as pure functions:

- **`init()`** → the starting `State`.
- **`mapGesture(g)`** → turn a pointer gesture into your `Intent` (`g.type` is
  `'tap' | 'swipe' | …`; a swipe carries velocity/direction).
- **`apply(state, intent, emit)`** → advance state on an intent; `emit('event')`
  to trigger sounds.
- **`step(state, dt)`** → per-frame physics (fixed timestep) — move things, apply
  gravity, resolve.
- **`outcome(state, prev)`** → return an `Outcome` (`points`, `won`) when
  something scorable happens; the engine tracks score/combo/bests.
- **`draw(ctx, state, view)`** → render to the 2D canvas.

Update `star_catch.test.ts` as you go — assert your logic (`apply` scores,
`step` moves, `outcome` fires) so `npm test` stays your safety net.

### Going 3D?

Set `meta.renderer: 'r3f'` and provide a `Scene` component instead of `draw`
(three.js loads lazily). See the `hoops` game for a full first-person 3D example.

## 5. Play it

```bash
npm run dev     # or run the platform in a host app
```

Open the gallery → **Star Catch**. 🎮

---

Next: the full [Game definition](/GAME_DEFINITION) reference, or — if an AI agent
is doing the work — point it at [`AGENTS.md`](https://github.com/MaggieMaomao/luca/blob/main/AGENTS.md).
