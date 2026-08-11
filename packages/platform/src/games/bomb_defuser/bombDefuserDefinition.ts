// BombDefuser — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type BombState, type Wire,
  newGame, isSolved, isLoss, cut, tick,
} from './bombDefuser'
import { getGame } from '../../registry'

// ── Action & State types ──────────────────────────────────────

export type BombAction =
  | { type: 'CUT'; payload: { wire: Wire } }
  | { type: 'TICK' }
  | { type: 'RESTART' }

export interface BombStats extends GameStats {
  moves: number
}

// ── Initial state ─────────────────────────────────────────────

export function initialBomb(): BombState {
  return newGame()
}

// ── Pure move logic ───────────────────────────────────────────

export function applyBombAction(
  state: BombState,
  action: BombAction,
): GameTransition<BombState, BombStats> {
  switch (action.type) {
    case 'CUT':
      return { state: cut(state, action.payload.wire), stats: { moves: 1 } }
    case 'TICK': {
      // Tick by 1 second. The component's setInterval will dispatch
      // this; we just return the updated state.
      const next = tick(state, 1)
      return { state: next, stats: { moves: 0 } }
    }
    case 'RESTART':
      return { state: newGame(), consumed: true }
  }
}

// ── Win / loss ────────────────────────────────────────────────

export function isWinBomb(state: BombState): boolean {
  return isSolved(state)
}

export function isLossBomb(state: BombState): boolean {
  return isLoss(state)
}

// ── GameDefinition ─────────────────────────────────────────────

export const bombDefuserDefinition: GameDefinition<BombState, BombAction, BombStats> = {
  meta: getGame('bomb_defuser')!,

  initialState: initialBomb,
  applyAction: applyBombAction,
  isWin: isWinBomb,
  isLoss: isLossBomb,

  controls: {
    keyboard: {
      r: { type: 'RESTART' },
      R: { type: 'RESTART' },
    },
    touch: 'tap',
  },

  help: {
    description:
      'A bomb will explode in 60 seconds. Read the clue, identify the correct color, and cut the matching wire. Cutting the wrong wire ends the game.',
    controls: [
      { action: 'Click the wire that matches the clue' },
      { keys: 'R', action: 'restart with a new bomb' },
    ],
    goal: 'Cut the right wire before time runs out.',
  },

  stat: {
    label: 'games.bomb_defuser.time_left',
    compute: (state) => state.timeRemaining,
  },

  render: () => null as any,
}