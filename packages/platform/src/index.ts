// @luca-game/platform — public API barrel.
//
// Consumers import from this file for the gallery/play API,
// and from './games/<slug>' for individual games.

// Version
export const PLATFORM_VERSION = '0.1.0'

// React components
export { default as Gallery } from './Gallery'
export { default as GameCard } from './GameCard'
export { default as PlayPage } from './PlayPage'
export { default as ComingSoon } from './ComingSoon'
export { Faq } from './FAQ/Faq'

// Registry + types
export {
  GAMES,
  PLAYABLE_GAMES,
  getGame,
  getGameFuzzy,
} from './registry'
export type { GameMeta, GameStatus, GameDifficulty } from './registry'

// Completion API
export * from './completion'

// Re-export engine types that consumers commonly need
export type {
  GameDefinition,
  GameAction,
  GameRenderContext,
  GameStats,
  GameStorage,
} from '@luca-game/engine'