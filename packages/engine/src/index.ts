// @luca-game/engine — public API barrel.
//
// Consumers import from this file, not from individual engine modules.
// Lets us refactor internals without breaking downstream code.
//
// Note: CSS for <GameEngine> is NOT imported here. Bundlers (vite,
// webpack) need explicit CSS imports to inline styles, but Node ESM
// (used for our smoke tests and server-side rendering) can't resolve
// them. Consumers should import the CSS themselves:
//
//   import '@luca-game/engine/dist/GameEngine.css'
//
// The CSS file is shipped via `copy-assets.mjs` after build.

export { GameEngine } from './GameEngine'
export { useGameController } from './useGameController'
export {
  GameLifecycleProvider,
  useGameLifecycle,
} from './GameLifecycle'
export type {
  GameLifecycle,
  GameCompletionInfo,
  GameLifecycleProviderProps,
} from './GameLifecycle'
export {
  defaultStorage,
  LocalStorageAdapter,
  InMemoryAdapter,
  DEFAULT_KEY_PREFIX,
} from './GameStorage'
export type { GameStorage } from './GameStorage'

export type {
  GameAction,
  GameDefinition,
  GameEvent,
  GameHelp,
  GameRenderContext,
  GameScore,
  GameStats,
  GameStatus,
  GameTransition,
  GameControls,
} from './contracts'

export {
  canTransition,
  transition as transitionStatus,
  isTerminal,
  isInteractive,
  isFinished,
  hasStarted,
  TERMINAL_STATES,
} from './GameState'

export { STATUS_TRANSITIONS } from './contracts'

// ── Real-time engine (Phase 6) ────────────────────────────────────────────
// Sibling to the turn-based engine above. Same consumers can import
// both. The realtime/ subpath re-exports the public real-time API
// (RealTimeGameHost, useRealTimeController, etc.).
export * as realtime from './realtime'

export const ENGINE_VERSION = '0.1.0'
export const REALTIME_ENGINE_VERSION = '0.1.0'
