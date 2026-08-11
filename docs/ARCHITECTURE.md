# Luca — Architecture

This document explains the design of `@luca-game/engine` and
`@luca-game/platform`, and the boundary between them.

## The big idea

```
┌─────────────────────────────────────────────────────────────┐
│  CatoBigato (consumer app)                                  │
│  • Composes luca-game/platform UI on its own routes        │
│  • Adds authentication, theming, navigation, branding       │
│  • POSTs completion to its own backend (its choice)         │
└─────────────────────────────────────────────────────────────┘
                          │ imports
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  @luca-game/platform (open-source library)                 │
│  • Game registry (the list of available games + metadata)   │
│  • Gallery UI (GameCard grid + filters)                     │
│  • PlayPage wrapper that mounts the right game              │
│  • Score storage adapter (default = localStorage)           │
│  • Completion-check, resolve-steps API contract             │
└─────────────────────────────────────────────────────────────┘
                          │ imports
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  @luca-game/engine (open-source library)                    │
│  • GameDefinition<TState, TAction, TStats> contract         │
│  • useGameController hook (React) — state machine + lifecycle│
│  • GameEngine React component — header/body/footer           │
│  • Generic on-screen keyboard handler                       │
│  • NO game-specific code, NO platform code, NO backend code │
└─────────────────────────────────────────────────────────────┘
                          │ implements
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Per-game modules (lives INSIDE @luca-game/platform,        │
│  but each game is self-contained and could move out)        │
│  • game2048/, lights/, sudoku/ — pure logic + render        │
│  • each exports { definition, default: Component, meta }   │
└─────────────────────────────────────────────────────────────┘
```

## Boundary between engine and platform

### `@luca-game/engine` owns

- **`GameDefinition<TState, TAction, TStats>`** — the contract a game implements
- **`useGameController`** — the React hook that runs the state machine
- **`<GameEngine>`** — the React component that renders header/stats/body/footer/help
- **`GameStorage`** — the persistence abstraction
- **`GameState`** — the lifecycle type
- **Keyboard input wiring** (including the `onKeyDown` extension for context-aware input)
- **Help overlay** (the "?" button + help text)
- **Win/loss banner**

### `@luca-game/engine` does NOT own

- The list of available games (registry) → **platform**
- The gallery / cards / routes → **platform**
- Any HTTP / API client → **caller app**
- Authentication → **caller app**
- Theming / i18n / navigation → **caller app**

### `@luca-game/platform` owns

- **Game registry** — `GAMES: GameMeta[]`
- **`<Gallery>`** — the card grid
- **`<PlayPage>`** — the per-game wrapper
- **`<ComingSoon>`** — the placeholder for unimplemented games
- **`<GameCard>`** — the card component
- **Score storage default impl** (wraps `GameStorage` from engine)
- **Completion-client interface** + default local fallback

### `@luca-game/platform` does NOT own

- The actual HTTP endpoint for completion/resolve → **caller app**
- Authentication for the API call → **caller app**
- Theming / branding → **caller app**
- Game logic / state machine → **engine**

## Why this split

- **Engine is reusable**: any React app can install `@luca-game/engine`, write a `GameDefinition` for their game, and get the same state machine, keyboard handling, persistence, and help/win UI for free.
- **Platform is opinionated**: `@luca-game/platform` bundles a curated collection (the 28 Luca games) plus a gallery UI. Apps can use it as-is, or use the engine alone with their own game list.
- **CatoBigato is one consumer**: it's the first adopter of both packages but does not define either package's API.

## Per-game module shape

Every game in `@luca-game/platform` lives at
`packages/platform/src/games/<slug>/` and exports via `index.ts`:

```ts
export { definition } from './myGameDefinition'
export { default as Component } from './MyGame'
export { default as meta } from './meta'  // { slug, title, icon, ... }
```

The platform's `registry.ts` imports all 28 game modules statically
and exports a flat list. This keeps bundlers happy (no dynamic
imports) and gives consumers a single point of discovery.

## Completion API (the new capability)

See [COMPLETION_API.md](./COMPLETION_API.md) for the full contract.
Short version:

- **`CompletionClient`** — interface every consumer implements
- **`LocalCompletionClient`** — default that trusts the client (no server)
- **`<CompletionProvider>`** — React context that injects the client
- **`useCompletionOnWin()`** — engine hook that fires when a game wins

Consumers wire the actual HTTP call. Luca does not provide a server;
that's the consumer's responsibility.

## Versioning

Both packages start at `0.1.0`. Pre-1.0 means the API may change in
minor versions. We commit to stabilizing at `1.0.0` once:

- The boundary is stable (no more cross-package moves)
- At least one production consumer (CatoBigato) is using it
- The completion API has shipped to at least one external integration