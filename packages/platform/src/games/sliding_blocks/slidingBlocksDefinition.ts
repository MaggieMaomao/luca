// Sliding Blocks — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  newSolvedBoard, shuffleBoard, applyMove as applySlide, isSolved,
  isLoss as isLossBlocks, correctTiles, manhattanDistance, toRows, fromRows,
  type Board, type SlidingMove, type GridSize,
} from './slidingBlocks'
import { getGame } from '../../registry'

// ── Action & State types ──────────────────────────────────────

export type SlidingAction =
  | { type: 'SLIDE'; payload: SlidingMove }
  | { type: 'NEW'; payload: { seed: number; size: GridSize; shuffleMoves: number } }
  | { type: 'SET_SIZE'; payload: { size: GridSize } }
  | { type: 'RESTART' }

export interface SlidingStats extends GameStats {
  /** Total moves. */
  moves: number
}

// ── Initial state ─────────────────────────────────────────────

export function initialSliding(): Board {
  return shuffleBoard(0, 3, 80)
}

// ── Pure move logic ───────────────────────────────────────────

export function applySlidingAction(
  state: Board,
  action: SlidingAction,
): GameTransition<Board, SlidingStats> {
  switch (action.type) {
    case 'SLIDE': {
      const next = applySlide(state, action.payload)
      if (next.error) {
        return {
          state,
          events: [{ kind: 'ILLEGAL', payload: { reason: next.error } }],
          consumed: false,
        }
      }
      return { state: next, stats: { moves: 1 }, consumed: true }
    }
    case 'NEW': {
      const next = shuffleBoard(action.payload.seed, action.payload.size, action.payload.shuffleMoves)
      return { state: next, consumed: true }
    }
    case 'SET_SIZE': {
      // Change size and start a new shuffle
      const next = shuffleBoard(Date.now() & 0xffff, action.payload.size, action.payload.size * 30)
      return { state: next, consumed: true }
    }
    case 'RESTART': {
      // Reshuffle the same size
      const next = shuffleBoard(Date.now() & 0xffff, state.size, state.size * 30)
      return { state: next, consumed: true }
    }
  }
}

// ── Win / loss ────────────────────────────────────────────────

export function isWinSliding(state: Board): boolean {
  return isSolved(state)
}

export function isLossSliding(state: Board): boolean {
  return isLossBlocks(state)
}

// ── GameDefinition ─────────────────────────────────────────────

export const slidingBlocksDefinition: GameDefinition<Board, SlidingAction, SlidingStats> = {
  meta: getGame('sliding_blocks')!,
  serializeCompletion: (b) => Array.from({ length: b.size }, (_, r) => b.cells.slice(r * b.size, (r + 1) * b.size)),

  initialState: initialSliding,
  applyAction: applySlidingAction,
  isWin: isWinSliding,
  isLoss: isLossSliding,

  controls: {
    keyboard: {
      r: { type: 'RESTART' },
      R: { type: 'RESTART' },
    },
    // Touch: tap a tile adjacent to the empty space. The render
    // component handles this.
    touch: 'tap',
  },

  help: {
    description:
      'Slide the numbered tiles into numerical order. Tap a tile next to the empty space to slide it there. Press R to reshuffle.',
    controls: [
      { action: 'Tap any tile adjacent to the empty space' },
      { keys: 'R', action: 'new puzzle (same size)' },
    ],
    goal: 'Arrange tiles 1, 2, 3, ... with the empty space in the bottom-right.',
  },

  stat: {
    label: 'games.play.moves',
    compute: (state) => state.moves,
  },

  // Render is provided in SlidingBlocks.tsx (JSX).
  render: () => null as any,
}