// Basketball — pure game state + RealTimeGameDefinition.
//
// Phase 6.2 MVP. The state machine is simple for the vertical slice:
// - The ball has a position (read from physics each tick)
// - The score is incremented on makes
// - The combo is tracked (consecutive makes)
//
// The physics + rendering are handled by the engine's adapters
// (MatterAdapter + PixiJSRenderer). This file is pure logic.

import { realtime, type realtime as RT } from '@luca-game/engine'
import { defaultBasketballConfig, type BasketballConfig } from './Basketball.config'

// ── State types ────────────────────────────────────────────────────────

/** What a basketball game state contains. */
export interface BasketballState {
  /** Current ball world position (synced from physics each tick). */
  ballPosition: RT.Vector3
  /** Current ball velocity (synced from physics each tick). */
  ballVelocity: RT.Vector3
  /** Score for the current session. */
  score: number
  /** Combo counter: consecutive makes. Resets to 0 on miss. */
  combo: number
  /** Whether the ball is currently in flight (released by the
   *  player and not yet scored or rebounded). */
  ballInFlight: boolean
  /** Last shot's classification (for feedback animation). */
  lastShot: 'swish' | 'make' | 'rim' | 'backboard' | 'airball' | null
  /** Total shots taken in this session. */
  shotsTaken: number
  /** Total makes (anything that went through the hoop). */
  makes: number
}

export type BasketballInput = RT.RealTimeInput & {
  /** The basketball game gets input from the PointerSampler via the
   *  engine. We define the input shape here so it's type-checked. */
  throwIntent?: RT.ThrowIntent
  /** Whether a swipe gesture is currently active. The game
   *  uses this to know when to start a new throw. */
  gestureActive: boolean
}

// ── Initial state ─────────────────────────────────────────────────────

export function initialBasketballState(config: BasketballConfig): BasketballState {
  return {
    ballPosition: { x: 0, y: config.physics.ballRadius, z: 0 },
    ballVelocity: { x: 0, y: 0, z: 0 },
    score: 0,
    combo: 0,
    ballInFlight: false,
    lastShot: null,
    shotsTaken: 0,
    makes: 0,
  }
}

// ── Pure update logic ──────────────────────────────────────────────────

/** The basketball game's update function. Called every physics tick. */
export function updateBasketball(
  state: BasketballState,
  dt: number,
  input: BasketballInput,
  config: BasketballConfig,
): BasketballState {
  // If a throw intent arrived, transition the ball to in-flight.
  // The actual velocity application happens via the physics adapter
  // (this game file doesn't directly call setVelocity — that comes
  // in the next iteration when we wire gesture -> physics).
  let next: BasketballState = state
  if (input.throwIntent && !state.ballInFlight) {
    next = {
      ...next,
      ballInFlight: true,
      shotsTaken: state.shotsTaken + 1,
    }
  }
  return next
}

// ── Game definition ───────────────────────────────────────────────────

export const basketballDefinition: realtime.RealTimeGameDefinition<
  BasketballState,
  BasketballInput,
  BasketballConfig
> = {
  meta: {
    slug: 'basketball',
    title: 'Basketball',
  },

  initialState: initialBasketballState,

  defaultConfig: defaultBasketballConfig,

  update: (state, dt, input) => updateBasketball(state, dt, input, defaultBasketballConfig),

  isWin: () => false,  // No end condition for basketball — keep playing
  // isLoss optional — omitted

  detectEvents: (state) => {
    const events: realtime.RealTimeEvent[] = []
    if (state.lastShot === 'swish' || state.lastShot === 'make') {
      events.push({ kind: 'GOAL', payload: { scoreGained: state.score } })
    } else if (state.lastShot === 'airball' || state.lastShot === 'rim') {
      events.push({ kind: 'MISS' })
    }
    if (state.combo >= 2) {
      events.push({ kind: 'COMBO', payload: { streak: state.combo, multiplier: 1 + state.combo * 0.5 } })
    }
    return events
  },

  help: {
    description:
      'Swipe to shoot. Aim for a swish (clean ball-through-net) for max points. ' +
      'Chain makes for a combo multiplier.',
    controls: [
      { action: 'Swipe up-and-forward to shoot the ball' },
      { keys: 'R', action: 'reset the court' },
    ],
    goal: 'Score as many points as possible.',
  },
}
