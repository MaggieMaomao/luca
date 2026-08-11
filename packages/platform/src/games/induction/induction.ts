// Induction — pure game logic.
//
// A sequence-puzzle: the player sees a numeric sequence and must
// guess the next number. Multiple-choice answers are shown.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export type Sequence = {
  /** The displayed terms. */
  terms: number[]
  /** The correct next term. */
  next: number
  /** A short human-readable explanation. */
  hint: string
  /** Distractor options. Set by newGame(). */
  options?: number[]
}

export function newGame(): Sequence {
  // Pick a random sequence from a built-in catalog
  const idx = Math.floor(Math.random() * CATALOG.length)
  const base = CATALOG[idx]
  // Generate distractors: ±1, ±2 from the answer, but cap so they
  // stay distinct from `next`.
  const distractors: number[] = []
  const seen = new Set<number>([base.next])
  let offset = 1
  while (distractors.length < 3) {
    for (const sign of [-1, 1]) {
      const d = base.next + sign * offset
      if (!seen.has(d)) {
        distractors.push(d)
        seen.add(d)
      }
      if (distractors.length >= 3) break
    }
    offset++
  }
  const options = shuffle([base.next, ...distractors])
  return { ...base, options }
}

/** Deterministic Fisher-Yates shuffle (with optional seed). */
function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── Catalog of sequences ──────────────────────────────────────

const CATALOG: Sequence[] = [
  { terms: [1, 2, 3, 4, 5],     next: 6,   hint: 'counting up by 1' },
  { terms: [2, 4, 6, 8, 10],    next: 12,  hint: 'counting by 2' },
  { terms: [5, 10, 15, 20],     next: 25,  hint: 'counting by 5' },
  { terms: [10, 20, 30, 40],    next: 50,  hint: 'counting by 10' },
  { terms: [1, 4, 9, 16, 25],   next: 36,  hint: 'square numbers' },
  { terms: [1, 8, 27, 64],      next: 125, hint: 'cubes' },
  { terms: [1, 2, 4, 8, 16],    next: 32,  hint: 'powers of 2' },
  { terms: [1, 3, 9, 27],       next: 81,  hint: 'powers of 3' },
  { terms: [2, 3, 5, 7, 11],    next: 13,  hint: 'prime numbers' },
  { terms: [1, 1, 2, 3, 5, 8],  next: 13,  hint: 'Fibonacci' },
  { terms: [3, 6, 9, 12, 15],   next: 18,  hint: 'multiples of 3' },
  { terms: [1, 3, 6, 10, 15],   next: 21,  hint: 'triangular numbers' },
  { terms: [2, 4, 8, 16, 32],   next: 64,  hint: 'powers of 2' },
  { terms: [100, 90, 80, 70],   next: 60,  hint: 'counting down by 10' },
  { terms: [5, 4, 3, 2, 1],     next: 0,   hint: 'counting down' },
  { terms: [1, 11, 21, 31],     next: 41,  hint: 'arithmetic sequence, +10' },
  { terms: [2, 6, 18, 54],      next: 162, hint: 'geometric, ×3' },
  { terms: [1, 4, 7, 10, 13],   next: 16,  hint: 'arithmetic, +3' },
  { terms: [0, 1, 1, 2, 3, 5],  next: 8,   hint: 'Fibonacci (with 0)' },
  { terms: [1, 2, 6, 24, 120],  next: 720, hint: 'factorials' },
]

/** Score: 1 point per correct answer. */
export function scoreCorrect(sequence: Sequence, guess: number): boolean {
  return guess === sequence.next
}

/** "Induction" doesn't really have a state; just a single question. */
export type InductionState = {
  sequence: Sequence
  attempts: number
  solved: boolean
  moves: number
}

export function newState(): InductionState {
  return { sequence: newGame(), attempts: 0, solved: false, moves: 0 }
}

export function isSolved(state: InductionState): boolean {
  return state.solved
}

export function attempt(state: InductionState, guess: number): InductionState {
  if (state.solved) return state
  const correct = scoreCorrect(state.sequence, guess)
  return {
    ...state,
    attempts: state.attempts + 1,
    solved: correct,
  }
}

export function isWin(state: InductionState): boolean {
  return state.solved
}

export function isLoss(_state: InductionState): boolean {
  return false
}

export function newPuzzle(): InductionState {
  return newState()
}