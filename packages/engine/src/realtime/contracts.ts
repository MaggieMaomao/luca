// @luca-game/engine — Real-time game contracts.
//
// These are the types that a real-time game (basketball, soccer, tennis)
// implements. Distinct from the turn-based `GameDefinition` in
// ../contracts.ts because real-time games need a continuous update
// loop, fixed timestep, and physics/render adapters — not discrete
// actions.
//
// Adding a real-time game = implement `RealTimeGameDefinition` + provide
// a renderer + physics setup. The engine handles the rest.
//
// See ../PHASE_6_REALTIME_ENGINE.md (and ../GESTURE_ALGORITHM.md for
// the gesture-to-shot algorithm) for the full design.
//
// Generic params:
//   TState  — game state (positions, scores, timers, etc.)
//   TInput  — input snapshot (gestures, button presses, AI moves)
//   TConfig — data-driven gameplay config (gravity, elasticity, etc.)

import type { GameMeta, GameStatus, GameHelp } from '../contracts'

// ── Real-time events ───────────────────────────────────────────────────────

/** Events the engine surfaces to the renderer / audio / haptics. */
export type RealTimeEvent =
  | { kind: 'THROW'; intent: import('./input/PointerSampler').ThrowIntent }
  | { kind: 'GOAL' | 'MISS'; payload?: { scoreGained?: number } }
  | { kind: 'CONTACT'; payload: { kind: 'rim' | 'backboard' | 'floor' | 'wall'; impulse: number } }
  | { kind: 'COMBO'; payload: { streak: number; multiplier: number } }
  | { kind: 'CUSTOM'; payload: unknown }   // game-specific

/** Events the engine publishes to the render bus (for camera shake,
 *  particle effects, etc.). Games emit them; the renderer consumes. */
export type RealTimeRenderEvent =
  | { kind: 'cameraShake'; intensity: number; duration: number }
  | { kind: 'particleBurst'; at: [number, number, number]; count: number; color?: string }
  | { kind: 'flash'; color: string; duration: number }
  | { kind: 'sound'; name: string; volume?: number }
  | { kind: 'CUSTOM'; payload: unknown }

// ── Real-time game config ──────────────────────────────────────────────────

/** Real-time games have a data-driven config object so the same
 *  game can have multiple "modes" (e.g. arcade vs simulation) by
 *  swapping the config. No magic numbers in code. */
export interface RealTimeGameConfig {
  /** The fixed physics tick rate. The engine enforces this. */
  tickRate: number       // default 120 (Hz)
  /** The render frame rate target. 60Hz is the default. */
  renderRate: number     // default 60
  /** Free-form game-specific knobs. Typed by TConfig in
   *  RealTimeGameDefinition. */
  [key: string]: unknown
}

// ── Real-time input ────────────────────────────────────────────────────────

/** A snapshot of input at one tick. The engine constructs this from
 *  the gesture engine + any other input sources (keyboard, AI). */
export interface RealTimeInput {
  /** The latest gesture (if any) being tracked. */
  gesture?: import('./input/PointerSampler').Gesture
  /** The most recent ThrowIntent produced (if a release happened). */
  throwIntent?: import('./input/PointerSampler').ThrowIntent
  /** Free-form game-specific input (button states, AI moves, etc.). */
  [key: string]: unknown
}

// ── Real-time game definition ──────────────────────────────────────────────

export interface RealTimeGameDefinition<TState, TInput extends RealTimeInput, TConfig extends RealTimeGameConfig> {
  /** Display metadata. */
  meta: GameMeta

  /** Create initial state. Called when the user clicks "New game". */
  initialState: (config: TConfig) => TState

  /**
   * Fixed-timestep update. Called by the engine at exactly `1/tickRate`
   * seconds. Pure: never mutate `state`, return a new state.
   * @param dt       — always 1/tickRate (e.g. 1/120 ≈ 8.3ms)
   * @param input    — current input snapshot
   * @param state    — current state
   */
  update: (state: TState, dt: number, input: TInput) => TState

  /** Default config. Games override with `useRealTimeController({ config }). */
  defaultConfig: TConfig

  /** Lifecycle hooks. */
  onStart?: (state: TState) => void
  onPause?: (state: TState) => void
  onResume?: (state: TState) => void
  onEnd?: (state: TState) => void

  /** Win/loss conditions. Engine polls these for the lifecycle. */
  isWin: (state: TState) => boolean
  isLoss?: (state: TState) => boolean

  /**
   * Optional: emit events. The engine forwards to the render bus
   * and the completion contract. Games can also emit custom events
   * for engine-level handling.
   */
  detectEvents?: (state: TState) => RealTimeEvent[]

  /** Help text (same shape as the turn-based engine). */
  help: GameHelp
}

// ── Real-time controller hook return type ───────────────────────────────────

/** What `useRealTimeController` returns. Mirrors the turn-based hook. */
export interface RealTimeControllerResult<TState, TInput extends RealTimeInput, TConfig extends RealTimeGameConfig> {
  state: TState
  config: TConfig
  status: GameStatus
  interactive: boolean
  /** Submit an input. Most games don't need this; the engine's gesture
   *  engine auto-submits pointer events. Useful for keyboard, AI, etc. */
  submitInput: (input: TInput) => void
  pause: () => void
  resume: () => void
  restart: () => void
  /** Engine-level: subscribe to render events. Returns an unsubscribe
   *  fn. Used by the host's renderer bridge. */
  onRenderEvent: (cb: (e: RealTimeRenderEvent) => void) => () => void
  /** Replay control. */
  replay: import('./host/ReplayRecorder').ReplayHandle
  /** Telemetry: tick count, elapsed time, RNG seed, etc. */
  telemetry: import('./host/useRealTimeController').GameTelemetry
}

// Re-export for convenience
export type { GameMeta, GameStatus, GameHelp } from '../contracts'
