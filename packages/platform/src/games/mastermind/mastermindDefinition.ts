// Mastermind — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type MastermindState, type Code, type Color, type Feedback,
  newGame, isSolved, isLoss, scoreGuess, submitGuess,
} from './mastermind'
import { getGame } from '../../registry'

export type MastermindAction =
  | { type: 'SET_SLOT'; payload: { idx: number; color: Color } }
  | { type: 'CLEAR' }
  | { type: 'GUESS' }
  | { type: 'RESTART' }

export interface MastermindStats extends GameStats {
  moves: number
  guesses: number
}

export function initialMastermind(): MastermindState {
  return newGame()
}

export function applyMastermindAction(
  state: MastermindState,
  action: MastermindAction,
): GameTransition<MastermindState, MastermindStats> {
  switch (action.type) {
    case 'SET_SLOT': {
      const newGuess: Code = [...state.currentGuess]
      newGuess[action.payload.idx] = action.payload.color
      return { state: { ...state, currentGuess: newGuess }, stats: { moves: 0 } }
    }
    case 'CLEAR':
      return { state: { ...state, currentGuess: Array(4).fill(null) }, stats: { moves: 0 } }
    case 'GUESS': {
      // Guard against invalid submissions (engine.applyAction returns
      // { consumed: false } which the engine treats as "no change").
      const guess = state.currentGuess
      if (guess.some(c => c === null)) return { state, consumed: false }
      if (state.history.length >= 10) return { state, consumed: false }
      return {
        state: submitGuess(state, guess as Code),
        stats: { moves: 1, guesses: 1 },
      }
    }
    case 'RESTART':
      return { state: newGame(), consumed: true }
  }
}

export const mastermindDefinition: GameDefinition<MastermindState, MastermindAction, MastermindStats> = {
  meta: getGame('mastermind')!,

  initialState: initialMastermind,
  applyAction: applyMastermindAction,
  isWin: isSolved,
  isLoss,

  controls: {
    keyboard: { r: { type: 'RESTART' }, R: { type: 'RESTART' }, Enter: { type: 'GUESS' } },
    touch: 'tap',
  },

  help: {
    description:
      'Crack a 4-peg secret code in 10 tries. After each guess, you get feedback: black pegs = right color right place, white pegs = right color wrong place.',
    controls: [
      { action: 'Click a slot to cycle through colors' },
      { action: 'Click Submit to lock in your guess' },
    ],
    goal: 'Guess the secret code.',
  },

  stat: {
    label: 'games.mastermind.guesses',
    compute: (state) => state.history.length,
  },

  render: () => null as any,
}