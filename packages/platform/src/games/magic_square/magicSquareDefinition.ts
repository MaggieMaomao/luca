// Magic Square — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type MagicSquareState, type Cell,
  newPuzzle, setCell, isSolved,
} from './magicSquare'
import { getGame } from '../../registry'

export type MagicSquareAction =
  | { type: 'SET'; payload: { idx: number; value: number } }
  | { type: 'CLEAR'; payload: { idx: number } }
  | { type: 'RESTART' }

export interface MagicSquareStats extends GameStats {
  moves: number
}

export function initialMagic(): MagicSquareState {
  return newPuzzle() // random size → varying magic number (15 / 34 / 65)
}

export function applyMagicAction(
  state: MagicSquareState,
  action: MagicSquareAction,
): GameTransition<MagicSquareState, MagicSquareStats> {
  switch (action.type) {
    case 'SET':
      return { state: setCell(state, action.payload.idx, action.payload.value), stats: { moves: 1 } }
    case 'CLEAR':
      return { state: setCell(state, action.payload.idx, 0), stats: { moves: 0 } }
    case 'RESTART':
      return { state: newPuzzle(), consumed: true }
  }
}

export const magicSquareDefinition: GameDefinition<MagicSquareState, MagicSquareAction, MagicSquareStats> = {
  meta: getGame('magic_square')!,

  initialState: initialMagic,
  applyAction: applyMagicAction,
  isWin: isSolved,
  isLoss: () => false,

  controls: {
    keyboard: { r: { type: 'RESTART' }, R: { type: 'RESTART' } },
    touch: 'tap',
  },

  help: {
    description: 'Fill the grid with numbers 1..N² so every row, column, and diagonal sums to the magic number.',
    controls: [
      { action: 'Click an empty cell, then click a number' },
      { action: 'Click a filled cell to clear it' },
    ],
    goal: 'Reach the magic number in every row, column, and diagonal.',
  },

  stat: {
    label: 'games.magic_square.cells_filled',
    compute: (state) => state.grid.filter(c => c !== 0).length,
  },

  render: () => null as any,
}