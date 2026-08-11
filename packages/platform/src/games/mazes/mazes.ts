// Mazes — pure game logic.
//
// Generate a random maze (recursive backtracking) and find the
// path from start to end. The player traces the path with arrow
// keys or clicks; we just verify the path is correct.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type Cell = {
  /** Walls: N, E, S, W (true = wall present). */
  walls: [boolean, boolean, boolean, boolean]
  visited: boolean
}
export type MazeGrid = Cell[][]
export type MazeState = {
  width: number
  height: number
  grid: MazeGrid
  start: [number, number]
  end: [number, number]
  /** Path the player has traced (cells they've "claimed"). */
  path: Array<[number, number]>
  moves: number
}

const DIRS: Array<[number, number, number]> = [
  [-1, 0, 0],  // N: row -1, col 0, wall 0
  [0, 1, 1],   // E: row 0, col +1, wall 1
  [1, 0, 2],   // S: row +1, col 0, wall 2
  [0, -1, 3],  // W: row 0, col -1, wall 3
]
const OPPOSITE = [2, 3, 0, 1]

export function generateMaze(width: number = 10, height: number = 10, seed: number = 0): MazeGrid {
  let rng = (seed || Date.now()) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  const grid: MazeGrid = []
  for (let r = 0; r < height; r++) {
    const row: Cell[] = []
    for (let c = 0; c < width; c++) {
      row.push({ walls: [true, true, true, true], visited: false })
    }
    grid.push(row)
  }
  // Recursive backtracking
  const stack: Array<[number, number]> = []
  const start: [number, number] = [0, 0]
  grid[0][0].visited = true
  stack.push(start)
  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1]
    const neighbors: Array<[number, number, number]> = []
    for (const [dr, dc, wall] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < height && nc >= 0 && nc < width && !grid[nr][nc].visited) {
        neighbors.push([nr, nc, wall])
      }
    }
    if (neighbors.length === 0) {
      stack.pop()
      continue
    }
    const [nr, nc, wall] = neighbors[Math.floor(rand() * neighbors.length)]
    grid[r][c].walls[wall] = false
    grid[nr][nc].walls[OPPOSITE[wall]] = false
    grid[nr][nc].visited = true
    stack.push([nr, nc])
  }
  return grid
}

export function newGame(width: number = 10, height: number = 10, seed: number = 0): MazeState {
  const grid = generateMaze(width, height, seed)
  return {
    width, height, grid,
    start: [0, 0],
    end: [height - 1, width - 1],
    path: [[0, 0]],
    moves: 0,
  }
}

/** Can the player move from (r, c) in direction d? */
export function canMove(state: MazeState, r: number, c: number, d: number): boolean {
  return !state.grid[r][c].walls[d]
}

export function move(state: MazeState, d: number): MazeState {
  const [r, c] = state.path[state.path.length - 1]
  if (!canMove(state, r, c, d)) return state
  const [dr, dc] = DIRS[d]
  const nr = r + dr, nc = c + dc
  if (nr < 0 || nr >= state.height || nc < 0 || nc >= state.width) return state
  return {
    ...state,
    path: [...state.path, [nr, nc]],
    moves: state.moves + 1,
  }
}

export function isSolved(state: MazeState): boolean {
  const [r, c] = state.path[state.path.length - 1]
  return r === state.end[0] && c === state.end[1]
}

export function isLoss(_state: MazeState): boolean {
  return false
}

export const newPuzzle = newGame