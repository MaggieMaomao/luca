// Magic Square — pure game logic.
//
// Fill an N×N grid with the numbers 1..N² so that every row, every
// column, and both diagonals sum to the same "magic number".
// The magic number for an N×N square is N(N²+1)/2.
//
// This implementation gives the player a partially-filled square
// and they must fill in the rest. Pre-filled cells are immutable.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type Cell = number  // 0 = empty, 1..N² = filled
export type MagicSquareState = {
  size: number
  grid: Cell[]  // 1D, row-major
  prefilled: boolean[]  // which cells are immutable
  moves: number
}

/** Magic constant: the sum of every row, column, diagonal. */
export function magicConstant(n: number): number {
  return (n * (n * n + 1)) / 2
}

/** Sizes we generate. Each has a distinct magic number (15, 34, 65) so the
 *  puzzle — and the target — actually varies between games. */
export const SIZES = [3, 4, 5] as const

/** Apply one of the 8 dihedral symmetries (k = 0..7) to a magic square. Every
 *  symmetry of a magic square is still magic, so this just gives variety
 *  (otherwise the generators always produce the same square for a given size). */
function applySymmetry(grid: Cell[], n: number, k: number): Cell[] {
  const out = new Array<Cell>(n * n).fill(0)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let nr = r, nc = c
      switch (k & 7) {
        case 1: nr = c; nc = n - 1 - r; break               // rot90
        case 2: nr = n - 1 - r; nc = n - 1 - c; break        // rot180
        case 3: nr = n - 1 - c; nc = r; break                // rot270
        case 4: nc = n - 1 - c; break                        // flip horizontal
        case 5: nr = n - 1 - r; break                        // flip vertical
        case 6: nr = c; nc = r; break                        // transpose
        case 7: nr = n - 1 - c; nc = n - 1 - r; break        // anti-transpose
        default: break                                       // identity
      }
      out[nr * n + nc] = grid[r * n + c]
    }
  }
  return out
}

export function newPuzzle(size?: number, seed: number = Date.now()): MagicSquareState {
  let rng = (seed || 1) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  // Random size (and therefore a varying magic number) unless one is forced.
  const n = size ?? SIZES[Math.floor(rand() * SIZES.length)]

  // Start from a solved square, vary it with a random symmetry, then blank
  // out `n` cells for the player to fill (gentle, scales with size).
  const grid = applySymmetry(solvedGrid(n), n, Math.floor(rand() * 8))
  const prefilled = new Array(n * n).fill(true)
  const toBlank = n

  const indices = Array.from({ length: n * n }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  for (let i = 0; i < toBlank; i++) {
    grid[indices[i]] = 0
    prefilled[indices[i]] = false
  }
  return { size: n, grid, prefilled, moves: 0 }
}

export function solvedGrid(size: number): Cell[] {
  // Siamese method for odd-sized magic squares.
  if (size % 2 === 1) return siameseOdd(size)
  // Doubly-even (size % 4 == 0): standard method
  if (size % 4 === 0) return doublyEven(size)
  // Singly-even (size % 4 == 2): LUX method
  return singlyEven(size)
}

function siameseOdd(n: number): Cell[] {
  const grid = new Array(n * n).fill(0)
  let r = 0, c = Math.floor(n / 2)
  for (let v = 1; v <= n * n; v++) {
    grid[r * n + c] = v
    const nextR = (r - 1 + n) % n
    const nextC = (c + 1) % n
    if (grid[nextR * n + nextC] !== 0) {
      r = (r + 1) % n
    } else {
      r = nextR
      c = nextC
    }
  }
  return grid
}

function doublyEven(n: number): Cell[] {
  // Diagonal-complement method (works for n divisible by 4). Number cells
  // 1..n² row-major; on the diagonals of each 4×4 sub-block, replace the
  // value v with its complement (n²+1 − v).
  const grid: Cell[] = new Array(n * n).fill(0)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = r * n + c + 1
      const onDiag = r % 4 === c % 4 || (r % 4) + (c % 4) === 3
      grid[r * n + c] = onDiag ? n * n + 1 - v : v
    }
  }
  return grid
}

function singlyEven(n: number): Cell[] {
  // LUX method for size = 4k+2
  const m = n / 2
  const result: Cell[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  // Generate the four quadrants
  const A = siameseOdd(m)  // top-left
  const B = siameseOdd(m)  // top-right
  const C = siameseOdd(m)  // bottom-left
  const D = siameseOdd(m)  // bottom-right
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < m; c++) {
      result[r][c] = A[r * m + c]
      result[r][c + m] = B[r * m + c] + 2 * m * m
      result[r + m][c] = C[r * m + c] + 3 * m * m
      result[r + m][c + m] = D[r * m + c] + m * m
    }
  }
  // Swap columns
  const half = (n - 2) / 4
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < half; c++) {
      const tmp = result[r][c]
      result[r][c] = result[r + m][c]
      result[r + m][c] = tmp
    }
    for (let c = n - half + 1; c < n; c++) {
      const tmp = result[r][c]
      result[r][c] = result[r + m][c]
      result[r + m][c] = tmp
    }
  }
  // Swap middle rows
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < m / 2; c++) {
      const tmp = result[r][c + half + 1]
      result[r][c + half + 1] = result[r + m][c + half + 1]
      result[r + m][c + half + 1] = tmp
    }
  }
  return result.flat()
}

/** Try to set a cell. Returns the new state (or same on error). */
export function setCell(state: MagicSquareState, idx: number, value: number): MagicSquareState {
  if (idx < 0 || idx >= state.size * state.size) return state
  if (state.prefilled[idx]) return state
  if (value < 0 || value > state.size * state.size) return state // 0 = clear
  const grid = state.grid.slice()
  grid[idx] = value
  return { ...state, grid, moves: state.moves + 1 }
}

/** Check if the magic square is fully and correctly filled. */
export function isSolved(state: MagicSquareState): boolean {
  const n = state.size
  const m = magicConstant(n)
  // Every cell filled?
  for (let i = 0; i < n * n; i++) {
    if (state.grid[i] === 0) return false
  }
  // Must be a permutation of 1..n² (each number exactly once) — not just any
  // values that happen to sum right.
  const seen = new Set(state.grid)
  if (seen.size !== n * n) return false
  for (let v = 1; v <= n * n; v++) {
    if (!seen.has(v)) return false
  }
  // Rows
  for (let r = 0; r < n; r++) {
    let s = 0
    for (let c = 0; c < n; c++) s += state.grid[r * n + c]
    if (s !== m) return false
  }
  // Cols
  for (let c = 0; c < n; c++) {
    let s = 0
    for (let r = 0; r < n; r++) s += state.grid[r * n + c]
    if (s !== m) return false
  }
  // Diagonals
  let d1 = 0, d2 = 0
  for (let i = 0; i < n; i++) {
    d1 += state.grid[i * n + i]
    d2 += state.grid[i * n + (n - 1 - i)]
  }
  return d1 === m && d2 === m
}

export function isLoss(_state: MagicSquareState): boolean {
  return false
}