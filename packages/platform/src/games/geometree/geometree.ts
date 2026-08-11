// GeomeTree — pure game logic.
//
// A branching tree puzzle. Each node has a value; the value of the
// parent equals the sum (or product) of its children. The player
// must fill in the missing values.
//
// Educational version: sum tree, 3 levels deep.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type GeomeNode = {
  /** Level from the root (0 = root). */
  depth: number
  /** Children indices (for internal nodes); empty for leaves. */
  children: number[]
  /** The value (pre-filled or player input). */
  value: number | null
  /** Whether this value is given (immutable). */
  prefilled: boolean
}

export type GeomeTreeState = {
  /** The tree, stored in heap/array order: node 0 is the root, and the
   *  children of node i are 2i+1 and 2i+2. This matches the renderer's
   *  layout exactly. */
  nodes: GeomeNode[]
  /** The relationship: 'sum' or 'product'. */
  relation: 'sum' | 'product'
  moves: number
}

/** Build a full binary tree with `depth+1` levels (depth=3 → 4 levels, 8
 *  leaves, 15 nodes), in heap order. The leaves are given; the player fills
 *  in every internal node so each parent equals the sum/product of its two
 *  children. The solution is unique and computable bottom-up. */
export function newGame(depth: number = 3, seed: number = Date.now(), relation: 'sum' | 'product' = 'sum'): GeomeTreeState {
  let rng = (seed || 1) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  const total = 2 ** (depth + 1) - 1
  const nodes: GeomeNode[] = []
  for (let i = 0; i < total; i++) {
    const left = 2 * i + 1
    const right = 2 * i + 2
    const level = Math.floor(Math.log2(i + 1))
    if (left < total) {
      // Internal node — player fills it in.
      nodes.push({ depth: level, children: [left, right], value: null, prefilled: false })
    } else {
      // Leaf — given. Keep leaf values small so sums stay reasonable.
      const value = relation === 'sum' ? 1 + Math.floor(rand() * 9) : 2 + Math.floor(rand() * 4)
      nodes.push({ depth: level, children: [], value, prefilled: true })
    }
  }
  return { nodes, relation, moves: 0 }
}

export function setValue(state: GeomeTreeState, idx: number, value: number): GeomeTreeState {
  if (idx < 0 || idx >= state.nodes.length) return state
  if (state.nodes[idx].prefilled) return state
  const nodes = state.nodes.slice()
  nodes[idx] = { ...nodes[idx], value }
  return { ...state, nodes, moves: state.moves + 1 }
}

/** Are all internal node values filled in correctly? */
export function isSolved(state: GeomeTreeState): boolean {
  for (let i = 0; i < state.nodes.length; i++) {
    if (state.nodes[i].value === null) return false
  }
  // Recompute expected values from leaves
  for (let i = 0; i < state.nodes.length; i++) {
    const node = state.nodes[i]
    if (node.children.length === 0) continue  // leaf
    const childVals = node.children.map(c => state.nodes[c].value) as number[]
    if (childVals.some(v => v === null || v === undefined)) return false
    const expected = state.relation === 'sum'
      ? childVals.reduce((a, b) => a + b, 0)
      : childVals.reduce((a, b) => a * b, 1)
    if (node.value !== expected) return false
  }
  return true
}

export function isLoss(_state: GeomeTreeState): boolean {
  return false
}

/** Alias used by the engine's GameDefinition. */
export const newPuzzle = () => newGame()