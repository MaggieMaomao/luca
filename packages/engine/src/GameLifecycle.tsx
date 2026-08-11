// @luca-game/engine — game lifecycle context.
//
// The engine is UI-agnostic and knows nothing about completion APIs,
// score servers, or registries. But adopters (the platform layer, or a
// host app) often need to react when a game finishes — to POST a
// completion for server-side validation, fire analytics, etc.
//
// Rather than couple the engine to any of that, the engine simply
// *emits* a generic lifecycle event through this context. The platform
// layer (or host app) provides an `onComplete` handler that does
// whatever it needs (e.g. call CompletionClient.check()).
//
// If no provider is mounted, the default is a no-op — games run exactly
// as before, with zero behavioural change.

import { createContext, useContext, type ReactNode } from 'react'
import type { GameStats } from './contracts'

/** Payload handed to `onComplete` when a game reaches a terminal state. */
export interface GameCompletionInfo {
  /** Game slug, e.g. "2048", "towers_of_hanoi". */
  slug: string
  /** Terminal status that triggered this event. */
  status: 'won' | 'lost'
  /** Final game state (game-specific shape; the server validator interprets it). */
  state: unknown
  /** Final session stats (post-move — i.e. including the winning move). */
  stats: GameStats
  /** True when the engine considers the game won. Maps to the
   *  completion contract's `reportedComplete`. */
  reportedComplete: boolean
  /** Optional difficulty, if the host knows it. The engine doesn't
   *  track difficulty itself, so this is usually undefined. */
  difficulty?: string
}

export interface GameLifecycle {
  /** Called once when a game transitions to `won` or `lost`. */
  onComplete?: (info: GameCompletionInfo) => void
}

const GameLifecycleContext = createContext<GameLifecycle>({})

export interface GameLifecycleProviderProps extends GameLifecycle {
  children: ReactNode
}

/** Provide lifecycle handlers to every `<GameEngine>` in the subtree. */
export function GameLifecycleProvider({
  onComplete,
  children,
}: GameLifecycleProviderProps) {
  return (
    <GameLifecycleContext.Provider value={{ onComplete }}>
      {children}
    </GameLifecycleContext.Provider>
  )
}

/** Read the current lifecycle handlers. Defaults to no-ops. */
export function useGameLifecycle(): GameLifecycle {
  return useContext(GameLifecycleContext)
}
