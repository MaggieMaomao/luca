// Game engine — state machine.
//
// Pure functions for transitioning between GameStatus values.
// Centralizing this means every game follows the same lifecycle rules.
// Adding a new status (e.g. 'replay') is one change here.

import type { GameStatus } from './contracts'
import { STATUS_TRANSITIONS } from './contracts'

/** Whether a transition is allowed. */
export function canTransition(from: GameStatus, to: GameStatus): boolean {
  if (from === to) return true  // self-loops are always allowed (idempotent)
  return STATUS_TRANSITIONS[from].includes(to)
}

/** Transition with validation. Returns null if not allowed. */
export function transition(from: GameStatus, to: GameStatus): GameStatus | null {
  if (canTransition(from, to)) return to
  return null
}

/** The terminal states (no further progression, only restart). */
export const TERMINAL_STATES: GameStatus[] = ['won', 'lost']

/** Whether the state is a terminal state. */
export function isTerminal(status: GameStatus): boolean {
  return TERMINAL_STATES.includes(status)
}

/** Whether the game is currently interactive (player can dispatch actions). */
export function isInteractive(status: GameStatus): boolean {
  return status === 'playing'
}

/** Whether the game has finished (won or lost). */
export function isFinished(status: GameStatus): boolean {
  return status === 'won' || status === 'lost'
}

/** Whether the user has started playing. */
export function hasStarted(status: GameStatus): boolean {
  return status !== 'idle' && status !== 'loading'
}