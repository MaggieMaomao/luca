// Nim — pure game logic.
//
// The classic impartial game. N piles of stones. Each turn, remove
// any positive number of stones from exactly one pile. The player
// who takes the LAST stone wins.
//
// Misère variant: the player who takes the LAST stone LOSES.
// (Luca uses normal play — last stone wins — by default.)
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type NimMove = { pile: number; count: number }
export type NimState = {
  piles: number[]
  moves: number
  /** Whose turn it is. */
  turn: 'player' | 'ai'
  /** Whether the game uses misère rules. */
  misere: boolean
  /** Who took the last stone (and thus the result), or null while live. */
  winner: 'player' | 'ai' | null
}

export function newNimGame(piles: number[] = [3, 5, 7], misere = false): NimState {
  return { piles: piles.slice(), moves: 0, turn: 'player', misere, winner: null }
}

/** Alias used by the engine's GameDefinition. */
export const newPuzzle = newNimGame

export function isValidMove(state: NimState, move: NimMove): boolean {
  if (move.pile < 0 || move.pile >= state.piles.length) return false
  if (move.count < 1) return false
  if (move.count > state.piles[move.pile]) return false
  return true
}

export function applyMove(state: NimState, move: NimMove): NimState {
  if (!isValidMove(state, move) || state.winner !== null) return state
  const piles = state.piles.slice()
  piles[move.pile] -= move.count
  const over = piles.every(p => p === 0)
  // Whoever empties the board took the last stone. Normal play: that mover
  // wins. Misère: that mover loses (so the OTHER side is the winner).
  let winner: 'player' | 'ai' | null = state.winner
  if (over) {
    winner = state.misere
      ? (state.turn === 'player' ? 'ai' : 'player')
      : state.turn
  }
  return {
    ...state,
    piles,
    moves: state.moves + 1,
    turn: state.turn === 'player' ? 'ai' : 'player',
    winner,
  }
}

/** Game is over when all piles are empty. */
export function isGameOver(state: NimState): boolean {
  return state.piles.every(p => p === 0)
}

/** True once the human has won. */
export function playerWon(state: NimState): boolean {
  return state.winner === 'player'
}

/** Compute the nim-sum (xor of all pile sizes). Used to determine
 *  if the current player is in a winning position. */
export function nimSum(state: NimState): number {
  return state.piles.reduce((acc, p) => acc ^ p, 0)
}

/** True if the current player (the one about to move) can force a win.
 *  In normal Nim, player wins iff nim-sum is 0 (i.e. they're behind
 *  and can equalize).
 *  In misère Nim, the rule inverts for all-zero or all-one piles. */
export function isWinningPosition(state: NimState): boolean {
  const s = nimSum(state)
  if (state.misere) {
    // Misère: standard rule inverts unless all piles are size 1.
    const allOnes = state.piles.every(p => p === 0 || p === 1)
    if (allOnes) return s !== 0
    return s === 0
  }
  return s !== 0
}

/** Player loses when the AI takes the last stone (normal play). */
export function isLoss(state: NimState): boolean {
  return state.winner === 'ai'
}

/** The engine's win check: the human took the last stone. */
export function isSolved(state: NimState): boolean {
  return state.winner === 'player'
}

/** Optimal move for the current player (if winning position).
 *  Returns null if no winning move exists (i.e. we're losing). */
export function optimalMove(state: NimState): NimMove | null {
  const s = nimSum(state)
  if (s === 0) {
    // No winning move; just return any valid one
    for (let i = 0; i < state.piles.length; i++) {
      if (state.piles[i] > 0) return { pile: i, count: 1 }
    }
    return null
  }
  // Find a pile where pile XOR s < pile; take `count = pile - (pile XOR s)` stones.
  for (let i = 0; i < state.piles.length; i++) {
    const pile = state.piles[i]
    const target = pile ^ s
    if (target < pile) {
      return { pile: i, count: pile - target }
    }
  }
  return null
}