// Mastermind — pure game logic.
//
// The player tries to guess a secret code of N pegs, each chosen from
// K colors. After each guess, the player gets feedback: black pegs
// for correct color in correct position, white pegs for correct color
// in wrong position.
//
// All exports are PURE FUNCTIONS. No React, no DOM.

export const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'] as const
export type Color = typeof COLORS[number]
export type Code = Color[]
export type Feedback = { black: number; white: number }

export const CODE_LENGTH = 4
export const MAX_GUESSES = 10

export type MastermindState = {
  /** The secret code (hidden from the player). */
  secret: Code
  /** The history of guesses + feedback. */
  history: Array<{ guess: Code; feedback: Feedback }>
  /** The player's current guess (in progress). */
  currentGuess: Code
  moves: number
}

export function generateSecret(seed: number = 0, length: number = CODE_LENGTH): Code {
  let rng = (seed || Date.now()) | 0
  const rand = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng / 0x7fffffff
  }
  const secret: Code = []
  for (let i = 0; i < length; i++) {
    secret.push(COLORS[Math.floor(rand() * COLORS.length)])
  }
  return secret
}

/** Score a guess against the secret.
 *  Black = correct color in correct position.
 *  White = correct color but in wrong position (counted without
 *          double-counting). */
export function scoreGuess(secret: Code, guess: Code): Feedback {
  if (secret.length !== guess.length) return { black: 0, white: 0 }
  let black = 0
  const secretTallies: Record<string, number> = {}
  const guessTallies: Record<string, number> = {}
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) {
      black++
    } else {
      secretTallies[secret[i]] = (secretTallies[secret[i]] ?? 0) + 1
      guessTallies[guess[i]] = (guessTallies[guess[i]] ?? 0) + 1
    }
  }
  let white = 0
  for (const color of Object.keys(secretTallies)) {
    white += Math.min(secretTallies[color], guessTallies[color] ?? 0)
  }
  return { black, white }
}

export function newGame(seed: number = 0): MastermindState {
  return {
    secret: generateSecret(seed),
    history: [],
    currentGuess: new Array(CODE_LENGTH).fill(COLORS[0]),
    moves: 0,
  }
}

export function submitGuess(state: MastermindState, guess: Code): MastermindState {
  if (state.history.length >= MAX_GUESSES) return state
  const feedback = scoreGuess(state.secret, guess)
  return {
    ...state,
    history: [...state.history, { guess, feedback }],
    moves: state.moves + 1,
  }
}

export function isSolved(state: MastermindState): boolean {
  return state.history.length > 0 && state.history[state.history.length - 1].feedback.black === CODE_LENGTH
}

export function isLoss(state: MastermindState): boolean {
  return state.history.length >= MAX_GUESSES && !isSolved(state)
}

export function newPuzzle(): MastermindState {
  return newGame()
}