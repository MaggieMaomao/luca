// Induction — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type InductionState, type Sequence,
  newState, attempt,
} from './induction'
import { getGame } from '../../registry'

export type InductionAction =
  | { type: 'GUESS'; payload: { value: number } }
  | { type: 'RESTART' }

export interface InductionStats extends GameStats {
  moves: number
}

const MAX_ATTEMPTS = 3

export function initialInduction(): InductionState {
  return newState()
}

export function applyInductionAction(
  state: InductionState,
  action: InductionAction,
): GameTransition<InductionState, InductionStats> {
  switch (action.type) {
    case 'GUESS': {
      if (state.solved || state.attempts >= MAX_ATTEMPTS) {
        return { state, consumed: false }
      }
      const next = attempt(state, action.payload.value)
      return { state: next, stats: { moves: 1 } }
    }
    case 'RESTART':
      return { state: newState(), consumed: true }
  }
}

export const inductionDefinition: GameDefinition<InductionState, InductionAction, InductionStats> = {
  meta: getGame('induction')!,

  initialState: initialInduction,
  applyAction: applyInductionAction,
  isWin: (state) => state.solved,
  isLoss: (state) => !state.solved && state.attempts >= MAX_ATTEMPTS,

  controls: {
    keyboard: {
      r: { type: 'RESTART' },
      R: { type: 'RESTART' },
    },
    touch: 'tap',
  },

  help: {
    description:
      'A number sequence is shown. Figure out the pattern, then click the next number. You have 3 attempts. After each guess, the wrong options are removed.',
    controls: [
      { action: 'Click a number to guess' },
      { keys: 'R', action: 'restart with a new sequence' },
    ],
    goal: 'Pick the correct next number in 3 attempts.',
  },

  stat: {
    label: 'games.induction.attempts',
    compute: (state) => state.attempts,
  },

  render: () => null as any,
}