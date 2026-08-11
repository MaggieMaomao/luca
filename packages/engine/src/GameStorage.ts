// @luca-game/engine — storage adapter.
//
// GameStorage is the engine's interface for persisting per-game scores.
// Implementations are pluggable: pass your own adapter to override
// the default. Two adapters ship in the box:
//
//   - LocalStorageAdapter: stores in window.localStorage (browser only)
//   - InMemoryAdapter:     in-process Map (useful for tests, SSR)
//
// The default `defaultStorage` uses LocalStorage with the
// DEFAULT_KEY_PREFIX. Consumers who want their own prefix (e.g.
// "myapp:scores:") should construct LocalStorageAdapter directly.

import type { GameScore } from './contracts'

/** Default localStorage key prefix. Consumers can override via
 *  LocalStorageAdapter's constructor. */
export const DEFAULT_KEY_PREFIX = 'luca:scores:'

export interface GameStorage {
  /** Get the persisted score for a game. Returns null if never played. */
  getScore(slug: string): Promise<GameScore | null>
  /** Persist a score. Merges with existing (keeps max best, increments plays). */
  setScore(slug: string, score: GameScore): Promise<GameScore>
  /** Clear the score for a game. Used for testing. */
  clearScore(slug: string): Promise<void>
}

const EMPTY_SCORE: GameScore = {
  best: 0,
  plays: 0,
  lastPlayedAt: '',
}

/** LocalStorage adapter. SSR-safe (returns null when window is undefined).
 *
 *  Accepts an optional key prefix; defaults to DEFAULT_KEY_PREFIX.
 *  Pass a custom prefix when multiple apps share a localStorage origin. */
export class LocalStorageAdapter implements GameStorage {
  private readonly prefix: string

  constructor(prefix: string = DEFAULT_KEY_PREFIX) {
    this.prefix = prefix
  }

  async getScore(slug: string): Promise<GameScore | null> {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(this.prefix + slug)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<GameScore>
      return {
        best: typeof parsed.best === 'number' ? parsed.best : 0,
        plays: typeof parsed.plays === 'number' ? parsed.plays : 0,
        lastPlayedAt: typeof parsed.lastPlayedAt === 'string' ? parsed.lastPlayedAt : '',
      }
    } catch {
      return null
    }
  }

  async setScore(slug: string, score: GameScore): Promise<GameScore> {
    if (typeof window === 'undefined') return EMPTY_SCORE
    const current = await this.getScore(slug)
    const next: GameScore = {
      best: Math.max(current?.best ?? 0, score.best),
      plays: (current?.plays ?? 0) + 1,
      lastPlayedAt: new Date().toISOString(),
    }
    try {
      window.localStorage.setItem(this.prefix + slug, JSON.stringify(next))
    } catch {
      // localStorage full or disabled — silently fail.
    }
    return next
  }

  async clearScore(slug: string): Promise<void> {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(this.prefix + slug)
    } catch {
      // ignore
    }
  }
}

/** In-memory adapter for tests + SSR. Same interface as the local one. */
export class InMemoryAdapter implements GameStorage {
  private store = new Map<string, GameScore>()

  async getScore(slug: string): Promise<GameScore | null> {
    return this.store.get(slug) ?? null
  }

  async setScore(slug: string, score: GameScore): Promise<GameScore> {
    const current = this.store.get(slug)
    const next: GameScore = {
      best: Math.max(current?.best ?? 0, score.best),
      plays: (current?.plays ?? 0) + 1,
      lastPlayedAt: new Date().toISOString(),
    }
    this.store.set(slug, next)
    return next
  }

  async clearScore(slug: string): Promise<void> {
    this.store.delete(slug)
  }
}

/** The default storage used by games. Swappable at the engine level. */
export const defaultStorage: GameStorage = new LocalStorageAdapter()