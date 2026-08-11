// Fruit Salad — pure game logic.
//
// A deduction puzzle. There's a grid of bowls (rows) × fruits (columns).
// You're told how many pieces of fruit each bowl holds in total (row clues)
// and how many of each fruit there are across all bowls (column clues).
// Fill in how many of each fruit go in each bowl so EVERY row total and
// EVERY column total is satisfied. (Like a tiny contingency-table / Kakuro:
// any arrangement matching all the clues wins.)
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type Fruit = 'apple' | 'banana' | 'cherry' | 'date' | 'elderberry'
export const FRUITS: Fruit[] = ['apple', 'banana', 'cherry', 'date', 'elderberry']

export type FruitSaladState = {
  /** One valid arrangement (used only to derive the clues — not the unique
   *  answer; any arrangement matching the clues wins). */
  solution: number[][]
  /** The player's current grid: guess[bowl][fruit]. */
  guess: number[][]
  /** Clue: total fruit per bowl (row sums of the solution). */
  rowTotals: number[]
  /** Clue: total of each fruit across all bowls (column sums of the solution). */
  colTotals: number[]
  moves: number
}

const MAX_PER_CELL = 3

export function newGame(numBowls = 3, fruitCount = 3, seed: number = Date.now()): FruitSaladState {
  let rng = (seed || 1) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }

  // Generate a non-trivial solution: each cell 0..MAX_PER_CELL, retry until
  // there's at least some fruit and not every cell is identical/empty.
  let solution: number[][] = []
  for (let attempt = 0; attempt < 40; attempt++) {
    solution = Array.from({ length: numBowls }, () =>
      Array.from({ length: fruitCount }, () => Math.floor(rand() * (MAX_PER_CELL + 1))),
    )
    const total = solution.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0)
    // Want a meaningful puzzle: enough fruit, and at least one non-zero per
    // row and per column so every clue is "live".
    const rowsOk = solution.every((row) => row.some((v) => v > 0))
    const colsOk = Array.from({ length: fruitCount }, (_, f) => solution.some((row) => row[f] > 0)).every(Boolean)
    if (total >= numBowls + fruitCount && rowsOk && colsOk) break
  }

  return {
    solution,
    guess: Array.from({ length: numBowls }, () => new Array(fruitCount).fill(0)),
    rowTotals: solution.map((row) => row.reduce((a, b) => a + b, 0)),
    colTotals: Array.from({ length: fruitCount }, (_, f) => solution.reduce((s, row) => s + row[f], 0)),
    moves: 0,
  }
}

export function setGuess(state: FruitSaladState, bowl: number, fruit: number, count: number): FruitSaladState {
  if (bowl < 0 || bowl >= state.guess.length) return state
  if (fruit < 0 || fruit >= state.guess[bowl].length) return state
  if (count < 0 || count > MAX_PER_CELL) return state
  const guess = state.guess.map((row) => row.slice())
  guess[bowl][fruit] = count
  return { ...state, guess, moves: state.moves + 1 }
}

/** Sum of each bowl (row) in the current guess. */
export function rowSums(grid: number[][]): number[] {
  return grid.map((row) => row.reduce((a, b) => a + b, 0))
}

/** Sum of each fruit (column) in the current guess. */
export function colSums(grid: number[][]): number[] {
  const n = grid[0]?.length ?? 0
  return Array.from({ length: n }, (_, f) => grid.reduce((s, row) => s + row[f], 0))
}

export const MAX_COUNT = MAX_PER_CELL

export function isSolved(state: FruitSaladState): boolean {
  const rs = rowSums(state.guess)
  const cs = colSums(state.guess)
  return (
    rs.every((v, i) => v === state.rowTotals[i]) &&
    cs.every((v, i) => v === state.colTotals[i])
  )
}

export function isLoss(_state: FruitSaladState): boolean {
  return false
}

export function newPuzzle(): FruitSaladState {
  return newGame()
}
