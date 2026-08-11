// 2048 — pure game logic.
//
// The classic Gabriele Cirulli game (2014). Slide tiles on a 4x4
// board; same-value tiles merge into their sum. New tiles spawn after
// each move. Win at 2048; lose when the board is full with no possible
// merges.
//
// All exports are PURE FUNCTIONS. No React, no DOM. This makes the
// logic trivially testable (see /tmp/test_2048.py) and lets us animate
// the React layer separately by comparing before/after board states.

/** A board cell. 0 = empty, otherwise a power of 2 (2, 4, 8, ...). */
export type Cell = number

/** 4x4 board. Cells are row-major. */
export type Board = Cell[][]

/** Slide direction. */
export type Direction = 'up' | 'down' | 'left' | 'right'

/** Tile value that constitutes a win. */
export const WIN_VALUE: Cell = 2048

/** Board size. Hard-coded per the classic game. */
export const SIZE = 4

// ── Board construction ─────────────────────────────────────────

/** Empty 4x4 board. */
export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

/** Deep-copy a board (so mutations don't leak). */
export function clone(board: Board): Board {
  return board.map(row => row.slice())
}

// ── Movement (core algorithm) ───────────────────────────────────

/** Slide a single row in the direction indicated.
 *
 * Returns a new array of length SIZE. The row shifts toward index 0
 * (left). Same-value neighbors merge into the sum.
 *
 * Example: [2, 2, 4, 0] → [4, 4, 0, 0]   (the 2s merge, the 4 slides)
 * Example: [2, 2, 2, 2] → [4, 4, 0, 0]   (the two leftmost 2s merge, the right two merge)
 * Example: [0, 2, 0, 2] → [4, 0, 0, 0]   (the 2s slide together and merge)
 */
export function slideRow(row: Cell[]): Cell[] {
  const out = row.slice()  // copy
  // 1. Compact: shift all non-zero toward index 0
  const compact: Cell[] = []
  for (const v of out) if (v !== 0) compact.push(v)
  // 2. Merge adjacent equals
  const merged: Cell[] = []
  let i = 0
  while (i < compact.length) {
    if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
      merged.push(compact[i] * 2)
      i += 2
    } else {
      merged.push(compact[i])
      i += 1
    }
  }
  // 3. Pad with zeros
  while (merged.length < SIZE) merged.push(0)
  return merged
}

/** Returns true if the row changed after sliding. */
export function rowChanged(a: Cell[], b: Cell[]): boolean {
  for (let i = 0; i < SIZE; i++) if (a[i] !== b[i]) return true
  return false
}

// ── Board-level move ──────────────────────────────────────────────

/** Rotate the board so a single direction logic suffices. */
function rotate(board: Board, times: number): Board {
  let b = board
  for (let t = 0; t < times; t++) {
    const next: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        next[r][c] = b[SIZE - 1 - c][r]
      }
    }
    b = next
  }
  return b
}

/** Move the board in the given direction. Returns a new board.
 *  Does NOT spawn a new tile; that's the caller's job (so the no-move
 *  rule can skip spawn when the board is unchanged). */
export function move(board: Board, dir: Direction): Board {
  // Rotate so "move left" is the canonical direction.
  // up:    3 rotations CCW  →  left = "up" after rotation
  // right: 2 rotations CCW  →  left = "right" after rotation
  // down:  1 rotation CCW   →  left = "down" after rotation
  // left:  0 rotations      →  already "left"
  const rotations = { up: 3, right: 2, down: 1, left: 0 }[dir]
  const rotated = rotate(board, rotations)
  const moved = rotated.map(slideRow)
  // Un-rotate the result.
  // Rotating CCW 3 times = rotating CW 1 time, so to undo rotation by N
  // we rotate by (4 - N) CCW (= N CW). Easier: do reverse of rotate.
  return rotate(moved, (4 - rotations) % 4)
}

// ── Spawn ────────────────────────────────────────────────────────

/** Find all empty cells (where value === 0). */
export function emptyCells(board: Board): [number, number][] {
  const out: [number, number][] = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) out.push([r, c])
    }
  }
  return out
}

/** Whether a move changed the board (and thus needs a spawn). */
export function boardChanged(a: Board, b: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (a[r][c] !== b[r][c]) return true
    }
  }
  return false
}

/** Spawn a new tile. Returns a new board. If the board is full,
 *  returns the same board. 90% chance of 2, 10% chance of 4.
 *  Pass an explicit random() for testing. */
export function spawn(
  board: Board,
  random: () => number = Math.random,
): Board {
  const empties = emptyCells(board)
  if (empties.length === 0) return board
  const [r, c] = empties[Math.floor(random() * empties.length)]
  const value = random() < 0.9 ? 2 : 4
  const out = clone(board)
  out[r][c] = value
  return out
}

// ── Game state checks ──────────────────────────────────────────

/** Whether any move in any direction changes the board. */
export function hasValidMove(board: Board): boolean {
  return (['up', 'down', 'left', 'right'] as Direction[]).some(
    dir => boardChanged(board, move(board, dir)),
  )
}

/** Whether the player has reached the 2048 tile at any point.
 *  Note: we keep playing after 2048 unless the user gives up. */
export function hasWon(board: Board): boolean {
  for (const row of board) for (const c of row) if (c >= WIN_VALUE) return true
  return false
}

/** Whether the game is over (no empty cells AND no merges possible). */
export function isGameOver(board: Board): boolean {
  if (emptyCells(board).length > 0) return false
  return !hasValidMove(board)
}

// ── Game lifecycle ─────────────────────────────────────────────

/** Start a new game: 2 random tiles on an empty board. */
export function newGame(random: () => number = Math.random): Board {
  let board = emptyBoard()
  board = spawn(board, random)
  board = spawn(board, random)
  return board
}

/** Apply a player move: try the move, if it changed anything, spawn
 *  a new tile, and return the new board. Otherwise return the same
 *  board. Returns the score gained by the move (sum of merged values). */
export function applyMove(
  board: Board,
  dir: Direction,
  random: () => number = Math.random,
): { board: Board; score: number; changed: boolean } {
  const moved = move(board, dir)
  if (!boardChanged(board, moved)) {
    return { board, score: 0, changed: false }
  }
  const score = mergeScore(board, dir)
  return { board: spawn(moved, random), score, changed: true }
}

/** Score gained by one move = sum of values that got merged in. */
function mergeScore(board: Board, dir: Direction): number {
  const before = rotate(board, { up: 3, right: 2, down: 1, left: 0 }[dir])
  let total = 0
  for (const row of before) {
    let i = 0
    while (i < SIZE) {
      if (i + 1 < SIZE && row[i] !== 0 && row[i] === row[i + 1]) {
        total += row[i] * 2
        i += 2
      } else {
        i += 1
      }
    }
  }
  return total
}
