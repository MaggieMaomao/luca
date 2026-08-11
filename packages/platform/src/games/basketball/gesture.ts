// Basketball — gesture handler (THIN, post-Phase 6.4 extraction).
//
// Per the vertical-slice loop, the gesture math (PointerSampler,
// GestureEngine, ThrowSystem, OneEuroFilter) is now engine-level.
// This file just imports the engine classes and configures them with
// basketball-specific thresholds.
//
// What stays in the basketball game:
//   - Basketball-specific throw system config (5-12 m/s power range)
//   - The mapping from screen-space ThrowIntent to world-space ball
//     velocity (handled in BasketballGame.tsx, not here)
//
// What moved to the engine in Phase 6.4:
//   - PointerSampler (DOM events -> PointerSample[])
//   - GestureEngine (classify tap/swipe/cancel)
//   - ThrowSystem (velocity profile -> ThrowIntent)
//   - OneEuroFilter (adaptive low-pass)
//   - ShotClassifier (framework for game-defined shot types)

import { realtime } from '@luca-game/engine'
import { defaultBasketballConfig, type BasketballConfig } from './Basketball.config'

/** Build a configured ThrowSystem for basketball.
 *  Windows sized to handle casual swipes (up to 2s) on touchscreens. */
export function buildBasketballThrowSystem(
  config: BasketballConfig = defaultBasketballConfig,
): realtime.ThrowSystem {
  return new realtime.ThrowSystem({
    minThrowSpeed: config.feel.minThrowSpeed,
    hardThrowSpeed: config.feel.hardThrowSpeed,
    maxPower: 12,                  // m/s — typical throw exit velocity
    minPower: 5,                   // m/s — minimum to reach the rim
    maxSpin: 8,                    // rad/s
    curvatureSensitivity: 5,
    peakDirectionWeight: 0.7,
    powerCurveExp: 1.5,
    confidentDuration: 0.10,
    windowShort: 0.18,             // wider windows for casual touchscreen swipes
    windowMedium: 0.30,
    windowLong: 0.50,
    shortMax: 0.20,
    mediumMax: 1.0,
  })
}

/** Build a configured GestureEngine for basketball.
 *  Tuned for casual swipes on touchscreens (where users naturally
 *  pause mid-swipe). Cancel threshold raised to 2.0s vs the engine
 *  default 0.8s. */
export function buildBasketballGestureEngine(): realtime.GestureEngine {
  return new realtime.GestureEngine({
    tapDurationMax: 0.10,
    tapDisplacementMax: 25,
    cancelDurationMax: 2.0,    // users naturally pause mid-swipe on touchscreens
    cancelVelocityMin: 80,
  })
}

/** Re-export the engine classes so consumers of this module get a
 *  single import. */
export const PointerSampler = realtime.PointerSampler
export const OneEuroFilter = realtime.OneEuroFilter
export const GestureEngine = realtime.GestureEngine
export const ThrowSystem = realtime.ThrowSystem