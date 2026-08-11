// Skyscrapers — pure game logic.
//
// An NxN grid puzzle. Each cell contains a unique skyscraper height
// (1..N). The clues around the edge tell you how many skyscrapers
// are visible from that direction (counting from the edge).
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type Clue = number  // 0 = no clue visible
export type SkyscraperState = {
  size: number
  /** The grid. 0 = empty, 1..N = a building. */
  grid: number[][]
  /** Clues around the edge. */
  clues: {
    top: Clue[]
    bottom: Clue[]
    left: Clue[]
    right: Clue[]
  }
  moves: number
}

/** Count visible skyscrapers from the start of the row. */
export function countVisible(row: number[]): number {
  let visible = 0
  let max = 0
  for (const h of row) {
    if (h > max) {
      visible++
      max = h
    }
  }
  return visible
}

/** Generate a random valid puzzle. */
export function newPuzzle(size: number = 5, seed: number = 0): SkyscraperState {
  let rng = (seed || Date.now()) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  // Generate a random VALID Latin square. Start from the cyclic base
  // base[r][c] = (r + c) % size (a valid Latin square), then permute the
  // rows, the columns, and the symbol labels — each transform preserves the
  // Latin property, so the result is always valid (the previous per-cell
  // random offset did NOT produce a Latin square → unsolvable puzzles).
  const shuffled = (n: number): number[] => {
    const a = Array.from({ length: n }, (_, i) => i)
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const rowPerm = shuffled(size)
  const colPerm = shuffled(size)
  const symPerm = shuffled(size)
  const grid: number[][] = []
  for (let r = 0; r < size; r++) {
    const row: number[] = []
    for (let c = 0; c < size; c++) {
      row.push(symPerm[(rowPerm[r] + colPerm[c]) % size] + 1)
    }
    grid.push(row)
  }
  // Compute clues
  const top: Clue[] = []
  const bottom: Clue[] = []
  for (let c = 0; c < size; c++) {
    const col = grid.map(r => r[c])
    top.push(countVisible(col))
    bottom.push(countVisible(col.slice().reverse()))
  }
  const left: Clue[] = grid.map(r => countVisible(r))
  const right: Clue[] = grid.map(r => countVisible(r.slice().reverse()))
  // Erase some clues to make it a real puzzle (keep ~70%)
  for (let i = 0; i < size; i++) {
    if (rand() < 0.3) top[i] = 0
    if (rand() < 0.3) bottom[i] = 0
    if (rand() < 0.3) left[i] = 0
    if (rand() < 0.3) right[i] = 0
  }
  // Erase the grid (player fills in)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (rand() < 0.6) grid[r][c] = 0
    }
  }
  return { size, grid, clues: { top, bottom, left, right }, moves: 0 }
}

export function setCell(state: SkyscraperState, r: number, c: number, value: number): SkyscraperState {
  if (r < 0 || r >= state.size || c < 0 || c >= state.size) return state
  if (value < 0 || value > state.size) return state
  const grid = state.grid.map(row => row.slice())
  grid[r][c] = value
  return { ...state, grid, moves: state.moves + 1 }
}

export function isSolved(state: SkyscraperState): boolean {
  const n = state.size
  // All cells filled
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (state.grid[r][c] === 0) return false
    }
  }
  // Each row is a permutation of 1..N
  for (let r = 0; r < n; r++) {
    const seen = new Set<number>()
    for (let c = 0; c < n; c++) {
      if (seen.has(state.grid[r][c])) return false
      seen.add(state.grid[r][c])
    }
  }
  // Each column is a permutation of 1..N
  for (let c = 0; c < n; c++) {
    const seen = new Set<number>()
    for (let r = 0; r < n; r++) {
      if (seen.has(state.grid[r][c])) return false
      seen.add(state.grid[r][c])
    }
  }
  // Check clues
  for (let c = 0; c < n; c++) {
    if (state.clues.top[c] !== 0) {
      const col = state.grid.map(r => r[c])
      if (countVisible(col) !== state.clues.top[c]) return false
    }
    if (state.clues.bottom[c] !== 0) {
      const col = state.grid.map(r => r[c]).reverse()
      if (countVisible(col) !== state.clues.bottom[c]) return false
    }
  }
  for (let r = 0; r < n; r++) {
    if (state.clues.left[r] !== 0 && countVisible(state.grid[r]) !== state.clues.left[r]) return false
    if (state.clues.right[r] !== 0 && countVisible(state.grid[r].slice().reverse()) !== state.clues.right[r]) return false
  }
  return true
}

export function isLoss(_state: SkyscraperState): boolean {
  return false
}