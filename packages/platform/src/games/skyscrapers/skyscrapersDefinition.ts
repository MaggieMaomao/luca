// Skyscrapers — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type SkyscraperState,
  newPuzzle, setCell, isSolved,
} from './skyscrapers'
import { getGame } from '../../registry'

export type SkyscrapersAction =
  | { type: 'SET'; payload: { r: number; c: number; value: number } }
  | { type: 'CLEAR'; payload: { r: number; c: number } }
  | { type: 'RESTART' }

export interface SkyscrapersStats extends GameStats {
  moves: number
}

export function initialSkyscrapers(): SkyscraperState {
  return newPuzzle(5)
}

export function applySkyscrapersAction(
  state: SkyscraperState,
  action: SkyscrapersAction,
): GameTransition<SkyscraperState, SkyscrapersStats> {
  switch (action.type) {
    case 'SET':
      return { state: setCell(state, action.payload.r, action.payload.c, action.payload.value), stats: { moves: 1 } }
    case 'CLEAR':
      return { state: setCell(state, action.payload.r, action.payload.c, 0), stats: { moves: 0 } }
    case 'RESTART':
      return { state: newPuzzle(5), consumed: true }
  }
}

export const skyscrapersDefinition: GameDefinition<SkyscraperState, SkyscrapersAction, SkyscrapersStats> = {
  meta: getGame('skyscrapers')!,

  initialState: initialSkyscrapers,
  applyAction: applySkyscrapersAction,
  isWin: isSolved,
  isLoss: () => false,

  controls: {
    keyboard: { r: { type: 'RESTART' }, R: { type: 'RESTART' } },
    touch: 'tap',
  },

  help: {
    description: 'Fill the grid so each row/column has heights 1..N with no repeats, and edge clues show the visible skyscrapers from that direction.',
    controls: [
      { action: 'Click a cell, then pick a height' },
    ],
    goal: 'Match all edge clues.',
  },

  stat: {
    label: 'games.skyscrapers.filled',
    compute: (state) => state.grid.flat().filter(v => v !== 0).length,
  },

  render: () => null as any,
}