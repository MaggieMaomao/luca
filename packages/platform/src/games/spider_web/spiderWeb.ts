// Spider Web — pure game logic.
//
// A graph traversal puzzle. The spider must reach a fly in a
// web-shaped graph. The web has N rings (concentric circles) with
// M spokes each; plus some cross-strands. Click on a node to move
// the spider there. Path must avoid certain "stuck" nodes.
//
// This is a simplified version: a 5-ring, 8-spoke web with cross
// strands. Win: spider reaches the fly in N or fewer moves.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type NodeId = number  // 0..N-1
export type Edge = [NodeId, NodeId]
export type SpiderWebState = {
  rings: number
  spokes: number
  /** Adjacency list. */
  adj: NodeId[][]
  /** Stuck nodes (can't pass through). */
  stuck: NodeId[]
  /** Current spider position. */
  spider: NodeId
  /** Target (fly) position. */
  fly: NodeId
  moves: number
  /** Path history. */
  path: NodeId[]
}

export function buildWeb(rings: number = 5, spokes: number = 8): NodeId[][] {
  const N = rings * spokes
  const adj: NodeId[][] = Array.from({ length: N }, () => [])
  // Helper to convert (ring, spoke) to node id
  const id = (ring: number, spoke: number) => ring * spokes + spoke
  // Ring edges: each node connects to its ring neighbors
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < spokes; s++) {
      const next = (s + 1) % spokes
      const a = id(r, s)
      const b = id(r, next)
      adj[a].push(b)
      adj[b].push(a)
    }
  }
  // Spoke edges: each node connects to the corresponding node on the
  // next inner ring
  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < spokes; s++) {
      const a = id(r, s)
      const b = id(r + 1, s)
      adj[a].push(b)
      adj[b].push(a)
    }
  }
  // Cross strands (skip-2 spokes): for visual interest
  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < spokes; s++) {
      const next = (s + 2) % spokes
      const a = id(r, s)
      const b = id(r + 1, next)
      // Note: would normally add a 50% chance; for simplicity, add all
      adj[a].push(b)
      adj[b].push(a)
    }
  }
  return adj
}

/** BFS reachability from `from` to `to`, never stepping on a stuck node. */
export function reachable(adj: NodeId[][], stuck: NodeId[], from: NodeId, to: NodeId): boolean {
  const blocked = new Set(stuck)
  if (blocked.has(to) || blocked.has(from)) return false
  const seen = new Set<NodeId>([from])
  const queue: NodeId[] = [from]
  while (queue.length > 0) {
    const n = queue.shift()!
    if (n === to) return true
    for (const m of adj[n]) {
      if (!seen.has(m) && !blocked.has(m)) { seen.add(m); queue.push(m) }
    }
  }
  return false
}

export function newGame(seed: number = Date.now()): SpiderWebState {
  const rings = 5
  const spokes = 8
  const N = rings * spokes
  let rng = (seed || 1) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  const adj = buildWeb(rings, spokes)
  const spider: NodeId = 0 // centre
  const fly: NodeId = (rings - 1) * spokes + Math.floor(rand() * spokes) // outer ring

  // Choose up to 5 "stuck" nodes that are NOT the spider or fly, and that
  // still leave the fly reachable. Retry; fall back to no stuck nodes (the
  // web is connected, so that's always solvable).
  let stuck: NodeId[] = []
  for (let attempt = 0; attempt < 30; attempt++) {
    const pick: NodeId[] = []
    let tries = 0
    while (pick.length < 5 && tries < 200) {
      const n = Math.floor(rand() * N)
      if (n !== spider && n !== fly && !pick.includes(n)) pick.push(n)
      tries++
    }
    if (reachable(adj, pick, spider, fly)) { stuck = pick; break }
  }

  return { rings, spokes, adj, stuck, spider, fly, moves: 0, path: [spider] }
}

export function canMove(state: SpiderWebState, to: NodeId): boolean {
  return state.adj[state.spider].includes(to) && !state.stuck.includes(to)
}

export function move(state: SpiderWebState, to: NodeId): SpiderWebState {
  if (!canMove(state, to)) return state
  return {
    ...state,
    spider: to,
    moves: state.moves + 1,
    path: [...state.path, to],
  }
}

export function isSolved(state: SpiderWebState): boolean {
  return state.spider === state.fly
}

export function isLoss(_state: SpiderWebState): boolean {
  return false
}

export function newPuzzle(): SpiderWebState {
  return newGame()
}