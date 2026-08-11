// iChomp — pure game logic (solo vs the "i" — the device).
//
// Chomp on a ROWS×COLS grid. The top-left cell (0,0) is POISON. On your turn
// you eat a cell, which also eats every cell below and to the right of it. You
// and the AI alternate; whoever is forced to eat the poison loses. You move
// first (the first player has a winning strategy in Chomp — find it!).
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type IchompState = {
  rows: number
  cols: number
  /** 2D grid [rows][cols]. true = still present, false = eaten. */
  grid: boolean[][]
  moves: number
  /** Whose turn: 'player' or 'ai'. */
  turn: 'player' | 'ai'
  /** Who ate the poison (and thus lost), or null while the game is live. */
  loser: 'player' | 'ai' | null
}

export function newGame(rows: number = 4, cols: number = 4): IchompState {
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(true))
  return { rows, cols, grid, moves: 0, turn: 'player', loser: null }
}

export function isLegal(state: IchompState, r: number, c: number): boolean {
  if (state.loser !== null) return false
  if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return false
  return state.grid[r][c]
}

export function applyMove(state: IchompState, r: number, c: number): IchompState {
  if (!isLegal(state, r, c)) return state
  const grid = state.grid.map(row => row.slice())
  // Eat (r,c) and everything below & to the right.
  for (let i = r; i < state.rows; i++) {
    for (let j = c; j < state.cols; j++) {
      grid[i][j] = false
    }
  }
  const atePoison = r === 0 && c === 0
  return {
    ...state,
    grid,
    moves: state.moves + 1,
    turn: state.turn === 'player' ? 'ai' : 'player',
    loser: atePoison ? state.turn : state.loser,
  }
}

export function remainingCount(state: IchompState): number {
  return state.grid.reduce((s, row) => s + row.filter(Boolean).length, 0)
}

export function isGameOver(state: IchompState): boolean {
  return state.loser !== null
}

/** Player wins when the AI is forced to eat the poison. */
export function isWin(state: IchompState): boolean {
  return state.loser === 'ai'
}

/** Player loses when they eat the poison. */
export function isLoss(state: IchompState): boolean {
  return state.loser === 'player'
}

export function isSolved(state: IchompState): boolean {
  return isWin(state)
}

/** AI (the "i") move. Never eats the poison voluntarily; if it can leave the
 *  player with ONLY the poison, it does (forcing the player to lose); else it
 *  plays a random safe cell. Beatable with good first-player play. */
export function aiMove(state: IchompState): [number, number] | null {
  if (state.turn !== 'ai' || state.loser !== null) return null
  const present: Array<[number, number]> = []
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c]) present.push([r, c])
    }
  }
  if (present.length === 0) return null
  const safe = present.filter(([r, c]) => !(r === 0 && c === 0))
  if (safe.length === 0) return [0, 0] // forced — AI eats poison and loses

  // Winning move: leave the player with only the poison.
  for (const [r, c] of safe) {
    if (remainingCount(applyMove(state, r, c)) === 1) return [r, c]
  }
  // Otherwise a random safe cell.
  return safe[Math.floor(Math.random() * safe.length)]
}

export function newPuzzle(): IchompState {
  return newGame()
}
