// Engine — public SDK surface. Build a game by implementing `Game`, then run it
// with <GameHost game={yourGame} /> or register it (see registry).

// The contract + host
export type {
  Game, GameMeta, SceneProps, HudProps, OverlayProps, ControlsProps,
  RendererKind, View2D, AnyGame,
} from './game'
export { GameHost } from './GameHost'

// Core (loop / events / session)
export { fixedLoop, type FixedLoop } from './core/loop'
export { EventBus } from './core/events'
export {
  emptySession, applyOutcome, accuracy, loadBests, saveBests,
  type SessionState, type Outcome, type Bests,
} from './core/session'

// Input (gesture pipeline + the reusable flick-throw helper)
export { useGestureInput } from './input/useGestureInput'
export { GestureEngine } from './input/GestureEngine'
export { OneEuroFilter } from './input/OneEuroFilter'
export { ThrowSystem, defaultThrowSystemConfig } from './input/ThrowSystem'
export type { Gesture, PointerSample, ThrowIntent, Vector3 } from './input/types'

// Audio (procedural synth)
export { makeSoundPlayer, tone, whoosh, type SoundCue, type SoundCtx, type SoundPlayer } from './audio/synth'

// Registry (register a game once, list them for a gallery)
export { registerGame, getGame, listGames } from './registry'

// Note: the r3f (three.js) renderer is intentionally NOT re-exported here —
// GameHost lazy-loads it, and direct consumers import it from the optional
// subpath '@luca-game/engine/action/r3f' so 2D-only builds stay three-free.
