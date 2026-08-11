# Completion API

A standard contract for **server-side validation** and **assisted
resolution** of game completions.

## Why

- The client knows when it thinks it won, but the server should be
  authoritative (avoid cheating, handle network lapses, centralize
  the scoreboard).
- Some games benefit from server-side hints or full solutions (e.g.
  a hard sudoku puzzle).

## The interface

```ts
interface CompletionClient {
  check<GState, GStats>(
    req: CompletionRequest<GState>
  ): Promise<CompletionResponse>

  resolve<GState, TAction>(
    req: ResolveRequest<GState>
  ): Promise<ResolveResponse<TAction>>
}
```

## `CompletionRequest`

What the client sends when a game might be complete.

```ts
interface CompletionRequest<GState = unknown> {
  gameId: string                 // e.g. "sudoku" or "2048"
  difficulty?: string            // e.g. "medium"
  state: GState                  // current game state (game-specific)
  finalStats: GameStats          // moves, score, elapsed
  reportedComplete: boolean      // did the client think it was complete?
}
```

## `CompletionResponse`

What the server returns.

```ts
interface CompletionResponse {
  complete: boolean

  /** Server-authoritative final stats. Overrides client values. */
  record?: {
    validMoves: number
    score: number
    elapsedSeconds: number
    achievedAt: string           // ISO timestamp
  }

  /** If the server detected a problem. */
  error?: {
    code: 'INVALID_STATE' | 'CHEAT_DETECTED' | 'NOT_REACHABLE'
    message: string
  }
}
```

## `ResolveRequest` / `ResolveResponse`

The client asks the server for one or more next moves.

```ts
interface ResolveRequest<GState = unknown> {
  gameId: string
  state: GState
  maxSteps?: number              // default 1
}

interface ResolveResponse<TAction = unknown> {
  steps: Array<{
    action: TAction             // e.g. { type: 'INPUT', payload: {...} }
    explanation?: string         // "Place 5 at row 1 col 3"
  }>
  unsolvable?: boolean
  hints?: string[]               // optional partial-help
}
```

## Default impl: `LocalCompletionClient`

If you don't have a server, use `LocalCompletionClient`. It trusts
the client and returns the client's reported stats as-is. Useful for
single-player local-only apps and for development.

```ts
import { LocalCompletionClient } from '@luca-game/platform'
const client = new LocalCompletionClient()
```

## Wiring it up

In your React tree:

```tsx
import { CompletionProvider } from '@luca-game/platform'

<CompletionProvider client={myHttpClient}>
  <Gallery />
  <PlayPage />
</CompletionProvider>
```

The engine fires `useCompletionOnWin()` automatically when a game
transitions to `won`. The provider's client is called with the
final state; the result is available via `useCompletionResult()`.

## Implementing an HTTP client (CatoBigato example)

```ts
import type { CompletionClient, CompletionRequest, CompletionResponse } from '@luca-game/platform'

export class HttpCompletionClient implements CompletionClient {
  async check(req: CompletionRequest): Promise<CompletionResponse> {
    const r = await fetch('/api/luca/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!r.ok) throw new Error(`Completion check failed: ${r.status}`)
    return r.json()
  }

  async resolve(req: ResolveRequest): Promise<ResolveResponse> {
    const r = await fetch('/api/luca/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!r.ok) throw new Error(`Resolve failed: ${r.status}`)
    return r.json()
  }
}
```

## Server-side validators (one per game)

The platform ships optional validators:

- `validate2048` — checks the board is reachable from initial state with the reported moves
- `validateSudoku` — checks no duplicates in any row/column/box
- `validateLights` — checks all cells are off

Consumers can wire these into their backend or override with their own.

## Canonical completion state (`serializeCompletion`)

The state POSTed to `/complete` is the game's **canonical** state, not its rich
in-memory state. A game whose engine state differs from what the validator
expects declares a `serializeCompletion(state)` on its `GameDefinition`; the
engine applies it before sending. Current serializers:

| Game | In-memory state | Canonical (wire) state |
|---|---|---|
| 2048 | `Tile[][]` (objects) | `number[][]` grid |
| sudoku | `{ puzzle, board, … }` | `board: number[][]` (9×9) |
| sliding_blocks | `{ size, cells: 1D[], … }` | `number[][]` (size×size) |
| tangram | `{ target, pieces, locked }` | `{ target:{cells}, pieces:[{id,cells}] }` |
| lights, towers_of_hanoi | (already canonical) | identity |

Validators (and conformance fixtures) operate on this canonical shape.

## Conformance fixtures (JS ↔ Python parity)

Each validated game ships a `<slug>/<slug>.cases.json` of shared test cases so
the TS canonical logic and the Python validator port can't drift:

```jsonc
{
  "game": "towers_of_hanoi",
  "cases": [
    {
      "name": "solved (reported)",
      "state": { "disks": 3, "pegs": { "A": [], "B": [], "C": [3,2,1] }, "moves": 7 },
      "finalStats": { "moves": 7 },   // optional
      "reportedComplete": true,
      "difficulty": null,             // optional
      "expect": { "complete": true, "errorCode": null }  // errorCode optional
    }
  ]
}
```

`state` is the **canonical** completion state (above). Recommended cases per
game: solved-reported, solved-under-reported, not-solved, cheat
(reports-complete-but-not), malformed.

Two runners check the **same** fixtures:

- **TS** — `packages/platform/src/games/conformance.test.ts` (part of `npm test`):
  the game's canonical solved-predicate must equal each case's `expect.complete`.
- **Python** — `catobigato.com/backend/tests/luca/test_conformance.py`: the
  registered validator's full verdict (`complete` + `error_code`) must match
  `expect`.

If both runners match the fixtures, the two implementations agree.