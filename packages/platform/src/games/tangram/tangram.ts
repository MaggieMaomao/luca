// Tangram — pure game logic.
//
// The classic Chinese geometric puzzle. 7 pieces (5 triangles, 1
// square, 1 parallelogram) form various shapes. Each piece is a
// collection of cells on a 5x5 grid (the canonical "tan" shape
// is 5x5 in the smallest bounding box).
//
// For simplicity, we use a CELL-BASED representation: each piece is
// a set of (r, c) coordinates, and the puzzle is to arrange all
// pieces so they tile the target shape exactly (no overlaps, no gaps).
//
// All exports are PURE FUNCTIONS. No React, no DOM.

// ── Types ──────────────────────────────────────────────────────

/** Identifier for the 7 tangram pieces (0-6). */
export type PieceId = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** A piece on the board. Cells are stored as a sorted array of
 *  (r, c) tuples in row-major order. */
export interface Piece {
  id: PieceId
  cells: Array<[number, number]>
}

/** A target shape is a set of cells the player needs to fill. */
export interface TargetShape {
  name: string
  cells: Array<[number, number]>
}

/** Full state. The player drags pieces around to fill the target. */
export interface TangramState {
  /** The target shape to form. */
  target: TargetShape
  /** Current positions of all 7 pieces. */
  pieces: Piece[]
  /** Moves made (each piece placement counts as one move). */
  moves: number
  /** Whether each piece is locked in (i.e. exactly covers its target cells). */
  locked: boolean[]
}

// ── Piece shapes (canonical, all starting positions) ──────────

/** Build the 7 canonical tangram pieces.
 *  Each piece is defined as a set of (r, c) cells. Coordinates are
 *  relative to a (0, 0) top-left origin. The whole "tan" shape
 *  (square) fits in 4×4 cells.
 *
 *  Piece 0: Big triangle (8 cells in a 4×4)
 *  Piece 1: Medium triangle (4 cells in 2×2)
 *  Piece 2: Small triangle 1 (2 cells in 1×2)
 *  Piece 3: Small triangle 2 (2 cells in 1×2)
 *  Piece 4: Tiny triangle (1 cell — wait, that's a dot)
 *
 *  Real tangram pieces don't quantize to a grid. For this
 *  educational version, we use 5 triangles + 1 square + 1
 *  parallelogram quantized to a 5×5 grid.
 */
const BIG_TRIANGLE: Array<[number, number]> = [
  [0, 0], [0, 1], [0, 2], [0, 3],
  [1, 0], [1, 1], [1, 2],
  [2, 0], [2, 1],
  [3, 0],
]

const MEDIUM_TRIANGLE: Array<[number, number]> = [
  [0, 0], [0, 1], [0, 2],
  [1, 0], [1, 1],
  [2, 0],
]

const SMALL_TRIANGLE_1: Array<[number, number]> = [
  [0, 0], [0, 1],
  [1, 0],
]

const SMALL_TRIANGLE_2: Array<[number, number]> = [
  [0, 0], [0, 1],
  [1, 0],
]

const SQUARE: Array<[number, number]> = [
  [0, 0], [0, 1],
  [1, 0], [1, 1],
]

const PARALLELOGRAM: Array<[number, number]> = [
  [0, 0], [0, 1], [0, 2],
  [1, 1], [1, 2], [1, 3],
]

const TINY_TRIANGLE: Array<[number, number]> = [
  [0, 0],
]

/** All 7 pieces, starting positions (scattered around a 12x14 canvas,
 *  no overlaps). The right column (col 8+) is the working area; the
 *  left column is the "tray" where pieces start. */
export const STARTING_PIECES: Piece[] = [
  // Tray column 1 (rows 0-3)
  { id: 0, cells: BIG_TRIANGLE.map(([r, c]) => [r + 0, c + 0] as [number, number]) },
  // Tray column 2
  { id: 1, cells: MEDIUM_TRIANGLE.map(([r, c]) => [r + 0, c + 5] as [number, number]) },
  { id: 2, cells: SMALL_TRIANGLE_1.map(([r, c]) => [r + 5, c + 5] as [number, number]) },
  { id: 3, cells: SMALL_TRIANGLE_2.map(([r, c]) => [r + 5, c + 7] as [number, number]) },
  { id: 4, cells: SQUARE.map(([r, c]) => [r + 6, c + 0] as [number, number]) },
  { id: 5, cells: PARALLELOGRAM.map(([r, c]) => [r + 0, c + 9] as [number, number]) },
  { id: 6, cells: TINY_TRIANGLE.map(([r, c]) => [r + 8, c + 0] as [number, number]) },
]

/** The canonical "square" target — the most iconic tangram shape. */
export const SQUARE_TARGET: TargetShape = {
  name: 'Square',
  cells: [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 1], [1, 2], [1, 3],
    [2, 0], [2, 1], [2, 2], [2, 3],
    [3, 0], [3, 1], [3, 2], [3, 3],
  ],
}

/** Triangle target. */
export const TRIANGLE_TARGET: TargetShape = {
  name: 'Triangle',
  cells: [
    [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 0], [1, 1], [1, 2], [1, 3],
    [2, 0], [2, 1], [2, 2],
    [3, 0], [3, 1],
    [4, 0],
  ],
}

/** Parallelogram target. */
export const PARALLELOGRAM_TARGET: TargetShape = {
  name: 'Parallelogram',
  cells: [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 0], [1, 1], [1, 2], [1, 3],
    [2, 0], [2, 1], [2, 2],
    [3, 0], [3, 1],
  ],
}

export const ALL_TARGETS: TargetShape[] = [SQUARE_TARGET, TRIANGLE_TARGET, PARALLELOGRAM_TARGET]

// ── Helpers ────────────────────────────────────────────────────

/** Translate a piece by (dr, dc). Returns a new piece with shifted cells. */
export function translate(piece: Piece, dr: number, dc: number): Piece {
  return {
    id: piece.id,
    cells: piece.cells.map(([r, c]) => [r + dr, c + dc] as [number, number]).sort(cmpCell),
  }
}

/** Sort cells in row-major order. */
function cmpCell(a: [number, number], b: [number, number]): number {
  return a[0] - b[0] || a[1] - b[1]
}

/** Normalize cells (sort, dedupe). */
function normalize(cells: Array<[number, number]>): Array<[number, number]> {
  const sorted = cells.slice().sort(cmpCell)
  // Dedup
  const result: Array<[number, number]> = []
  for (const c of sorted) {
    const last = result[result.length - 1]
    if (!last || last[0] !== c[0] || last[1] !== c[1]) {
      result.push(c)
    }
  }
  return result
}

/** Two cells sets are equal if they cover the same (r, c) tuples. */
export function cellsEqual(a: Array<[number, number]>, b: Array<[number, number]>): boolean {
  if (a.length !== b.length) return false
  const sa = normalize(a)
  const sb = normalize(b)
  for (let i = 0; i < sa.length; i++) {
    if (sa[i][0] !== sb[i][0] || sa[i][1] !== sb[i][1]) return false
  }
  return true
}

/** Do two pieces overlap (share any cell)? */
export function piecesOverlap(a: Piece, b: Piece): boolean {
  if (a.id === b.id) return false  // same piece, not overlap with itself
  const setB = new Set(b.cells.map(c => `${c[0]},${c[1]}`))
  for (const c of a.cells) {
    if (setB.has(`${c[0]},${c[1]}`)) return true
  }
  return false
}

/** Do any two pieces overlap? */
export function anyOverlap(pieces: Piece[]): boolean {
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      if (piecesOverlap(pieces[i], pieces[j])) return true
    }
  }
  return false
}

/** Does a piece cover exactly the target cells? (Modulo position) */
export function pieceMatchesTarget(piece: Piece, target: TargetShape): boolean {
  if (piece.cells.length !== target.cells.length) return false
  // Translate target so its top-left corner is at (0, 0)
  const minR = Math.min(...target.cells.map(c => c[0]))
  const minC = Math.min(...target.cells.map(c => c[1]))
  const normalizedTarget = normalize(target.cells.map(([r, c]) => [r - minR, c - minC] as [number, number]))
  return cellsEqual(piece.cells, normalizedTarget)
}

// ── Initial state ─────────────────────────────────────────────

/** Build a fresh puzzle. All 7 pieces are in their starting positions
 *  (scattered around the canvas). Target is given. */
export function newPuzzle(target: TargetShape = SQUARE_TARGET): TangramState {
  return {
    target,
    pieces: STARTING_PIECES.map(p => ({ id: p.id, cells: p.cells.slice() })),
    moves: 0,
    locked: [false, false, false, false, false, false, false],
  }
}

// ── Apply move ─────────────────────────────────────────────────

/** Move a piece to absolute position (the piece's cells become exactly
 *  those given). Returns a new state. */
export function movePiece(state: TangramState, pieceId: PieceId, newCells: Array<[number, number]>): TangramState {
  const newPieces = state.pieces.map(p =>
    p.id === pieceId
      ? { id: p.id, cells: normalize(newCells) }
      : { id: p.id, cells: p.cells.slice() }
  )
  // Recompute which pieces are "locked" (cover target cells exactly).
  const locked = newPieces.map(p => pieceMatchesTarget(p, state.target))
  return {
    target: state.target,
    pieces: newPieces,
    moves: state.moves + 1,
    locked,
  }
}

/** Translate a piece by (dr, dc). Convenience over movePiece. */
export function shiftPiece(state: TangramState, pieceId: PieceId, dr: number, dc: number): TangramState {
  const target = state.pieces.find(p => p.id === pieceId)
  if (!target) return state
  return movePiece(state, pieceId, translate(target, dr, dc).cells)
}

// ── Win / loss ────────────────────────────────────────────────

/** Win: all pieces are in their target cells (no overlap, all locked). */
export function isSolved(state: TangramState): boolean {
  return state.locked.every(Boolean) && !anyOverlap(state.pieces)
}

/** Number of pieces that are in their target position. */
export function lockedCount(state: TangramState): number {
  return state.locked.filter(Boolean).length
}

/** Total cells covered by all pieces. */
export function totalCoverage(state: TangramState): number {
  return state.pieces.reduce((acc, p) => acc + p.cells.length, 0)
}

/** No loss condition for tangram — the player can always keep moving pieces. */
export function isLoss(_state: TangramState): boolean {
  return false
}

// ── Serialization ─────────────────────────────────────────────

/** Serialize the state for the server. */
export interface TangramSummary {
  targetName: string
  targetCells: Array<[number, number]>
  pieces: Array<{ id: PieceId; cells: Array<[number, number]> }>
  moves: number
  locked: boolean[]
}

export function summarize(state: TangramState): TangramSummary {
  return {
    targetName: state.target.name,
    targetCells: state.target.cells,
    pieces: state.pieces.map(p => ({ id: p.id, cells: p.cells })),
    moves: state.moves,
    locked: state.locked,
  }
}