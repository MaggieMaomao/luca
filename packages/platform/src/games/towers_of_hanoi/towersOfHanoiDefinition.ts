// Towers of Hanoi — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  newPuzzle, applyMove as applyTowerMove, isSolved, isLoss as isLossHanoi,
  disksOnC, moveCount, optimalMoveCount, progress,
  type HanoiState, type Peg, type HanoiMove,
} from './towersOfHanoi'
import { getGame } from '../../registry'

// ── Action & State types ──────────────────────────────────────

export type TowersAction =
  | { type: 'MOVE'; payload: HanoiMove }
  | { type: 'RESTART' }
  | { type: 'SET_DISKS'; payload: { disks: number } }

export interface TowersStats extends GameStats {
  /** Total moves in this session. Duplicated in state.moves for the
   *  engine to track. The render uses state.moves; this is here for
   *  the engine's stats column. */
  moves: number
}

// ── Initial state ─────────────────────────────────────────────

export function initialTowers(): HanoiState {
  return newPuzzle(3)
}

// ── Pure move logic ───────────────────────────────────────────

export function applyTowersAction(
  state: HanoiState,
  action: TowersAction,
): GameTransition<HanoiState, TowersStats> {
  switch (action.type) {
    case 'MOVE': {
      const next = applyTowerMove(state, action.payload)
      // The pure function returns the same state (with error) on
      // illegal moves. We need to surface this as an ILLEGAL event.
      if (next.error) {
        return {
          state,  // unchanged
          events: [{ kind: 'ILLEGAL', payload: { reason: next.error } }],
          consumed: false,
        }
      }
      return {
        state: next,
        stats: { moves: 1 },
        consumed: true,
      }
    }
    case 'RESTART': {
      return {
        state: newPuzzle(state.disks),
        events: [{ kind: 'CUSTOM', payload: { type: 'RESTART' } }],
        consumed: true,
      }
    }
    case 'SET_DISKS': {
      return {
        state: newPuzzle(action.payload.disks),
        events: [{ kind: 'CUSTOM', payload: { type: 'SET_DISKS' } }],
        consumed: true,
      }
    }
  }
}

// ── Win / loss ────────────────────────────────────────────────

export function isWinTowers(state: HanoiState): boolean {
  return isSolved(state)
}

export function isLossTowers(state: HanoiState): boolean {
  return isLossHanoi(state)
}

// ── GameDefinition ─────────────────────────────────────────────

export const towersOfHanoiDefinition: GameDefinition<HanoiState, TowersAction, TowersStats> = {
  meta: getGame('towers_of_hanoi')!,

  initialState: initialTowers,
  applyAction: applyTowersAction,
  isWin: isWinTowers,
  isLoss: isLossTowers,

  controls: {
    keyboard: {
      r: { type: 'RESTART' },
      R: { type: 'RESTART' },
    },
    // Touch: tap the source peg, then tap the destination peg. The
    // TowersOut.tsx render component handles this.
    touch: 'tap',
  },

  help: {
    description:
      'Move the stack of disks from peg A to peg C. You can only move the top disk of a peg, and you cannot place a larger disk on a smaller one. Press R to start over.',
    controls: [
      { action: 'Tap source peg, then tap destination peg' },
      { action: 'Drag-and-drop on desktop' },
      { keys: 'R', action: 'new puzzle (same number of disks)' },
    ],
    goal: 'Move all disks to peg C in as few moves as possible. Optimal: 2^N - 1 moves.',
  },

  stat: {
    label: 'games.play.moves',
    compute: (state) => moveCount(state),
  },

  // Render is provided in TowersOfHanoi.tsx (JSX).
  render: () => null as any,
}