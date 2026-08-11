# Luca

[![npm](https://img.shields.io/npm/v/@luca-game/engine.svg)](https://www.npmjs.com/package/@luca-game/engine)
[![npm](https://img.shields.io/npm/v/@luca-game/platform.svg)](https://www.npmjs.com/package/@luca-game/platform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> A small, open-source game platform: a generic engine for running
> any kind of puzzle or strategy game in a browser, plus a curated
> collection of games that use it.

Luca powers [CatoBigato](https://catobigato.com)'s game section
but is designed to be consumed by any web app. It is **two npm
packages**:

| Package | Purpose |
|---|---|
| **[@luca-game/engine](./packages/engine)** | Framework-coupled React state machine for running a single game. Generic, no opinion about what games exist or how they're listed. |
| **[@luca-game/platform](./packages/platform)** | The Luca games collection: registry of all available games, gallery UI, play wrapper, completion-check / resolve-steps API contract. |

---

## Why

Games are surprisingly hard to integrate well:

- State machines need to handle win/loss, persistence, keyboard input, and help overlays — these are the same for every game.
- Apps want to own their theming, auth, and routing.
- Multiple consumers (CatoBigato, third-party apps, future mobile) want the same games without re-implementing them.

Luca splits along the line **"things every game needs"** (engine) vs **"the actual games and their gallery"** (platform). CatoBigato is one consumer; other apps can embed either layer.

---

## Status

**v0.1.0 — public preview.** Both packages are published to the public npm
registry under the `@luca-game` scope. See `docs/STATUS.md` for the
roadmap.

---

## Quick start

```bash
# Embed a single game in any React app
npm install @luca-game/engine @luca-game/platform

import { GameEngine } from '@luca-game/engine'
import { sudoku } from '@luca-game/platform/games'

function MySudokuPage() {
  return <GameEngine definition={sudoku.definition} className="sudoku" />
}
```

For the full gallery + completion API:

```bash
# (still installing both packages)
import { Gallery, PlayPage, CompletionProvider, LocalCompletionClient }
  from '@luca-game/platform'
import { httpClient } from './my-api'

function GamesSection() {
  return (
    <CompletionProvider client={httpClient}>
      <Gallery />
      <PlayPage />
    </CompletionProvider>
  )
}
```

---

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full design, including:

- Engine vs platform boundary
- The `GameDefinition<TState, TAction, TStats>` contract
- Per-game module shape
- The completion / resolve API

---

## Adding a new game

See [docs/GAME_DEFINITION.md](./docs/GAME_DEFINITION.md). Each game lives under
`packages/platform/src/games/<slug>/` and exports:

```ts
export { definition } from './myGameDefinition'
export { default as Component } from './MyGame'
export { default as meta } from './meta'
```

Then register it in `packages/platform/src/registry.ts`.

---

## License

MIT — see [LICENSE](./LICENSE). Free to use, modify, and distribute.