# @luca-game/engine

A small, framework-coupled-to-React library for running any game in a browser. The engine is UI-agnostic — it doesn't know what games exist, it just runs them.

## What it does

- Defines a `GameDefinition<TState, TAction, TStats>` contract that any game implements
- Provides a React hook (`useGameController`) that runs the state machine
- Provides a React component (`<GameEngine>`) that renders the header, body, footer, help overlay, and win banner
- Handles keyboard input (with extension points for game-specific keys)
- Persists state via a `GameStorage` interface (default: `LocalStorageAdapter`)

## What it does NOT do

- It does not know about specific games. See [`@luca-game/platform`](../platform) for the registry of bundled games.
- It does not include any HTTP/Auth/Theming. Consumers wire those in.

## Install

```bash
npm install @luca-game/engine
```

## Usage

```tsx
import { GameEngine, type GameDefinition } from '@luca-game/engine'

const myGame: GameDefinition = {
  meta: { slug: 'my-game', title: 'My Game' },
  initialState: () => ({ score: 0 }),
  // ... rest of the contract
}

function MyGame() {
  return <GameEngine definition={myGame} />
}
```

## License

MIT — see [LICENSE](./LICENSE).

Part of the [luca monorepo](https://github.com/MaggieMaomao/luca).