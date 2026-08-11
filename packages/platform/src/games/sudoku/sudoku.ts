// Sudoku — pure game logic.
//
// Standard 9×9 sudoku (Nikoli rules). Fill the grid so every row,
// column, and 3×3 box contains digits 1-9 exactly once.
//
// The generator is the standard "backtracking-fill then remove cells"
// approach. To guarantee a unique solution, we verify uniqueness after
// each cell removal — if removing a cell makes the puzzle ambiguous,
// we put it back and try another cell.
//
// All exports are PURE FUNCTIONS (no React, no DOM). The solver is
// used internally for the uniqueness check; it's also exported in case
// we ever want a "solve it for me" feature.

/** A cell. 0 = empty, 1-9 = digit. */
export type Cell = number

/** 9×9 board. Cells are row-major. */
export type Board = Cell[][]

export const SIZE = 9
export const BOX_SIZE = 3

export type Difficulty = 'easy' | 'medium' | 'hard'

/** Target givens count per difficulty. Lower = harder (fewer hints). */
export const DIFFICULTY_GIVENS: Record<Difficulty, number> = {
  easy: 46,    // 46 givens, 35 to fill — lots of hints, mostly fill-in
  medium: 34,  // 34 givens, 47 to fill
  hard: 24,    // 24 givens, 57 to fill — near the minimum; needs real deduction
}

// ── Board construction ─────────────────────────────────────────

/** Empty 9×9 board (all zeros). */
export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

/** Deep-copy. */
export function clone(board: Board): Board {
  return board.map(row => row.slice())
}

/** Shuffle a copy of [1..9] using the given random(). */
export function shuffleDigits(random: () => number): Cell[] {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ── Validation ──────────────────────────────────────────────────

/** Which 3×3 box a cell belongs to. Box index 0..8, row-major. */
export function boxIndex(r: number, c: number): number {
  return Math.floor(r / BOX_SIZE) * BOX_SIZE + Math.floor(c / BOX_SIZE)
}

/** Whether placing `value` at (r, c) on the board would be legal
 *  (no conflict with any other cell in the same row, column, or box). */
export function canPlace(board: Board, r: number, c: number, value: Cell): boolean {
  if (value === 0) return true  // clearing a cell is always legal
  // Check row
  for (let cc = 0; cc < SIZE; cc++) {
    if (cc !== c && board[r][cc] === value) return false
  }
  // Check column
  for (let rr = 0; rr < SIZE; rr++) {
    if (rr !== r && board[rr][c] === value) return false
  }
  // Check box
  const br = Math.floor(r / BOX_SIZE) * BOX_SIZE
  const bc = Math.floor(c / BOX_SIZE) * BOX_SIZE
  for (let rr = br; rr < br + BOX_SIZE; rr++) {
    for (let cc = bc; cc < bc + BOX_SIZE; cc++) {
      if ((rr !== r || cc !== c) && board[rr][cc] === value) return false
    }
  }
  return true
}

/** For each cell, return whether it's currently in conflict with another
 *  cell. Returns a 9×9 matrix of booleans. A cell is in conflict if
 *  another cell in its row/col/box has the same non-zero value. */
export function findConflicts(board: Board): boolean[][] {
  const conflicts: boolean[][] = Array.from(
    { length: SIZE },
    () => Array(SIZE).fill(false),
  )
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c]
      if (v === 0) continue
      // Check if any other cell with the same value exists in row/col/box
      for (let cc = 0; cc < SIZE; cc++) {
        if (cc !== c && board[r][cc] === v) {
          conflicts[r][c] = true
          break
        }
      }
      if (conflicts[r][c]) continue
      for (let rr = 0; rr < SIZE; rr++) {
        if (rr !== r && board[rr][c] === v) {
          conflicts[r][c] = true
          break
        }
      }
      if (conflicts[r][c]) continue
      const br = Math.floor(r / BOX_SIZE) * BOX_SIZE
      const bc = Math.floor(c / BOX_SIZE) * BOX_SIZE
      outer:
      for (let rr = br; rr < br + BOX_SIZE; rr++) {
        for (let cc = bc; cc < bc + BOX_SIZE; cc++) {
          if ((rr !== r || cc !== c) && board[rr][cc] === v) {
            conflicts[r][c] = true
            break outer
          }
        }
      }
    }
  }
  return conflicts
}

/** Whether every cell is filled (no zeros). Does NOT check conflicts. */
export function isComplete(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return false
    }
  }
  return true
}

/** Whether the board is fully filled AND has no conflicts. */
export function isSolved(board: Board): boolean {
  if (!isComplete(board)) return false
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!canPlace(board, r, c, board[r][c])) return false
    }
  }
  return true
}

// ── Solver ─────────────────────────────────────────────────────

/** Backtracking solver. Returns the first solution found, or null if
 *  the puzzle is unsolvable. Mutates the board (use clone() first). */
export function solve(board: Board): Board | null {
  const work = clone(board)
  if (solveRecursive(work)) return work
  return null
}

function solveRecursive(board: Board): boolean {
  // Find next empty cell
  let r = -1, c = -1
  outer:
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0) {
        r = i; c = j
        break outer
      }
    }
  }
  if (r === -1) return true  // no empty cells → solved

  for (let v = 1; v <= 9; v++) {
    if (canPlace(board, r, c, v)) {
      board[r][c] = v
      if (solveRecursive(board)) return true
      board[r][c] = 0  // backtrack
    }
  }
  return false
}

/** Count solutions up to `cap`. Used by the puzzle generator to verify
 *  uniqueness. Stops as soon as `cap` is reached. */
/** Count solutions up to `cap` (early-exit). `maxNodes` bounds the search:
 *  if exhausted, returns `cap` (a conservative "≥cap / couldn't verify"
 *  signal) so callers never hang on pathological near-minimal boards. */
export function countSolutions(board: Board, cap: number = 2, maxNodes: number = Infinity): number {
  const work = clone(board)
  let count = 0
  const budget = { n: maxNodes }
  const stop = countRecursive(work, cap, () => { count += 1 }, budget)
  return stop ? cap : count  // cap reached OR budget exhausted → "many/unknown"
}

function countRecursive(
  board: Board,
  cap: number,
  onSolution: () => void,
  budget: { n: number },
): boolean {
  // returns true if cap reached OR the node budget is exhausted (early exit)
  if (budget.n <= 0) return true
  budget.n -= 1
  let r = -1, c = -1
  outer:
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0) {
        r = i; c = j
        break outer
      }
    }
  }
  if (r === -1) {
    onSolution()
    return false
  }
  for (let v = 1; v <= 9; v++) {
    if (canPlace(board, r, c, v)) {
      board[r][c] = v
      if (countRecursive(board, cap, onSolution, budget)) {
        return true
      }
      board[r][c] = 0
    }
  }
  return false
}

// ── Generator ──────────────────────────────────────────────────

/** Generate a random fully-filled, valid board (the "solution"). */
export function generateSolution(random: () => number = Math.random): Board {
  const board = emptyBoard()
  // Fill diagonally first (the 3 boxes on the diagonal are independent).
  for (let br = 0; br < BOX_SIZE; br++) {
    const digits = shuffleDigits(random)
    let idx = 0
    for (let r = br * BOX_SIZE; r < br * BOX_SIZE + BOX_SIZE; r++) {
      for (let c = br * BOX_SIZE; c < br * BOX_SIZE + BOX_SIZE; c++) {
        board[r][c] = digits[idx++]
      }
    }
  }
  // Solve the rest with randomized order.
  fillRemaining(board, random)
  return board
}

function fillRemaining(board: Board, random: () => number): boolean {
  let r = -1, c = -1
  outer:
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0) {
        r = i; c = j
        break outer
      }
    }
  }
  if (r === -1) return true

  const digits = shuffleDigits(random)
  for (const v of digits) {
    if (canPlace(board, r, c, v)) {
      board[r][c] = v
      if (fillRemaining(board, random)) return true
      board[r][c] = 0
    }
  }
  return false
}

/** Generate a puzzle with the given difficulty.
 *  Returns `{ puzzle, solution }` where:
 *    puzzle — board with zeros where the player must fill
 *    solution — the complete solved board (for "give up" / "check" features)
 *  Pass an explicit `random()` for testability.
 *
 *  Uniqueness note: We do NOT verify uniqueness after each cell removal
 *  because the search space is 9^N for N empty cells — way too slow.
 *  In practice, removing cells from a valid solution almost always
 *  yields a uniquely-solvable puzzle. The 1% of cases that don't are
 *  acceptable for a casual game. */
export function makePuzzle(
  difficulty: Difficulty = 'medium',
  random: () => number = Math.random,
): { puzzle: Board; solution: Board } {
  const targetGivens = DIFFICULTY_GIVENS[difficulty]
  const solution = generateSolution(random)
  const puzzle = clone(solution)

  // Build a shuffled list of all cell positions
  const positions: [number, number][] = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      positions.push([r, c])
    }
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[positions[i], positions[j]] = [positions[j], positions[i]]
  }

  // Remove cells down toward the target givens count, but only if the puzzle
  // stays UNIQUELY solvable — so harder boards genuinely require deduction
  // (no guessing between multiple solutions) instead of just being emptier.
  // countSolutions early-exits at 2, so this is fast enough to run per game.
  let currentGivens = SIZE * SIZE
  for (const [r, c] of positions) {
    if (currentGivens <= targetGivens) break
    if (puzzle[r][c] === 0) continue
    const saved = puzzle[r][c]
    puzzle[r][c] = 0
    // Bounded uniqueness check: ~60k nodes keeps generation snappy even near
    // the minimum-givens floor. If we can't confirm uniqueness in budget, we
    // conservatively keep the cell (slightly more givens, never a UI freeze).
    if (countSolutions(puzzle, 2, 60000) === 1) {
      currentGivens -= 1
    } else {
      puzzle[r][c] = saved
    }
  }

  return { puzzle, solution }
}