// Floodfill — pure game logic.
//
// A grid of colored regions. The player picks a region; all
// connected regions of the same color (4-connected) merge into
// the player's color. Goal: fill the whole board with one color.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type Cell = number  // color index 0..K-1
export type FloodfillState = {
  size: number        // NxN grid
  colors: number      // number of colors
  grid: Cell[][]
  moves: number
}

export const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'] as const
export type Color = typeof COLORS[number]

export function newGame(size: number = 12, numColors: number = 6, seed: number = 0): FloodfillState {
  let rng = (seed || Date.now()) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  const grid: Cell[][] = []
  for (let r = 0; r < size; r++) {
    const row: Cell[] = []
    for (let c = 0; c < size; c++) {
      row.push(Math.floor(rand() * numColors))
    }
    grid.push(row)
  }
  return { size, colors: numColors, grid, moves: 0 }
}

/** Get 4-connected neighbors of (r, c). */
export function neighbors(size: number, r: number, c: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  if (r > 0) out.push([r - 1, c])
  if (r < size - 1) out.push([r + 1, c])
  if (c > 0) out.push([r, c - 1])
  if (c < size - 1) out.push([r, c + 1])
  return out
}

/** Flood fill from (r0, c0) with the given color. Returns new grid. */
export function floodFill(state: FloodfillState, r0: number, c0: number, color: number): FloodfillState {
  if (r0 < 0 || r0 >= state.size || c0 < 0 || c0 >= state.size) return state
  if (color < 0 || color >= state.colors) return state
  const target = state.grid[r0][c0]
  if (target === color) return state
  const grid = state.grid.map(row => row.slice())
  // BFS
  const queue: Array<[number, number]> = [[r0, c0]]
  grid[r0][c0] = color
  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    for (const [nr, nc] of neighbors(state.size, r, c)) {
      if (grid[nr][nc] === target) {
        grid[nr][nc] = color
        queue.push([nr, nc])
      }
    }
  }
  return { ...state, grid, moves: state.moves + 1 }
}

export function isSolved(state: FloodfillState): boolean {
  const first = state.grid[0][0]
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      if (state.grid[r][c] !== first) return false
    }
  }
  return true
}

export function isLoss(_state: FloodfillState): boolean {
  return false
}

export function newPuzzle(): FloodfillState {
  return newGame()
}

/** Size of the flooded region anchored at the top-left (0,0) — i.e. how much
 *  of the board the player currently controls. Used for a progress readout. */
export function originRegionSize(state: FloodfillState): number {
  const size = state.size
  const target = state.grid[0][0]
  const seen = Array.from({ length: size }, () => new Array(size).fill(false))
  const queue: Array<[number, number]> = [[0, 0]]
  seen[0][0] = true
  let count = 0
  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    count++
    for (const [nr, nc] of neighbors(size, r, c)) {
      if (!seen[nr][nc] && state.grid[nr][nc] === target) {
        seen[nr][nc] = true
        queue.push([nr, nc])
      }
    }
  }
  return count
}

export function countColors(state: FloodfillState): Record<number, number> {
  const out: Record<number, number> = {}
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const v = state.grid[r][c]
      out[v] = (out[v] ?? 0) + 1
    }
  }
  return out
}