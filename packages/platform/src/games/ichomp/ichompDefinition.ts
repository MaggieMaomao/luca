// iChomp — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type IchompState,
  newGame, applyMove, isLegal, isWin, isLoss, aiMove, remainingCount,
} from './ichomp'
import { getGame } from '../../registry'

export type IchompAction =
  | { type: 'CHOMP'; payload: { r: number; c: number } }
  | { type: 'NEW'; payload: { rows: number; cols: number } }
  | { type: 'RESTART' }

export interface IchompStats extends GameStats {
  moves: number
}

export function initialIchomp(): IchompState {
  return newGame(4, 4)
}

export function applyIchompAction(
  state: IchompState,
  action: IchompAction,
): GameTransition<IchompState, IchompStats> {
  switch (action.type) {
    case 'CHOMP': {
      if (!isLegal(state, action.payload.r, action.payload.c)) {
        return { state, consumed: false }
      }
      // Player moves; if they ate the poison the game is over (loss).
      let s = applyMove(state, action.payload.r, action.payload.c)
      if (s.loser === null && s.turn === 'ai') {
        const m = aiMove(s)
        if (m) s = applyMove(s, m[0], m[1])
      }
      return { state: s, stats: { moves: s.moves } }
    }
    case 'NEW': {
      const rows = Math.max(2, Math.min(7, Math.round(action.payload.rows)))
      const cols = Math.max(2, Math.min(7, Math.round(action.payload.cols)))
      return { state: newGame(rows, cols), consumed: true }
    }
    case 'RESTART':
      return { state: newGame(state.rows, state.cols), consumed: true }
  }
}

export const ichompDefinition: GameDefinition<IchompState, IchompAction, IchompStats> = {
  meta: getGame('ichomp')!,

  initialState: initialIchomp,
  applyAction: applyIchompAction,
  isWin,
  isLoss,

  controls: {
    keyboard: { r: { type: 'RESTART' }, R: { type: 'RESTART' } },
    touch: 'tap',
  },

  help: {
    description:
      'Chomp vs the device. Click a cell to eat it and everything below & to the right. The top-left cell is poison. You and the AI alternate — whoever is forced to eat the poison loses. You move first.',
    controls: [
      { action: 'Click a cell to eat that corner' },
      { keys: 'R', action: 'restart' },
    ],
    goal: 'Force the AI to eat the poison.',
  },

  stat: {
    label: 'games.ichomp.remaining',
    compute: (state) => remainingCount(state),
  },

  render: () => null as any,
}