// Lights Out — pure game logic.
//
// The classic Tiger Electronics 1995 game. 5x5 grid of lights (on/off).
// Clicking a cell toggles it + its 4 orthogonal neighbors. Goal: turn
// all lights off.
//
// All exports are PURE FUNCTIONS. No React, no DOM.
//
// Key design choice: rather than implement a GF(2) linear algebra
// solver (which is the "right" way to handle Lights Out), we generate
// random starting positions by clicking N random cells on an all-on
// board. This is always solvable — you can solve it by reversing the
// clicks. Simpler, no need for a solver, and the puzzles feel more
// "naturally random" than algorithmic ones.

/** A cell is true = on, false = off. */
export type Cell = boolean

/** 5x5 board. Cells are row-major. */
export type Board = Cell[][]

/** Board size. */
export const SIZE = 5

// ── Board construction ─────────────────────────────────────────

/** Empty 5x5 board (all off). */
export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
}

/** All-on board. */
export function allOnBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(true))
}

/** Deep-copy. */
export function clone(board: Board): Board {
  return board.map(row => row.slice())
}

// ── Click ──────────────────────────────────────────────────────

/** Apply a click at (r, c). Toggles that cell + 4 orthogonal neighbors.
 *  Returns a new board. Out-of-bounds clicks are silently ignored. */
export function click(board: Board, r: number, c: number): Board {
  const out = clone(board)
  const toggle = (rr: number, cc: number) => {
    if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) {
      out[rr][cc] = !out[rr][cc]
    }
  }
  toggle(r, c)
  toggle(r - 1, c)
  toggle(r + 1, c)
  toggle(r, c - 1)
  toggle(r, c + 1)
  return out
}

// ── Game state checks ──────────────────────────────────────────

/** Whether every cell is off (winning state). */
export function isSolved(board: Board): boolean {
  for (const row of board) for (const cell of row) if (cell) return false
  return true
}

/** Count the number of on-cells. Used for scoring. */
export function countOn(board: Board): number {
  let n = 0
  for (const row of board) for (const cell of row) if (cell) n += 1
  return n
}

// ── Puzzle generation ─────────────────────────────────────────

/** Generate a new solvable puzzle by clicking N random cells on an
 *  all-on board. N=3-10 is a good range. Result is always solvable
 *  (you can solve it by reversing the click sequence). */
export function newPuzzle(
  n_clicks: number = 5,
  random: () => number = Math.random,
): Board {
  let board = allOnBoard()
  for (let i = 0; i < n_clicks; i++) {
    const r = Math.floor(random() * SIZE)
    const c = Math.floor(random() * SIZE)
    // Note: we don't deduplicate the same cell. Clicking the same
    // cell twice is a no-op (toggle on, toggle off) which is fine
    // for our purposes — it just makes the puzzle slightly easier.
    board = click(board, r, c)
  }
  return board
}

/** A "puzzle difficulty" hint based on the number of on-cells remaining.
 *  This is approximate but useful for the UI. */
export function difficulty(
  onCount: number,
): 'easy' | 'medium' | 'hard' {
  if (onCount <= 7) return 'easy'
  if (onCount <= 13) return 'medium'
  return 'hard'
}
