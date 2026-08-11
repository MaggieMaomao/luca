// Turtle Walk — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type TurtleState, type Direction, type Position,
  newPuzzle, predict, isSolved, isLoss,
} from './turtleWalk'
import { getGame } from '../../registry'

export type TurtleAction =
  | { type: 'PREDICT'; payload: { x: number; y: number; dir: Direction } }
  | { type: 'RESTART' }

export interface TurtleStats extends GameStats {
  moves: number
}

export function initialTurtle(): TurtleState {
  return newPuzzle()
}

export function applyTurtleAction(
  state: TurtleState,
  action: TurtleAction,
): GameTransition<TurtleState, TurtleStats> {
  switch (action.type) {
    case 'PREDICT':
      return {
        state: predict(state, { x: action.payload.x, y: action.payload.y, dir: action.payload.dir }),
        stats: { moves: 1 },
      }
    case 'RESTART':
      return { state: newPuzzle(), consumed: true }
  }
}

export const turtleWalkDefinition: GameDefinition<TurtleState, TurtleAction, TurtleStats> = {
  meta: getGame('turtle_walk')!,

  initialState: initialTurtle,
  applyAction: applyTurtleAction,
  isWin: isSolved,
  isLoss: (state) => state.prediction !== null && !isSolved(state),

  controls: {
    keyboard: { r: { type: 'RESTART' }, R: { type: 'RESTART' } },
    touch: 'tap',
  },

  help: {
    description:
      'A series of commands (F = forward, L = turn left, R = turn right) is shown. The turtle starts at (0, 0) facing N. Predict its final position and direction.',
    controls: [
      { action: 'Enter X, Y, and direction' },
      { keys: 'R', action: 'restart with new commands' },
    ],
    goal: 'Correctly predict the turtle\'s final position.',
  },

  stat: {
    label: 'games.turtle_walk.commands',
    compute: (state) => state.commands.length,
  },

  render: () => null as any,
}