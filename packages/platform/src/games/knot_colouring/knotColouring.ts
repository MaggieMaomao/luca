// Knot Colouring — pure game logic (Fox colouring / tricolourability).
//
// Real knot colouring, not graph-vertex colouring: a knot diagram is made of
// ARCS (strands between under-crossings) meeting at CROSSINGS. A valid Fox
// n-colouring assigns each arc a colour in 0..n-1 so that at EVERY crossing
//     2·(over) ≡ (under₁) + (under₂)   (mod n).
// For n = 3 this is exactly: at each crossing the three arcs are all the same
// colour OR all three different. A colouring is *non-trivial* when it uses
// more than one colour — proving the knot is tricolourable.
//
// The canonical example is the trefoil: 3 arcs, 3 crossings, where the only
// non-trivial 3-colouring paints all three arcs differently.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type Crossing = { over: number; under: [number, number] }

export type KnotColoringState = {
  /** Number of arcs (the colourable strands). */
  arcs: number
  crossings: Crossing[]
  /** Current colouring; coloring[a] in 0..numColors-1, or -1 if uncoloured. */
  coloring: number[]
  numColors: number
  moves: number
  name: string
}

/** The trefoil knot: 3 arcs, 3 crossings; arc i is the over-strand at
 *  crossing i and goes under at the other two. */
function trefoil(): Omit<KnotColoringState, 'coloring' | 'moves'> {
  return {
    arcs: 3,
    numColors: 3,
    name: 'Trefoil',
    crossings: [
      { over: 0, under: [1, 2] },
      { over: 1, under: [2, 0] },
      { over: 2, under: [0, 1] },
    ],
  }
}

export function newGame(_seed: number = Date.now()): KnotColoringState {
  const k = trefoil()
  return { ...k, coloring: new Array(k.arcs).fill(-1), moves: 0 }
}

export function setColor(state: KnotColoringState, arc: number, color: number): KnotColoringState {
  if (arc < 0 || arc >= state.arcs) return state
  if (color < -1 || color >= state.numColors) return state
  const coloring = state.coloring.slice()
  coloring[arc] = color
  return { ...state, coloring, moves: state.moves + 1 }
}

/** Cycle an arc's colour 0→1→…→n-1→0 (used by click-to-recolour). */
export function cycleColor(state: KnotColoringState, arc: number): KnotColoringState {
  if (arc < 0 || arc >= state.arcs) return state
  const cur = state.coloring[arc]
  const next = cur < 0 ? 0 : (cur + 1) % state.numColors
  return setColor(state, arc, next)
}

/** Crossing satisfies the Fox relation. Returns false if any incident arc is
 *  still uncoloured (so it reads as "not yet valid"). */
export function crossingValid(state: KnotColoringState, x: Crossing): boolean {
  const o = state.coloring[x.over]
  const u0 = state.coloring[x.under[0]]
  const u1 = state.coloring[x.under[1]]
  if (o < 0 || u0 < 0 || u1 < 0) return false
  const n = state.numColors
  return (((2 * o - u0 - u1) % n) + n) % n === 0
}

export function allColored(state: KnotColoringState): boolean {
  return state.coloring.every(c => c >= 0)
}

/** Uses more than one colour → a non-trivial colouring. */
export function isNonTrivial(state: KnotColoringState): boolean {
  const used = new Set(state.coloring.filter(c => c >= 0))
  return used.size >= 2
}

export function isSolved(state: KnotColoringState): boolean {
  if (!allColored(state)) return false
  if (!isNonTrivial(state)) return false // trivial (all one colour) doesn't count
  return state.crossings.every(x => crossingValid(state, x))
}

export function isLoss(_state: KnotColoringState): boolean {
  return false
}

export function newPuzzle(): KnotColoringState {
  return newGame()
}
