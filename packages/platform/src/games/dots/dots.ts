// Dots — pure game logic.
//
// A grid of dots. Two players take turns drawing a line between two
// adjacent dots. Completing a box (4 sides) scores a point and
// gives another turn. Most boxes wins.
//
// Educational version: solo player vs. random opponent.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type DotsState = {
  size: number           // NxN grid of dots → (N-1)x(N-1) boxes
  /** Horizontal lines. hLines[r][c] means line from (r,c) to (r,c+1). */
  hLines: boolean[][]
  /** Vertical lines. vLines[r][c] means line from (r,c) to (r+1,c). */
  vLines: boolean[][]
  /** Box owners. -1 = unowned, 0 = player, 1 = opponent. */
  boxes: number[][]
  moves: number
  turn: 'player' | 'opponent'
  scores: [number, number]
}

export function newGame(size: number = 6, seed: number = 0): DotsState {
  const s = size
  const hLines: boolean[][] = []
  for (let r = 0; r < s; r++) {
    hLines.push(new Array(s - 1).fill(false))
  }
  const vLines: boolean[][] = []
  for (let r = 0; r < s - 1; r++) {
    vLines.push(new Array(s).fill(false))
  }
  const boxes: number[][] = []
  for (let r = 0; r < s - 1; r++) {
    boxes.push(new Array(s - 1).fill(-1))
  }
  return {
    size: s,
    hLines, vLines, boxes,
    moves: 0,
    turn: 'player',
    scores: [0, 0],
  }
}

export type DotLine = { type: 'h' | 'v'; r: number; c: number }

export function isLegal(state: DotsState, line: DotLine): boolean {
  if (line.type === 'h') {
    if (line.r < 0 || line.r >= state.size) return false
    if (line.c < 0 || line.c >= state.size - 1) return false
    return !state.hLines[line.r][line.c]
  } else {
    if (line.r < 0 || line.r >= state.size - 1) return false
    if (line.c < 0 || line.c >= state.size) return false
    return !state.vLines[line.r][line.c]
  }
}

/** Returns the boxes completed by drawing `line`. */
export function boxesCompletedBy(state: DotsState, line: DotLine): Array<[number, number]> {
  if (!isLegal(state, line)) return []
  const completed: Array<[number, number]> = []
  if (line.type === 'h') {
    // Box above: (line.r-1, line.c); box below: (line.r, line.c)
    for (const r of [line.r - 1, line.r]) {
      if (r >= 0 && r < state.size - 1) {
        if (boxComplete(state, r, line.c, line)) completed.push([r, line.c])
      }
    }
  } else {
    // Box left: (line.r, line.c-1); box right: (line.r, line.c)
    for (const c of [line.c - 1, line.c]) {
      if (c >= 0 && c < state.size - 1) {
        if (boxComplete(state, line.r, c, line)) completed.push([line.r, c])
      }
    }
  }
  return completed
}

function boxComplete(state: DotsState, r: number, c: number, added: DotLine): boolean {
  // Check all 4 sides
  const top = state.hLines[r][c] || (added.type === 'h' && added.r === r && added.c === c)
  const bottom = state.hLines[r + 1][c] || (added.type === 'h' && added.r === r + 1 && added.c === c)
  const left = state.vLines[r][c] || (added.type === 'v' && added.r === r && added.c === c)
  const right = state.vLines[r][c + 1] || (added.type === 'v' && added.r === r && added.c === c + 1)
  return top && bottom && left && right
}

export function applyMove(state: DotsState, line: DotLine): DotsState {
  if (!isLegal(state, line)) return state
  // Determine completed boxes from the PRE-move state — boxesCompletedBy()
  // treats `line` as the hypothetical new side (and calls isLegal, which
  // requires the line to still be undrawn). Computing this after marking the
  // line would make isLegal fail and silently score nothing.
  const completed = boxesCompletedBy(state, line)
  const hLines = state.hLines.map(r => r.slice())
  const vLines = state.vLines.map(r => r.slice())
  const boxes = state.boxes.map(r => r.slice())
  if (line.type === 'h') hLines[line.r][line.c] = true
  else vLines[line.r][line.c] = true
  const scores: [number, number] = [...state.scores]
  for (const [r, c] of completed) {
    boxes[r][c] = state.turn === 'player' ? 0 : 1
    scores[state.turn === 'player' ? 0 : 1]++
  }
  // Player who completed a box goes again
  const turn = completed.length > 0 ? state.turn : (state.turn === 'player' ? 'opponent' : 'player')
  return { ...state, hLines, vLines, boxes, scores, turn, moves: state.moves + 1 }
}

/** Board full — the game is over (regardless of who won). */
export function isSolved(state: DotsState): boolean {
  return state.boxes.every(row => row.every(b => b >= 0))
}

/** Player (index 0) won: board full and ahead on boxes. */
export function isWin(state: DotsState): boolean {
  return isSolved(state) && state.scores[0] > state.scores[1]
}

/** Player lost: board full and behind on boxes. */
export function isLoss(state: DotsState): boolean {
  return isSolved(state) && state.scores[1] > state.scores[0]
}

export function newPuzzle(): DotsState {
  return newGame()
}

/** All currently-legal lines on the board. */
function legalLines(state: DotsState): DotLine[] {
  const all: DotLine[] = []
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size - 1; c++) {
      if (!state.hLines[r][c]) all.push({ type: 'h', r, c })
    }
  }
  for (let r = 0; r < state.size - 1; r++) {
    for (let c = 0; c < state.size; c++) {
      if (!state.vLines[r][c]) all.push({ type: 'v', r, c })
    }
  }
  return all
}

/** How many of a box's four sides are currently drawn. */
function boxSides(state: DotsState, r: number, c: number): number {
  let n = 0
  if (state.hLines[r][c]) n++
  if (state.hLines[r + 1][c]) n++
  if (state.vLines[r][c]) n++
  if (state.vLines[r][c + 1]) n++
  return n
}

/** A move is "unsafe" if it leaves an adjacent box with exactly 3 sides —
 *  i.e. it hands the other player a free capture next turn. */
function givesAwayBox(state: DotsState, line: DotLine): boolean {
  const next = applyMove(state, line)
  if (next === state) return false
  const affected: Array<[number, number]> =
    line.type === 'h'
      ? [[line.r - 1, line.c], [line.r, line.c]]
      : [[line.r, line.c - 1], [line.r, line.c]]
  for (const [r, c] of affected) {
    if (r >= 0 && r < state.size - 1 && c >= 0 && c < state.size - 1) {
      if (boxSides(next, r, c) === 3) return true
    }
  }
  return false
}

/** Greedy opponent: (1) capture if possible — preferring the move that
 *  completes the most boxes; (2) otherwise play a "safe" move that doesn't
 *  hand the player a box; (3) otherwise forced to give one away — pick at
 *  random. A real (if not perfect) Dots-and-Boxes strategy. */
export function opponentMove(state: DotsState, seed: number = 0): DotLine | null {
  let rng = (seed || Date.now()) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  const all = legalLines(state)
  if (all.length === 0) return null
  // Shuffle for variety.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }

  // 1) Capture the most boxes available.
  let best: DotLine | null = null
  let bestCount = 0
  for (const line of all) {
    const count = boxesCompletedBy(state, line).length
    if (count > bestCount) { bestCount = count; best = line }
  }
  if (best) return best

  // 2) Prefer a safe move.
  const safe = all.filter(line => !givesAwayBox(state, line))
  if (safe.length > 0) return safe[0]

  // 3) Forced — give away the least (fewest sides among the sacrifice).
  return all[0]
}