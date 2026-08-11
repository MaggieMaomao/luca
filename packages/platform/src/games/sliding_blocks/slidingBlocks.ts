// Sliding Blocks — pure game logic.
//
// The classic "15-puzzle" or "8-puzzle" depending on size. A grid of
// numbered tiles with ONE empty space. Click (or arrow-key) to slide
// a tile into the empty space. Goal: arrange tiles in numerical order,
// 1..N with the empty space at the bottom-right.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

// ── Types ──────────────────────────────────────────────────────

/** Grid size. 3 = 3×3 (8-puzzle), 4 = 4×4 (15-puzzle), 5 = 5×5 (24-puzzle). */
export type GridSize = 3 | 4 | 5

/** A single cell. 0 = empty, otherwise 1..SIZE*SIZE-1 (the tile's label). */
export type Cell = number

/** A board is SIZE×SIZE cells. Stored as a 1D array for performance
 *  (flattening avoids nested-array allocations on every slide). */
export interface Board {
  size: GridSize
  /** Row-major cells. cells[0] is top-left. */
  cells: Cell[]
  /** Index of the empty cell (where 0 lives). Updated incrementally. */
  emptyIdx: number
  /** Move count. */
  moves: number
}

/** A move is the position of a tile to slide into the empty cell. */
export interface SlidingMove {
  /** Row, column of the tile the player wants to slide. The empty cell
   *  must be adjacent (up/down/left/right). */
  r: number
  c: number
}

// ── Initial state ─────────────────────────────────────────────

/** Build a fresh solved board. */
export function newSolvedBoard(size: GridSize = 3): Board {
  const cells: Cell[] = []
  for (let i = 0; i < size * size; i++) {
    cells.push((i + 1) as Cell)
  }
  cells[cells.length - 1] = 0  // bottom-right is empty
  return {
    size,
    cells,
    emptyIdx: size * size - 1,
    moves: 0,
  }
}

/** Shuffle a board by making N random legal moves. Produces a
 *  guaranteed-solvable puzzle (every random walk from solved state
 *  stays solvable). */
export function shuffleBoard(seed: number, size: GridSize = 3, moves = 200): Board {
  let board = newSolvedBoard(size)
  let prev = -1
  // Tiny PRNG so shuffles are reproducible per seed.
  let rng = seed | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  for (let i = 0; i < moves; i++) {
    // Find neighbors of the empty cell
    const r = Math.floor(board.emptyIdx / board.size)
    const c = board.emptyIdx % board.size
    const neighbors: Array<[number, number]> = []
    if (r > 0)           neighbors.push([r - 1, c])
    if (r < size - 1)    neighbors.push([r + 1, c])
    if (c > 0)           neighbors.push([r, c - 1])
    if (c < size - 1)    neighbors.push([r, c + 1])
    // Pick a random neighbor that isn't the one we just moved
    let pickIdx: number
    let pick: [number, number]
    let attempts = 0
    do {
      pickIdx = Math.floor(rand() * neighbors.length)
      pick = neighbors[pickIdx]
      attempts++
    } while (attempts < 10 && (pick[0] * size + pick[1]) === prev)
    // Slide the picked tile into the empty space
    board = applyMove(board, { r: pick[0], c: pick[1] }) as Board
    prev = board.emptyIdx
  }
  // Reset move counter (we don't want the shuffle to count)
  board.moves = 0
  return board
}

// ── Helpers ────────────────────────────────────────────────────

/** Convert (r, c) to a 1D index. */
export function rcToIdx(r: number, c: number, size: GridSize): number {
  return r * size + c
}

/** Convert a 1D index to (r, c). */
export function idxToRc(idx: number, size: GridSize): [number, number] {
  return [Math.floor(idx / size), idx % size]
}

/** Are two cells adjacent (4-neighbors, no diagonals)? */
export function isAdjacent(idxA: number, idxB: number, size: GridSize): boolean {
  const [ar, ac] = idxToRc(idxA, size)
  const [br, bc] = idxToRc(idxB, size)
  return (Math.abs(ar - br) + Math.abs(ac - bc)) === 1
}

/** Is the given (r, c) in bounds? */
export function inBounds(r: number, c: number, size: GridSize): boolean {
  return r >= 0 && r < size && c >= 0 && c < size
}

// ── Apply move ─────────────────────────────────────────────────

/** Try to slide the tile at (r, c) into the empty cell. Returns a
 *  new board or the same board (with `error`) on illegal moves. */
export function applyMove(board: Board, move: SlidingMove): Board & { error?: string } {
  if (!inBounds(move.r, move.c, board.size)) {
    return { ...board, error: 'Position is off the board' }
  }
  const targetIdx = rcToIdx(move.r, move.c, board.size)
  if (!isAdjacent(targetIdx, board.emptyIdx, board.size)) {
    return { ...board, error: 'Can only slide tiles next to the empty space' }
  }
  if (board.cells[targetIdx] === 0) {
    return { ...board, error: 'That cell is already empty' }
  }
  // Swap the tile into the empty cell.
  const cells = board.cells.slice()
  cells[board.emptyIdx] = cells[targetIdx]
  cells[targetIdx] = 0
  return {
    size: board.size,
    cells,
    emptyIdx: targetIdx,
    moves: board.moves + 1,
  }
}

// ── Win check ──────────────────────────────────────────────────

/** Is the board in the solved state?
 *  Convention: cell 0 has tile 1, cell 1 has tile 2, ..., cell N-2
 *  has tile N-1, cell N-1 has 0. The empty space is at the
 *  bottom-right. */
export function isSolved(board: Board): boolean {
  const n = board.cells.length
  for (let i = 0; i < n - 1; i++) {
    if (board.cells[i] !== i + 1) return false
  }
  return board.cells[n - 1] === 0
}

/** Number of tiles in their correct position. Used for the "almost
 *  done!" progress indicator. */
export function correctTiles(board: Board): number {
  let n = 0
  for (let i = 0; i < board.cells.length - 1; i++) {
    if (board.cells[i] === i + 1) n++
  }
  // The empty cell is "correct" if it's at the end
  if (board.cells[board.cells.length - 1] === 0) n++
  return n
}

/** Manhattan distance from the solved position. A lower bound on
 *  the minimum number of moves remaining. Used to show "X more to go". */
export function manhattanDistance(board: Board): number {
  const n = board.cells.length
  let dist = 0
  for (let i = 0; i < n; i++) {
    const tile = board.cells[i]
    if (tile === 0) continue
    // Tile `tile` should be at position (tile - 1).
    const [curR, curC] = idxToRc(i, board.size)
    const [goalR, goalC] = idxToRc(tile - 1, board.size)
    dist += Math.abs(curR - goalR) + Math.abs(curC - goalC)
  }
  return dist
}

/** Hanoi has no loss; neither does Sliding Blocks (every state is
 *  reachable; the only question is "have you solved it?"). */
export function isLoss(_board: Board): boolean {
  return false
}

// ── Serialization ─────────────────────────────────────────────

/** Convert the 1D cells array to a 2D array of rows. Used for JSON
 *  serialization to the server. */
export function toRows(board: Board): number[][] {
  const rows: number[][] = []
  for (let r = 0; r < board.size; r++) {
    rows.push(board.cells.slice(r * board.size, (r + 1) * board.size))
  }
  return rows
}

/** Convert a 2D array of rows back to a board. */
export function fromRows(rows: number[][]): Board {
  const size = rows.length as GridSize
  const cells: Cell[] = []
  let emptyIdx = -1
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = rows[r][c] as Cell
      cells.push(v)
      if (v === 0) emptyIdx = r * size + c
    }
  }
  return { size, cells, emptyIdx, moves: 0 }
}