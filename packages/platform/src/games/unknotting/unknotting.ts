// Unknotting — pure game logic.
//
// A closed loop (a "rope") passes through N points in a fixed cyclic order
// 0 → 1 → … → N-1 → 0. The loop starts tangled: some of its segments cross
// each other. The player drags the points around; the goal is to remove
// EVERY self-crossing so the rope becomes a simple closed curve — the
// "unknot". This is the planar-untangling formulation of unknotting a knot
// diagram, and it is always solvable (any point set can be ordered into a
// crossing-free polygon by moving points to a convex position).
//
// Coordinates are normalised to the unit square [0,1]×[0,1]; the renderer
// scales them to pixels. All exports are PURE FUNCTIONS. No React, no DOM.

export interface Pt {
  x: number
  y: number
}

export interface UnknottingState {
  /** Point positions, indexed by node id. The loop visits them in id order
   *  0,1,…,n-1 and closes back to 0. */
  points: Pt[]
  /** Number of points / segments in the loop. */
  n: number
  /** Drags made so far. */
  moves: number
  /** Seed used to generate this puzzle (kept so a restart can vary). */
  seed: number
}

// ── Deterministic PRNG (mulberry32) ───────────────────────────────────────
function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Geometry ───────────────────────────────────────────────────────────────
function orient(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

/** Do segments a-b and c-d properly cross (at an interior point of both)?
 *  Touching only at a shared endpoint does NOT count as a crossing. */
export function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const d1 = orient(c, d, a)
  const d2 = orient(c, d, b)
  const d3 = orient(a, b, c)
  const d4 = orient(a, b, d)
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  )
}

/** Two loop edges are adjacent if they share a point (so they can never be a
 *  "crossing" — they legitimately meet). Edge i spans points i and (i+1)%n. */
function adjacentEdges(i: number, j: number, n: number): boolean {
  return i === j || (i + 1) % n === j || (j + 1) % n === i
}

/** Number of self-crossings of the closed loop through `points`. */
export function crossingCount(points: Pt[]): number {
  const n = points.length
  let count = 0
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      if (adjacentEdges(i, j, n)) continue
      if (segmentsCross(a, b, points[j], points[(j + 1) % n])) count++
    }
  }
  return count
}

/** Indices of loop edges (edge i = segment from point i to point (i+1)%n)
 *  that participate in at least one crossing — used to highlight them. */
export function crossingEdges(points: Pt[]): Set<number> {
  const n = points.length
  const hot = new Set<number>()
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      if (adjacentEdges(i, j, n)) continue
      if (segmentsCross(a, b, points[j], points[(j + 1) % n])) {
        hot.add(i)
        hot.add(j)
      }
    }
  }
  return hot
}

const MARGIN = 0.1 // keep points away from the edges so nodes aren't clipped
const MIN_SEP = 0.14 // minimum spacing so points don't sit on top of each other

function farEnough(p: Pt, pts: Pt[]): boolean {
  return pts.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= MIN_SEP)
}

/** Build a fresh tangled loop. Guarantees at least `minCrossings` crossings
 *  so it's an actual puzzle, and spreads points out so they're draggable. */
export function newGame(n = 6, seed: number = Date.now(), minCrossings = 2): UnknottingState {
  const rand = makeRng(seed)
  const span = 1 - 2 * MARGIN
  let points: Pt[] = []

  for (let attempt = 0; attempt < 80; attempt++) {
    const pts: Pt[] = []
    let tries = 0
    while (pts.length < n && tries < 400) {
      const p = { x: MARGIN + rand() * span, y: MARGIN + rand() * span }
      if (farEnough(p, pts)) pts.push(p)
      tries++
    }
    if (pts.length === n && crossingCount(pts) >= minCrossings) {
      points = pts
      break
    }
    points = pts.length === n ? pts : points
  }

  // Fallback: if we somehow never hit minCrossings, force a known tangle by
  // ordering points around a circle in a "star" sequence (skipping every
  // other one always produces crossings).
  if (points.length !== n || crossingCount(points) < minCrossings) {
    points = starTangle(n)
  }

  return { points, n, moves: 0, seed }
}

/** A guaranteed-tangled layout: points on a circle connected in a star order. */
function starTangle(n: number): Pt[] {
  const ring: Pt[] = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * 2 * Math.PI - Math.PI / 2
    return { x: 0.5 + 0.38 * Math.cos(a), y: 0.5 + 0.38 * Math.sin(a) }
  })
  // Reorder so the loop visits every-other vertex (creates many crossings).
  const step = n % 2 === 0 ? n / 2 - 1 : Math.floor(n / 2)
  const order: Pt[] = []
  for (let k = 0; k < n; k++) order.push(ring[(k * step) % n])
  return order
}

const CLAMP_MARGIN = 0.05

/** Move node `id` to a new normalised position (clamped into the box). */
export function moveNode(state: UnknottingState, id: number, x: number, y: number): UnknottingState {
  if (id < 0 || id >= state.n) return state
  const clamp = (v: number) => Math.max(CLAMP_MARGIN, Math.min(1 - CLAMP_MARGIN, v))
  const points = state.points.slice()
  points[id] = { x: clamp(x), y: clamp(y) }
  return { ...state, points, moves: state.moves + 1 }
}

export function isSolved(state: UnknottingState): boolean {
  return crossingCount(state.points) === 0
}

export function isLoss(_state: UnknottingState): boolean {
  return false
}

export function newPuzzle(): UnknottingState {
  return newGame()
}
