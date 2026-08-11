// Lights Out — GameDefinition for the engine.

import type {
  GameDefinition, GameStats, GameTransition,
} from '@luca-game/engine'
import {
  type Board, click as applyClick, newPuzzle,
  isSolved, countOn,
} from './lights'
import { getGame } from '../../registry'

// ── Action & State types ──────────────────────────────────────

export type LightsAction =
  | { type: 'CLICK'; payload: { r: number; c: number } }
  | { type: 'RESTART' }

export interface LightsStats extends GameStats {
  moves: number
}

// ── Initial state ─────────────────────────────────────────────

export function initialLights(): Board {
  return newPuzzle(5)
}

// ── Pure move logic ───────────────────────────────────────────

export function applyLightsAction(
  state: Board,
  action: LightsAction,
): GameTransition<Board, LightsStats> {
  if (action.type !== 'CLICK') {
    return { state, consumed: false }
  }
  const next = applyClick(state, action.payload.r, action.payload.c)
  return {
    state: next,
    stats: { moves: 1 },
    consumed: true,
  }
}

// ── Win ────────────────────────────────────────────────────────

export function isWinLights(state: Board): boolean {
  return isSolved(state)
}

// No loss — every Lights Out puzzle is solvable, so no-loss is the default.

// ── Helpers ───────────────────────────────────────────────────

export function lightsStatValue(state: Board): number {
  return countOn(state)
}

// ── GameDefinition ─────────────────────────────────────────────

export const lightsDefinition: GameDefinition<Board, LightsAction, LightsStats> = {
  meta: getGame('lights')!,

  initialState: initialLights,
  applyAction: applyLightsAction,
  isWin: isWinLights,

  controls: {
    keyboard: {
      r: { type: 'RESTART' },
      R: { type: 'RESTART' },
    },
    touch: 'tap',
  },

  help: {
    description:
      'A 5×5 grid of lights, all on at the start. Click any cell to toggle it and its 4 orthogonal neighbors. Turn all the lights off to win.',
    controls: [
      { action: 'Click any cell to toggle it + its 4 neighbors' },
      { keys: 'R', action: 'new puzzle (same difficulty)' },
    ],
    goal: 'Turn all lights OFF in as few moves as possible.',
  },

  stat: {
    label: 'games.play.lights_on',
    compute: (state) => countOn(state),
  },

  // Render — overridden in LightsOut.tsx because it needs JSX
  render: () => null as any,
}