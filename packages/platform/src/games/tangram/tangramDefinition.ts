// Tangram — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  newPuzzle, movePiece as moveT, isSolved, isLoss as isLossTan,
  lockedCount, ALL_TARGETS, type TangramState, type PieceId, type TargetShape,
} from './tangram'
import { getGame } from '../../registry'

// ── Action & State types ──────────────────────────────────────

export type TangramAction =
  | { type: 'MOVE'; payload: { id: PieceId; cells: Array<[number, number]> } }
  | { type: 'SHIFT'; payload: { id: PieceId; dr: number; dc: number } }
  | { type: 'SELECT_TARGET'; payload: { target: TargetShape } }
  | { type: 'RESTART' }

export interface TangramStats extends GameStats {
  moves: number
}

// ── Initial state ─────────────────────────────────────────────

export function initialTangram(): TangramState {
  return newPuzzle()
}

// ── Pure move logic ───────────────────────────────────────────

export function applyTangramAction(
  state: TangramState,
  action: TangramAction,
): GameTransition<TangramState, TangramStats> {
  switch (action.type) {
    case 'MOVE':
      return { state: moveT(state, action.payload.id, action.payload.cells), stats: { moves: 1 } }
    case 'SHIFT': {
      const { id, dr, dc } = action.payload
      const piece = state.pieces.find(p => p.id === id)
      if (!piece) return { state }
      const newCells = piece.cells.map(([r, c]) => [r + dr, c + dc] as [number, number])
      return { state: moveT(state, id, newCells), stats: { moves: 1 } }
    }
    case 'SELECT_TARGET':
      return { state: newPuzzle(action.payload.target) }
    case 'RESTART':
      return { state: newPuzzle(state.target) }
  }
}

// ── Win / loss ────────────────────────────────────────────────

export function isWinTangram(state: TangramState): boolean {
  return isSolved(state)
}

export function isLossTangram(_state: TangramState): boolean {
  return isLossTan(_state)
}

// ── GameDefinition ─────────────────────────────────────────────

export const tangramDefinition: GameDefinition<TangramState, TangramAction, TangramStats> = {
  meta: getGame('tangram')!,
  serializeCompletion: (s) => ({ target: { cells: s.target.cells }, pieces: s.pieces.map((p) => ({ id: p.id, cells: p.cells })) }),
  initialState: initialTangram,
  applyAction: applyTangramAction,
  isWin: isWinTangram,
  isLoss: isLossTangram,

  controls: {
    keyboard: { r: { type: 'RESTART' }, R: { type: 'RESTART' } },
    touch: 'drag',
  },

  help: {
    description:
      'Drag the 7 tangram pieces to form the target shape shown. Pieces snap to grid cells. Tap "Check" to see which pieces are correctly placed.',
    controls: [
      { action: 'Drag a piece to move it' },
      { action: 'Click "Check" to verify placement' },
      { keys: 'R', action: 'restart (same target)' },
    ],
    goal: 'Place all 7 pieces so they exactly fill the target shape with no overlaps or gaps.',
  },

  stat: {
    label: 'games.play.locked',
    compute: (state) => lockedCount(state),
  },

  render: () => null as any,
}