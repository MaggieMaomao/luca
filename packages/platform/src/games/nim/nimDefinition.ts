// Nim — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type NimState, type NimMove,
  newNimGame, applyMove, playerWon, isLoss, isValidMove,
  optimalMove,
} from './nim'
import { getGame } from '../../registry'

export type NimAction =
  | { type: 'MOVE'; payload: NimMove }
  | { type: 'RESTART' }

export interface NimStats extends GameStats {
  moves: number
  wins: number
}

export function initialNim(): NimState {
  return newNimGame()
}

export function applyNimAction(
  state: NimState,
  action: NimAction,
): GameTransition<NimState, NimStats> {
  switch (action.type) {
    case 'MOVE': {
      if (!isValidMove(state, action.payload)) {
        return { state, consumed: false }
      }
      // Player takes stones; if that emptied the board the player wins and
      // the AI doesn't get to reply.
      let s = applyMove(state, action.payload)
      if (s.winner === null) {
        // AI plays the optimal nim-sum move (a real opponent — the start
        // position is a first-player win, so a careful human can still beat
        // it; the Hint button shows the winning move).
        const ai = optimalMove(s)
        if (ai) s = applyMove(s, ai)
      }
      return { state: s, stats: { moves: s.moves } }
    }
    case 'RESTART':
      return { state: newNimGame(), consumed: true }
  }
}

export const nimDefinition: GameDefinition<NimState, NimAction, NimStats> = {
  meta: getGame('nim')!,

  initialState: initialNim,
  applyAction: applyNimAction,
  isWin: playerWon,
  isLoss,

  controls: {
    keyboard: {
      r: { type: 'RESTART' },
      R: { type: 'RESTART' },
    },
    touch: 'tap',
  },

  help: {
    description:
      'Three piles of stones. Each turn, remove any positive number of stones from one pile. The player who takes the last stone wins. (For two-player mode, the AI plays randomly.)',
    controls: [
      { action: 'Click a pile to select it, then click a number to take that many stones' },
      { keys: 'R', action: 'restart with new piles' },
    ],
    goal: 'Take the last stone.',
  },

  stat: {
    label: 'games.nim.stones_remaining',
    compute: (state) => state.piles.reduce((a, b) => a + b, 0),
  },

  render: () => null as any,
}