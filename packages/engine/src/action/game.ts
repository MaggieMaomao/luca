// Engine — the Game SDK contract.
//
// A game is a DETERMINISTIC state machine + presentation. Implement this
// interface, register it (engine/registry), and the GameHost runs it: fixed-step
// loop → step(), gesture → mapGesture() → apply(), renders Scene via the chosen
// renderer adapter, mounts Hud, wires sounds to the event bus, tracks the
// session. State/Intent/Ev are the game's OWN types — the engine never inspects
// them, so games stay fully self-contained.

import type { ComponentType } from 'react'
import type { Gesture } from './input/types'
import type { EventBus } from './core/events'
import type { Bests, Outcome, SessionState } from './core/session'
import type { SoundCue } from './audio/synth'

/** Pixel size of the 2D drawing surface. */
export interface View2D { width: number; height: number }

export type RendererKind = 'r3f' | 'canvas2d'

export interface GameMeta {
  id: string
  title: string
  description?: string
  renderer: RendererKind
  /** One-line control hint shown under the stage. */
  hint?: string
}

/** Props a game's Scene receives. It reads LIVE state each frame via getState()
 *  (not React state — to stay 60fps) and may emit effect events on the bus. */
export interface SceneProps<State> {
  getState: () => State
  bus: EventBus<string>
}

export interface HudProps<State, Intent = unknown> {
  state: State
  session: SessionState
  bests: Bests
  /** Dispatch a non-gesture intent (e.g. a button action). */
  dispatch: (intent: Intent) => void
}

/** A LIVE DOM overlay over the stage — reads state each frame (its own rAF),
 *  like Scene but in the DOM (e.g. a first-person viewmodel, crosshair). */
export interface OverlayProps<State, Intent = unknown> {
  getState: () => State
  bus: EventBus<string>
  dispatch: (intent: Intent) => void
}

/** Game UI ABOVE the stage (not clipped) — e.g. spot/mode selectors. Snapshot. */
export interface ControlsProps<State, Intent = unknown> {
  state: State
  session: SessionState
  dispatch: (intent: Intent) => void
}

export interface Game<State, Intent, Ev extends string = string> {
  meta: GameMeta

  /** Fresh state for a new play/session. */
  init(): State

  /** Advance the sim by a FIXED dt (seconds). Emit events for sound/effects.
   *  Must be deterministic given (state, dt). */
  step(state: State, dt: number, emit: (e: Ev) => void): State

  /** Map a raw input gesture to an intent, or null to ignore (tap/cancel). */
  mapGesture(gesture: Gesture): Intent | null

  /** Apply an intent (e.g. take a shot). Emit events. */
  apply(state: State, intent: Intent, emit: (e: Ev) => void): State

  /** Called after each step: return an Outcome exactly once when a play resolves
   *  (else null). The host applies it to the scoring session. */
  outcome?(state: State, prev: State): Outcome | null

  /** Presentation — provide ONE, matching meta.renderer:
   *   • 'r3f'      → `Scene`: a react-three-fiber component drawing from live state
   *   • 'canvas2d' → `draw`: an imperative 2D draw from live state each frame */
  Scene?: ComponentType<SceneProps<State>>
  draw?: (ctx: CanvasRenderingContext2D, state: State, view: View2D) => void

  /** Optional DOM HUD overlay (snapshot state; over the stage). */
  Hud?: ComponentType<HudProps<State, Intent>>

  /** Optional LIVE DOM overlay over the stage (reads state each frame). */
  Overlay?: ComponentType<OverlayProps<State, Intent>>

  /** Optional game UI above the stage (spot/mode selectors, etc.). */
  Controls?: ComponentType<ControlsProps<State, Intent>>

  /** Optional sound cues keyed by event name. */
  sounds?: Partial<Record<Ev, SoundCue>>
}

/** Convenience alias for a fully type-erased game (for registries/hosts). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = Game<any, any, string>
