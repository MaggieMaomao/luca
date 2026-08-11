# Adding a new game

A step-by-step guide for adding a new game to `@luca-game/platform`.

## 1. Create the directory

```
packages/platform/src/games/<slug>/
```

Use a lowercase, hyphen-free slug (e.g. `minesweeper`, `tictactoe`, `2048`).

## 2. Write the pure logic (no React, no DOM)

`game<Slug>.ts` — exports `applyAction`, `isWin`, `isLoss`, `initialState`, etc.
This file has **zero React imports**. It can be unit-tested in plain Node.

```ts
export type State = number[][]
export type Action = { type: 'REVEAL'; payload: { r: number; c: number } }

export function initialState(): State {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}

export function applyAction(state: State, action: Action): State {
  // ... pure state transition ...
}

export function isWin(state: State): boolean { /* ... */ }
```

## 3. Define the GameDefinition

`<slug>Definition.ts` — implements the engine's `GameDefinition<TState, TAction, TStats>` contract:

```ts
import { GameDefinition } from '@luca-game/engine'
import { initialState, applyAction, isWin } from './game<Slug>'

export const myDefinition: GameDefinition<State, Action, Stats> = {
  meta: { slug: 'myslug', title: 'My Game', /* ... */ },
  initialState,
  applyAction,
  isWin,
  controls: { keyboard: { r: { type: 'RESTART' } } },
  help: { description: '...', controls: [...], goal: '...' },
  render: () => null as any,  // overridden in the JS file
}
```

The render function returns JSX, so it lives in the JSX file to keep
the definition importable from non-JSX contexts.

## 4. Build the React component

`<Slug>.tsx` — uses `<GameEngine>` from the engine package:

```tsx
import { GameEngine } from '@luca-game/engine'
import { myDefinition } from './<slug>Definition'

export default function MyGame() {
  return <GameEngine definition={{ ...myDefinition, render }} className="mygame" />
}
```

## 5. Write the metadata

`meta.ts` — exports a `GameMeta` object (used by the registry):

```ts
export default {
  slug: 'myslug',
  title: 'My Game',
  icon: '◆',
  description: 'A short pitch.',
  controls: 'Arrow keys to move',
  status: 'playable' as const,
  difficulty: 'easy' as const,
  category: 'puzzle',
}
```

## 6. Export from index.ts

```ts
export { myDefinition as definition } from './<slug>Definition'
export { default as Component } from './<Slug>'
export { default as meta } from './meta'
```

## 7. Register in the platform registry

`packages/platform/src/registry.ts`:

```ts
import * as myGame from './games/myslug'

export const PLAYABLE_GAMES = [game2048, lights, sudoku, myGame]
```

## 8. (Optional) Add a completion validator

If your game can be validated server-side, add a `<slug>Validator.ts`
under `packages/platform/src/completion/validators/` that takes a
`CompletionRequest` and returns a `CompletionResponse`. The default
`LocalCompletionClient` won't use it, but consumers can wire it into
their HTTP client.

## 9. Write unit tests

Place `game<Slug>.test.ts` next to `game<Slug>.ts`. Run with your
preferred runner — Luca ships test-agnostic pure logic.

## 10. Verify

```bash
cd packages/platform
npm run lint
npm run build
```

That's it. Your game is now part of the Luca platform and available
to every consumer.