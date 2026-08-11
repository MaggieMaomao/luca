// FPS Hoops — score & combo bookkeeping over resolved shots.
//
// Outcome classification itself lives in ballPhysics.simulateShot (and the live
// loop in useHoopsGame). This module just accumulates a session score: a swish
// is worth a touch more than a contested make, and consecutive makes build a
// combo that adds a bonus.

import type { ShotOutcome, ShotResult } from './types.ts'

export interface ScoreState {
  score: number
  combo: number
  shots: number
  makes: number
  bestCombo: number
  lastOutcome: ShotOutcome | null
}

export const initialScoreState: ScoreState = {
  score: 0,
  combo: 0,
  shots: 0,
  makes: 0,
  bestCombo: 0,
  lastOutcome: null,
}

/** Base points by outcome. Swish rewards a clean shot; a make (off rim/board)
 *  is worth slightly less. Misses score nothing. */
export function basePoints(outcome: ShotOutcome): number {
  switch (outcome) {
    case 'swish': return 3
    case 'make': return 2
    default: return 0
  }
}

/** Apply a resolved shot to the score state (pure). Combo bonus = +combo once
 *  you're on a streak of 2+. */
export function applyShot(state: ScoreState, result: ShotResult): ScoreState {
  const scored = result.scored
  const combo = scored ? state.combo + 1 : 0
  const comboBonus = scored && combo >= 2 ? combo : 0
  const gained = basePoints(result.outcome) + comboBonus
  return {
    score: state.score + gained,
    combo,
    shots: state.shots + 1,
    makes: state.makes + (scored ? 1 : 0),
    bestCombo: Math.max(state.bestCombo, combo),
    lastOutcome: result.outcome,
  }
}
