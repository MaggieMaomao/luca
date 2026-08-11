// Sokoban — pure game logic.
//
// Push boxes onto target squares. Move up/down/left/right; you can push one
// box at a time (never two in a row, never pull). Win when every target has a
// box on it.
//
// Walls, targets, boxes and the player are kept as SEPARATE layers — the old
// single-grid model overwrote the target marker when a box was pushed onto it,
// which made the win unreachable. All exports are PURE FUNCTIONS.

export type SokobanState = {
  width: number
  height: number
  walls: boolean[][]
  targets: boolean[][]
  boxes: boolean[][]
  player: [number, number]
  moves: number
}

// Hand-designed levels (all verified solvable). Legend:
//   #=wall  (space)=floor  .=target  $=box  *=box on target  @=player  +=player on target
const LEVELS: string[][] = [
  [
    "#####",
    "#@$.#",
    "#####",
  ],
  [
    "######",
    "#@ $.#",
    "######",
  ],
  [
    "#####",
    "#@  #",
    "#$  #",
    "#.  #",
    "#####",
  ],
  [
    "#######",
    "#  .  #",
    "# #$# #",
    "#  @  #",
    "#######",
  ],
  [
    "######",
    "#@ $.#",
    "#  $.#",
    "######",
  ],
  [
    "#######",
    "#@$  .#",
    "#######",
  ],
]

function emptyGrid(h: number, w: number): boolean[][] {
  return Array.from({ length: h }, () => new Array<boolean>(w).fill(false))
}

export function parseLevel(rows: string[]): SokobanState {
  const height = rows.length
  const width = Math.max(...rows.map(r => r.length))
  const walls = emptyGrid(height, width)
  const targets = emptyGrid(height, width)
  const boxes = emptyGrid(height, width)
  let player: [number, number] = [0, 0]
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const ch = rows[r][c] ?? "#" // pad short rows as wall
      switch (ch) {
        case "#": walls[r][c] = true; break
        case ".": targets[r][c] = true; break
        case "$": boxes[r][c] = true; break
        case "*": boxes[r][c] = true; targets[r][c] = true; break
        case "@": player = [r, c]; break
        case "+": player = [r, c]; targets[r][c] = true; break
        default: break // floor
      }
    }
  }
  return { width, height, walls, targets, boxes, player, moves: 0 }
}

export function newGame(seed: number = Date.now()): SokobanState {
  const idx = Math.abs((seed || 1) | 0) % LEVELS.length
  return parseLevel(LEVELS[idx])
}

export function newPuzzle(): SokobanState {
  return newGame()
}

const inBounds = (s: SokobanState, r: number, c: number) =>
  r >= 0 && r < s.height && c >= 0 && c < s.width

export function move(state: SokobanState, dr: number, dc: number): SokobanState {
  const [pr, pc] = state.player
  const nr = pr + dr, nc = pc + dc
  if (!inBounds(state, nr, nc) || state.walls[nr][nc]) return state

  if (state.boxes[nr][nc]) {
    // Pushing a box: the cell beyond must be free (in bounds, no wall, no box).
    const br = nr + dr, bc = nc + dc
    if (!inBounds(state, br, bc) || state.walls[br][bc] || state.boxes[br][bc]) return state
    const boxes = state.boxes.map(row => row.slice())
    boxes[nr][nc] = false
    boxes[br][bc] = true
    return { ...state, boxes, player: [nr, nc], moves: state.moves + 1 }
  }
  return { ...state, player: [nr, nc], moves: state.moves + 1 }
}

/** Solved when every target has a box on it. */
export function isSolved(state: SokobanState): boolean {
  for (let r = 0; r < state.height; r++) {
    for (let c = 0; c < state.width; c++) {
      if (state.targets[r][c] && !state.boxes[r][c]) return false
    }
  }
  return true
}

export function isLoss(_state: SokobanState): boolean {
  return false
}

/** Number of boxes currently sitting on a target (for a progress readout). */
export function boxesOnTargets(state: SokobanState): number {
  let n = 0
  for (let r = 0; r < state.height; r++) {
    for (let c = 0; c < state.width; c++) {
      if (state.boxes[r][c] && state.targets[r][c]) n++
    }
  }
  return n
}

export function targetCount(state: SokobanState): number {
  let n = 0
  for (const row of state.targets) for (const t of row) if (t) n++
  return n
}
