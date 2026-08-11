// Calcrostic — pure game logic.
//
// A "math cross-sum": a grid of numbers where some cells are given and the
// rest are blank. Fill every blank with a digit 1..N so that each row sums to
// its row clue and each column sums to its column clue. (Any assignment that
// satisfies all the clues wins — there is always at least one, the original.)
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type CalcrosticState = {
  /** The grid. 0 = empty/blank cell to be filled. */
  grid: number[][]
  /** Which cells were given as clues (locked — can't be edited). */
  given: boolean[][]
  /** Number of rows / cols. */
  size: number
  /** Target sum for each row. */
  rowClues: number[]
  /** Target sum for each column. */
  colClues: number[]
  moves: number
}

export function newGame(size = 4, seed: number = Date.now()): CalcrosticState {
  let rng = (seed || 1) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }

  // A valid solution: each cell holds a digit 1..size. No Latin constraint —
  // this is a pure sum puzzle, so clues can differ per line.
  const solution: number[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 1 + Math.floor(rand() * size)),
  )

  // Clues are the line sums of the solution.
  const rowClues = solution.map((row) => row.reduce((a, b) => a + b, 0))
  const colClues = Array.from({ length: size }, (_, c) =>
    solution.reduce((s, row) => s + row[c], 0),
  )

  // Erase ~45% of cells for the player to fill, ensuring at least one blank
  // and at least one given (so it's a real but solvable puzzle).
  const given: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(true))
  for (let attempt = 0; attempt < 30; attempt++) {
    let blanks = 0
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const erase = rand() < 0.45
        given[r][c] = !erase
        if (erase) blanks++
      }
    }
    if (blanks >= 1 && blanks <= size * size - 1) break
  }

  const grid = solution.map((row, r) => row.map((v, c) => (given[r][c] ? v : 0)))

  return { size, grid, given, rowClues, colClues, moves: 0 }
}

export function setCell(state: CalcrosticState, r: number, c: number, value: number): CalcrosticState {
  if (r < 0 || r >= state.size || c < 0 || c >= state.size) return state
  if (state.given[r][c]) return state // clue cells are locked
  if (value < 0 || value > state.size) return state
  const grid = state.grid.map((row) => row.slice())
  grid[r][c] = value
  return { ...state, grid, moves: state.moves + 1 }
}

export function rowSum(state: CalcrosticState, r: number): number {
  return state.grid[r].reduce((a, b) => a + b, 0)
}

export function colSum(state: CalcrosticState, c: number): number {
  return state.grid.reduce((s, row) => s + row[c], 0)
}

export function isSolved(state: CalcrosticState): boolean {
  // Every cell filled…
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      if (state.grid[r][c] === 0) return false
    }
  }
  // …and every row and column hits its clue.
  for (let r = 0; r < state.size; r++) {
    if (rowSum(state, r) !== state.rowClues[r]) return false
  }
  for (let c = 0; c < state.size; c++) {
    if (colSum(state, c) !== state.colClues[c]) return false
  }
  return true
}

export function isLoss(_state: CalcrosticState): boolean {
  return false
}

export function newPuzzle(): CalcrosticState {
  return newGame()
}
