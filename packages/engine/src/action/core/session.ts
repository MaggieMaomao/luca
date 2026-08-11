// Engine core — generic scoring / combo / bests session (pure + localStorage).
//
// A game reports an Outcome when a play resolves; the session accumulates score,
// combo streaks, and win rate, and persists per-game bests. Renderer- and
// game-agnostic — the labels/points come from the game.

export interface SessionState {
  score: number
  combo: number
  bestCombo: number
  plays: number
  wins: number
  lastOutcome: string | null
}

export const emptySession: SessionState = {
  score: 0, combo: 0, bestCombo: 0, plays: 0, wins: 0, lastOutcome: null,
}

export interface Outcome {
  points: number
  won: boolean
  /** Bonus of +combo once on a streak of 2+. */
  comboBonus?: boolean
  /** A label surfaced to the HUD (e.g. 'swish'). */
  label?: string
}

export function applyOutcome(s: SessionState, o: Outcome): SessionState {
  const combo = o.won ? s.combo + 1 : 0
  const bonus = o.comboBonus && o.won && combo >= 2 ? combo : 0
  return {
    score: s.score + o.points + bonus,
    combo,
    bestCombo: Math.max(s.bestCombo, combo),
    plays: s.plays + 1,
    wins: s.wins + (o.won ? 1 : 0),
    lastOutcome: o.label ?? null,
  }
}

/** Accuracy as a percentage, or null before any play. */
export function accuracy(s: SessionState): number | null {
  return s.plays > 0 ? Math.round((s.wins / s.plays) * 100) : null
}

// ── Persisted bests (per game id) ────────────────────────────────────────────
export interface Bests { bestScore: number; bestCombo: number }
const emptyBests: Bests = { bestScore: 0, bestCombo: 0 }

export function loadBests(gameId: string): Bests {
  if (typeof localStorage === 'undefined') return { ...emptyBests }
  try { return { ...emptyBests, ...JSON.parse(localStorage.getItem(`engine.bests.${gameId}`) || '{}') } }
  catch { return { ...emptyBests } }
}

export function saveBests(gameId: string, next: Bests): Bests {
  const cur = loadBests(gameId)
  const merged = { bestScore: Math.max(cur.bestScore, next.bestScore), bestCombo: Math.max(cur.bestCombo, next.bestCombo) }
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(`engine.bests.${gameId}`, JSON.stringify(merged)) } catch { /* ignore */ }
  }
  return merged
}
