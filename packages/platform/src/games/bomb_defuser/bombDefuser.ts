// Bomb Defuser — pure game logic.
//
// A timed puzzle. The player has 60 seconds to defuse a bomb by
// reading clues and "cutting" the right wire. Each wire is labeled;
// cutting the wrong one ends the game.
//
// Simplified: 4 wires (red, blue, green, yellow), one of which is
// the "defuse" wire. The puzzle gives a clue phrase that hints at
// the color.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type Wire = 'red' | 'blue' | 'green' | 'yellow'
export const WIRES: Wire[] = ['red', 'blue', 'green', 'yellow']

export type BombState = {
  /** The wire to cut (the right one). */
  correctWire: Wire
  /** Time remaining in seconds. */
  timeRemaining: number
  /** Wires that have been cut. */
  cut: Wire[]
  moves: number
  /** Whether the bomb has been defused. */
  defused: boolean
  /** Whether the bomb has exploded. */
  exploded: boolean
}

const CLUES: Record<Wire, string[]> = {
  red: ['Cut the wire as red as a stop sign', 'The danger wire is the color of roses', 'Cut the crimson cable'],
  blue: ['Cut the sky-colored wire', 'The ocean hides the answer', 'Blue is the color to cut'],
  green: ['Cut the wire like fresh grass', 'The forest tells you green', 'Snip the emerald strand'],
  yellow: ['Cut the wire like the sun', 'The sun shines yellow on the answer', 'Sever the gold cable'],
}

export function newGame(seed: number = 0, totalTime: number = 60): BombState {
  let rng = (seed || Date.now()) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  return {
    correctWire: WIRES[Math.floor(rand() * WIRES.length)],
    timeRemaining: totalTime,
    cut: [],
    moves: 0,
    defused: false,
    exploded: false,
  }
}

export function cut(state: BombState, wire: Wire): BombState {
  if (state.defused || state.exploded) return state
  if (state.cut.includes(wire)) return state
  const cut = [...state.cut, wire]
  if (wire === state.correctWire) {
    return { ...state, cut, defused: true, moves: state.moves + 1 }
  } else {
    return { ...state, cut, exploded: true, moves: state.moves + 1 }
  }
}

export function tick(state: BombState, elapsed: number): BombState {
  if (state.defused || state.exploded) return state
  const t = Math.max(0, state.timeRemaining - elapsed)
  if (t === 0) return { ...state, timeRemaining: 0, exploded: true }
  return { ...state, timeRemaining: t }
}

export function getClue(wire: Wire): string {
  return CLUES[wire][0]
}

export function isSolved(state: BombState): boolean {
  return state.defused
}

export function isLoss(state: BombState): boolean {
  return state.exploded
}

export function newPuzzle(): BombState {
  return newGame()
}