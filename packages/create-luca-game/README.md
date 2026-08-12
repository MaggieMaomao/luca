# create-luca-game

Scaffold a new [Luca](https://github.com/MaggieMaomao/luca) game (action engine)
into `@luca-game/platform`.

## Usage

From the Luca repo root:

```bash
npx create-luca-game <slug>
# or
node packages/create-luca-game/index.mjs <slug>
```

`<slug>` is lowercase letters/digits/underscores (e.g. `star_catch`).

It generates `packages/platform/src/games/<slug>/`:

| File | What it is |
|---|---|
| `<slug>.ts` | Pure game **logic** (no React) — unit-testable under `node --experimental-strip-types`. |
| `<slug>.test.ts` | A passing logic test. |
| `<slug>Definition.tsx` | The action **`Game`** object (logic + sounds). |
| `<Slug>Game.tsx` | The React **component** (`<GameHost game={…}/>`). |
| `index.ts` | Public exports. |

Then it prints the **three edits** to register the game (`registry.ts`,
`games/index.ts`, `PlayPage.tsx`) so it appears in the gallery.

The scaffold is a minimal but valid **"tapper"** (tap to score) so `npm test`
is green immediately — replace its logic with your game. See
[`docs/GAME_DEFINITION.md`](../../docs/GAME_DEFINITION.md) for the full `Game`
contract, and [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for conventions.

MIT © MaggieMaomao
