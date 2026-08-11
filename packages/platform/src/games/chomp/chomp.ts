// Chomp — pure game logic.
//
// The classic 2-player Chomp (poisoned chocolate) game. A rectangular
// grid of cells. Each turn, a player picks a cell and "eats" it along
// with all cells above and to the right. The player forced to eat the
// poison square (bottom-left, in our convention) loses.
//
// This implementation is solo-player against a random opponent (or
// simple heuristic). For a true 2-player game, see ChompMultiplayer
// (not implemented — out of scope for the educational version).
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type ChompState = {
  rows: number
  cols: number
  grid: boolean[][]
  moves: number
  /** 'player' or 'opponent' — whose turn */
  turn: 'player' | 'opponent'
}

export function newGame(rows: number = 4, cols: number = 5): ChompState {
  const grid: boolean[][] = []
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(true))
  }
  return { rows, cols, grid, moves: 0, turn: 'player' }
}

export function isLegal(state: ChompState, r: number, c: number): boolean {
  if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return false
  return state.grid[r][c]
}

export function applyMove(state: ChompState, r: number, c: number): ChompState {
  if (!isLegal(state, r, c)) return state
  const grid = state.grid.map(row => row.slice())
  for (let i = r; i < state.rows; i++) {
    for (let j = c; j < state.cols; j++) {
      grid[i][j] = false
    }
  }
  return {
    ...state,
    grid,
    moves: state.moves + 1,
    turn: state.turn === 'player' ? 'opponent' : 'player',
  }
}

/** The poison square is at (rows-1, 0) — bottom-left. */
export function poisonEaten(state: ChompState): boolean {
  return !state.grid[state.rows - 1][0]
}

export function isGameOver(state: ChompState): boolean {
  return state.grid.every(row => row.every(c => !c))
}

export function isWin(state: ChompState): boolean {
  // Player wins if it's the opponent's turn and the opponent is forced
  // to eat poison. Easiest check: it's the opponent's turn and the
  // game is over.
  return isGameOver(state) && !poisonEaten(state)
    || (state.turn === 'opponent' && poisonEaten(state))
}

export function isLoss(state: ChompState): boolean {
  // Player loses if it's their turn and only the poison remains.
  return state.turn === 'player' && isGameOver(state) && poisonEaten(state)
}

export function isSolved(state: ChompState): boolean {
  return isWin(state)
}

export function newPuzzle(): ChompState {
  return newGame()
}

/** Opponent picks a "safe" move: avoid the (rows-1, 0) cell unless forced. */
export function opponentMove(state: ChompState): [number, number] | null {
  if (state.turn !== 'opponent') return null
  // Find any edible cell that's not the poison
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c] && !(r === state.rows - 1 && c === 0)) {
        return [r, c]
      }
    }
  }
  // Forced: eat the poison
  for (let r = state.rows - 1; r >= 0; r--) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c]) return [r, c]
    }
  }
  return null
}