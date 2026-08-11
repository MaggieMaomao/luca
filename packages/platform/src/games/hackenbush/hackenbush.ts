// Hackenbush — pure game logic (Blue-Red Hackenbush, solo vs AI).
//
// A "bush" of coloured edges grows up from the ground. You are BLUE and may
// cut only blue edges; the AI is RED and cuts red edges. When an edge is cut,
// every edge no longer connected to the ground falls off too. Normal play:
// the player who cannot move on their turn loses. Beat the AI by leaving it
// with no red edges to cut.
//
// Node positions are stored in the state so the renderer can draw an
// arbitrary generated tree. All exports are PURE FUNCTIONS. No React, no DOM.

export type EdgeColor = 'red' | 'blue'
export type Edge = { from: number; to: number; color: EdgeColor }
export type HBNode = { x: number; y: number; ground: boolean }
export type HackenbushState = {
  nodes: HBNode[]
  edges: Edge[]
  /** Whose turn: 'blue' = player, 'red' = AI. */
  turn: EdgeColor
  moves: number
}

const GROUND_Y = 240
const LEVEL_H = 44
const clampX = (x: number) => Math.max(30, Math.min(290, x))

/** Generate a random bush rooted on the ground, with a mix of red/blue edges. */
export function newGame(seed: number = Date.now()): HackenbushState {
  let rng = (seed || 1) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    const nodes: HBNode[] = []
    const edges: Edge[] = []
    const add = (x: number, y: number, ground = false) => {
      nodes.push({ x: clampX(x), y, ground })
      return nodes.length - 1
    }
    const grow = (parent: number, x: number, y: number, depth: number) => {
      const segs = 1 + Math.floor(rand() * (3 - Math.min(depth, 2)))
      let cur = parent, cx = x, cy = y
      for (let s = 0; s < segs; s++) {
        const ny = cy - LEVEL_H
        if (ny < 48) break
        const nx = cx + (rand() * 36 - 18)
        const ni = add(nx, ny)
        edges.push({ from: cur, to: ni, color: rand() < 0.5 ? 'blue' : 'red' })
        if (depth < 2 && rand() < 0.45) grow(ni, nx, ny, depth + 1)
        cur = ni; cx = nx; cy = ny
      }
    }

    const numStalks = 2 + Math.floor(rand() * 2) // 2–3 stalks
    for (let i = 0; i < numStalks; i++) {
      const baseX = numStalks === 1 ? 160 : 60 + i * (200 / (numStalks - 1))
      const base = add(baseX, GROUND_Y, true)
      grow(base, baseX, GROUND_Y, 0)
    }

    if (edges.length >= 4) {
      // Re-colour to ≈ half blue / half red so the game is competitive
      // (the per-edge random colouring above can skew heavily one way).
      const half = Math.floor(edges.length / 2)
      const palette: EdgeColor[] = [
        ...Array(half).fill('blue'),
        ...Array(edges.length - half).fill('red'),
      ] as EdgeColor[]
      for (let i = palette.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[palette[i], palette[j]] = [palette[j], palette[i]]
      }
      edges.forEach((e, i) => { e.color = palette[i] })
      return { nodes, edges, turn: 'blue', moves: 0 }
    }
  }

  // Deterministic fallback (always a valid little bush).
  return {
    nodes: [
      { x: 120, y: GROUND_Y, ground: true },
      { x: 120, y: GROUND_Y - LEVEL_H, ground: false },
      { x: 120, y: GROUND_Y - 2 * LEVEL_H, ground: false },
      { x: 210, y: GROUND_Y, ground: true },
      { x: 210, y: GROUND_Y - LEVEL_H, ground: false },
    ],
    edges: [
      { from: 0, to: 1, color: 'blue' },
      { from: 1, to: 2, color: 'red' },
      { from: 3, to: 4, color: 'red' },
    ],
    turn: 'blue',
    moves: 0,
  }
}

export function isLegal(state: HackenbushState, edgeIdx: number): boolean {
  if (edgeIdx < 0 || edgeIdx >= state.edges.length) return false
  return state.edges[edgeIdx].color === state.turn
}

export function applyMove(state: HackenbushState, edgeIdx: number): HackenbushState {
  if (!isLegal(state, edgeIdx)) return state
  const edges = state.edges.filter((_, i) => i !== edgeIdx)
  // Which nodes are still connected to the ground (any node with ground=true)?
  const connected = new Set<number>()
  state.nodes.forEach((n, i) => { if (n.ground) connected.add(i) })
  let changed = true
  while (changed) {
    changed = false
    for (const e of edges) {
      if (connected.has(e.from) && !connected.has(e.to)) { connected.add(e.to); changed = true }
      if (connected.has(e.to) && !connected.has(e.from)) { connected.add(e.from); changed = true }
    }
  }
  // Drop any edge not in a grounded component.
  const filtered = edges.filter(e => connected.has(e.from) && connected.has(e.to))
  return {
    ...state,
    edges: filtered,
    turn: state.turn === 'red' ? 'blue' : 'red',
    moves: state.moves + 1,
  }
}

/** True if the side whose turn it is has no edge to cut. */
export function isGameOver(state: HackenbushState): boolean {
  return !state.edges.some(e => e.color === state.turn)
}

/** Player (blue) wins: it's red's turn and red has no edge → red can't move. */
export function isWin(state: HackenbushState): boolean {
  return state.turn === 'red' && !state.edges.some(e => e.color === 'red')
}

/** Player loses: it's blue's turn and blue has no edge → player can't move. */
export function isLoss(state: HackenbushState): boolean {
  return state.turn === 'blue' && !state.edges.some(e => e.color === 'blue')
}

/** Keep the old name as a "game decided" check for the renderer. */
export function isSolved(state: HackenbushState): boolean {
  return isWin(state)
}

/** AI (red) move: greedily cut the red edge that strands the most BLUE edges
 *  (hurts the player most); ties broken by fewest red edges remaining. */
export function aiMove(state: HackenbushState): number | null {
  const redIndices: number[] = []
  state.edges.forEach((e, i) => { if (e.color === 'red') redIndices.push(i) })
  if (redIndices.length === 0) return null
  let best = redIndices[0]
  let bestBlue = Infinity
  for (const i of redIndices) {
    const after = applyMove({ ...state, turn: 'red' }, i)
    const blue = after.edges.filter(e => e.color === 'blue').length
    if (blue < bestBlue) { bestBlue = blue; best = i }
  }
  return best
}

export function newPuzzle(): HackenbushState {
  return newGame()
}
