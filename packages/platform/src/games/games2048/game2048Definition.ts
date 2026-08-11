// 2048 — GameDefinition for the engine.
//
// This file adapts the existing pure 2048 logic (game2048.ts) into
// the engine's contract. The engine provides:
//   - State machine (idle / playing / won / lost)
//   - Score persistence
//   - Keyboard input mapping
//   - Help overlay + win/loss banners
//
// This file provides:
//   - Initial state generator
//   - Move logic (delegating to the existing pure functions)
//   - Board renderer (with touch swipe, which the engine doesn't know)
//   - Game-specific controls + help text

import type {
  GameDefinition, GameEvent, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type Board, type Direction, type Cell, applyMove, isGameOver, hasWon, newGame,
  WIN_VALUE, SIZE,
} from './game2048'
import { getGame } from '../../registry'

// ── Action & State types ─────────────────────────────────────

export type Game2048Action =
  | { type: 'MOVE'; payload: Direction }
  | { type: 'RESTART' }

/** A single tile on the board.
 *  `id` is stable across moves (so React can animate the same DOM
 *  element from its old position to its new position), but a new
 *  id is generated for any new tile that spawns after a move. This
 *  lets CSS animations run on mount (for spawned tiles) without
 *  needing a slide animation system. */
export interface Tile2048 {
  value: Cell
  id: number
}

export type Board2048 = Tile2048[][]

export interface Game2048Stats extends GameStats {
  score: number       // accumulated score from merges
  moves: number       // number of moves made
  elapsed: number     // seconds since game start
}

// ── Initial state ─────────────────────────────────────────────

let nextId = 1
export function newBoard2048(): Board2048 {
  return newGame().map(row => row.map(v => ({ value: v, id: nextId++ })))
}

export function initial2048(): Board2048 {
  return newBoard2048()
}

/** Convert a Board2048 to a plain Board (for tests + pure logic). */
export function boardValues(b: Board2048): Board {
  return b.map(row => row.map(t => t.value))
}

// ── Pure move logic ───────────────────────────────────────────

/** Apply a move while preserving tile IDs. This wraps the pure
 *  `applyMove` (which only tracks values) and walks the board
 *  before/after to figure out which tiles ended up where.
 *
 *  Algorithm:
 *  1. Get the value-only before/after boards from `applyMove`
 *  2. For each non-zero cell in the new board, scan the corresponding
 *     row (in the right direction) to find the matching source tile
 *  3. Use that source tile's ID; mark the source as "used"
 *  4. Spawned tiles (the new cell from `applyMove` that wasn't in
 *     any source row) get a fresh ID → triggers CSS spawn animation
 *
 *  The "first match wins" heuristic works for the canonical move
 *  algorithm (compact + merge left-to-right). It's not perfect
 *  (could miss a true position tracking), but the visual result is
 *  acceptable: moved tiles keep their ID, new tiles get a new one.
 */
export function applyMoveWithIds(
  state: Board2048,
  dir: Direction,
): { board: Board2048; score: number; changed: boolean } {
  const valueBoard: Board = state.map(row => row.map(t => t.value))
  const result = applyMove(valueBoard, dir)
  if (!result.changed) {
    return { board: state, score: 0, changed: false }
  }
  // Build a "used" set of source positions
  const used: boolean[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(false),
  )
  // Build the new board in the same orientation as `result.board`
  // (which is the original orientation, since applyMove handles its
  // own rotation internally). We match against the source state also
  // in the original orientation.
  const newBoard: Board2048 = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(null as any),
  )
  // Wrap result.board in Tile[] for matching.
  const newBoardAsTiles = result.board.map(row =>
    row.map(v => ({ value: v, id: 0 })),
  )
  // Match: for each non-zero cell in newBoardAsTiles (row by row),
  // find the matching source tile in the corresponding state row and
  // preserve its ID. Spawned tiles (no source match) get a fresh ID.
  // IMPORTANT: every cell in newBoard MUST have a unique id, including
  // empty cells (value=0), otherwise React's reconciler sees duplicate
  // keys and leaves orphan DOM elements behind.
  for (let r = 0; r < SIZE; r++) {
    let sIdx = 0
    for (let c = 0; c < SIZE; c++) {
      const t = newBoardAsTiles[r][c]
      if (t.value === 0) {
        // Empty cell — give it a fresh ID so it's unique
        newBoard[r][c] = { value: 0, id: nextId++ }
        continue
      }
      // Find the first non-zero, unused tile in the source row
      while (sIdx < SIZE && (used[r][sIdx] || state[r][sIdx].value === 0)) {
        sIdx++
      }
      if (sIdx < SIZE && state[r][sIdx].value !== 0) {
        newBoard[r][c] = {
          value: t.value,
          id: state[r][sIdx].id,
        }
        used[r][sIdx] = true
      } else {
        // Spawned tile — fresh ID for animation
        newBoard[r][c] = { value: t.value, id: nextId++ }
      }
    }
  }
  // No un-rotate needed: `result.board` is already in the original
  // orientation (applyMove handles its own rotation internally).
  return { board: newBoard, score: result.score, changed: true }
}

export function apply2048Action(
  state: Board2048,
  action: Game2048Action,
): GameTransition<Board2048, Game2048Stats> {
  if (action.type !== 'MOVE') {
    return { state, consumed: false }
  }
  const result = applyMoveWithIds(state, action.payload)
  if (!result.changed) {
    return { state, consumed: false }   // illegal move, ignored
  }
  const events: GameEvent[] = []
  return {
    state: result.board,
    stats: { score: result.score, moves: 1 },  // increments per move
    events,
    consumed: true,
  }
}

// ── Win / loss ─────────────────────────────────────────────────

export function isWin2048(state: Board2048): boolean {
  return hasWon(boardValues(state))
}

export function isLoss2048(state: Board2048): boolean {
  return isGameOver(boardValues(state))
}

// ── GameDefinition ─────────────────────────────────────────────

export const game2048Definition: GameDefinition<
  Board2048, Game2048Action, Game2048Stats
> = {
  meta: getGame('2048')!,
  serializeCompletion: (board) => board.map((row) => row.map((t) => t.value)),

  initialState: initial2048,

  applyAction: apply2048Action,

  isWin: isWin2048,
  isLoss: isLoss2048,

  controls: {
    keyboard: {
      ArrowLeft:  { type: 'MOVE', payload: 'left'  },
      ArrowRight: { type: 'MOVE', payload: 'right' },
      ArrowUp:    { type: 'MOVE', payload: 'up'    },
      ArrowDown:  { type: 'MOVE', payload: 'down'  },
      a: { type: 'MOVE', payload: 'left'  },
      A: { type: 'MOVE', payload: 'left'  },
      d: { type: 'MOVE', payload: 'right' },
      D: { type: 'MOVE', payload: 'right' },
      w: { type: 'MOVE', payload: 'up'    },
      W: { type: 'MOVE', payload: 'up'    },
      s: { type: 'MOVE', payload: 'down'  },
      S: { type: 'MOVE', payload: 'down'  },
      h: { type: 'MOVE', payload: 'left'  },
      H: { type: 'MOVE', payload: 'left'  },
      l: { type: 'MOVE', payload: 'right' },
      L: { type: 'MOVE', payload: 'right' },
      k: { type: 'MOVE', payload: 'up'    },
      K: { type: 'MOVE', payload: 'up'    },
      j: { type: 'MOVE', payload: 'down'  },
      J: { type: 'MOVE', payload: 'down'  },
      r: { type: 'RESTART' },
      R: { type: 'RESTART' },
    },
    touch: 'swipe',
  },

  help: {
    description:
      'Slide tiles in one of four directions. When two tiles with the same number collide, they merge into one. Reach the 2048 tile to win.',
    controls: [
      { keys: '← ↑ → ↓', action: 'slide tiles in that direction' },
      { keys: 'W A S D', action: 'or use WASD' },
      { keys: 'H J K L', action: 'or use vim keys' },
      { action: 'Swipe on touch devices' },
      { keys: 'R', action: 'restart the game' },
    ],
    goal: `Create a ${WIN_VALUE} tile. Combine same numbers to add them.`,
  },

  stat: {
    label: 'games.play.score',
    compute: (_state, sessionStats) => sessionStats.score,
  },

  // Render — uses GameRenderContext from engine
  // (the actual JSX lives in the .tsx file so we can use React hooks there)
  render: () => null,  // overridden in Game2048.tsx
}