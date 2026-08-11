// Engine render — the props a renderer adapter (r3f, canvas2d) receives from the
// GameHost. The adapter owns the frame loop: each frame it calls `tick(dt)` to
// advance the sim, then draws the game's presentation from live state.

import type { ComponentType } from 'react'
import type { EventBus } from '../core/events'
import type { Game } from '../game'

// The adapter only needs the presentation bits — Pick avoids Intent/Ev variance.
export interface StageProps<S> {
  game: Pick<Game<S, unknown, string>, 'meta' | 'Scene' | 'draw'>
  getState: () => S
  bus: EventBus<string>
  /** Advance the fixed-step sim by `dt` real seconds. Call once per frame. */
  tick: (dt: number) => void
}

export type StageComponent<S = unknown> = ComponentType<StageProps<S>>
