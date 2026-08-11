// Basketball — data-driven gameplay config.
//
// All tunable knobs live here. No magic numbers in the engine or
// the game logic. Toggling "arcade mode" or "simulation mode" is just
// swapping this config object.
//
// Real-world units throughout: meters (m), meters/second (m/s),
// meters/second^2 (m/s^2), kilograms (kg), radians (rad).

import { realtime } from '@luca-game/engine'

/** Geometry of the court + hoop. Distances in meters. */
export interface BasketballGeometry {
  /** Width of the visible court. The free-throw line is 4.6m from
   *  the backboard in real basketball. The camera is at the
   *  free-throw line looking at the hoop. */
  courtWidth: number           // default 12 (m)
  courtDepth: number           // default 8 (m)
  /** Rim position relative to the player. */
  rimHeight: number            // default 3.05 (m, real NBA rim height)
  rimDiameter: number          // default 0.45 (m, real NBA rim diameter)
  rimDistance: number          // default 4.6 (m, free-throw distance)
  /** Backboard size (m). */
  backboardWidth: number       // default 1.83 (m, real NBA)
  backboardHeight: number      // default 1.07 (m, real NBA)
  backboardOffsetFromRim: number  // default 0.15 (m, board hangs in front of rim)
}

/** Physics tuning. */
export interface BasketballPhysics {
  /** World gravity. Real value -9.8 m/s^2. Arcade mode might use -15. */
  gravity: number
  /** Ball mass (kg). NBA ball is 0.624 kg. */
  ballMass: number
  /** Ball radius (m). NBA ball radius is 0.124 m. */
  ballRadius: number
  /** Coefficient of restitution (bounciness) for the ball against
   *  various surfaces. 0 = no bounce, 1 = perfect bounce. */
  ballRestitution: number      // default 0.75
  backboardRestitution: number // default 0.55
  rimRestitution: number       // default 0.78
  floorRestitution: number     // default 0.5
  /** Air drag (per second). 0 = no drag. */
  airDrag: number              // default 0.05
  /** Spin decay. The ball's rotation slows down at this rate. */
  spinDecay: number            // default 0.97
}

/** Feel: how the gesture-to-throw math behaves. */
export interface BasketballFeel {
  /** Velocity (px/s) below which a swipe is treated as a tap (no throw). */
  minThrowSpeed: number        // default 200
  /** Velocity (px/s) at which a swipe produces maximum-power throw. */
  hardThrowSpeed: number       // default 1500
  /** Aim assist. 0 = no correction, 1 = full snap-to-hoop. MVP = 0.05. */
  aimAssist: number            // default 0.05
  /** Min releaseQuality for the shot to be considered "clean"
   *  (0-1, higher = stricter). */
  perfectReleaseThreshold: number  // default 0.7
  /** Visual aim trail opacity (0-1). 0 = off. */
  aimTrailOpacity: number      // default 0.3
}

/** Scoring. */
export interface BasketballScoring {
  /** Points for a swish (clean ball-through-net, no rim contact). */
  swishPoints: number          // default 3
  /** Points for a make (ball goes through hoop, may have touched rim). */
  makePoints: number          // default 1
  /** Bonus for bank shot (touched backboard first). */
  backboardBonus: number      // default 1
  /** Bonus for rim-in (touched rim before going in). */
  rimInBonus: number          // default 0
  /** Penalty for airball (didn't reach the hoop). */
  airballPenalty: number      // default 0
  /** Combo multiplier: how much consecutive makes scale. */
  comboMultiplier: number      // default 0.5
}

export interface BasketballConfig extends realtime.RealTimeGameConfig {
  geometry: BasketballGeometry
  physics: BasketballPhysics
  feel: BasketballFeel
  scoring: BasketballScoring
}

export const defaultBasketballConfig: BasketballConfig = {
  tickRate: 120,
  renderRate: 60,
  geometry: {
    courtWidth: 12,
    courtDepth: 8,
    rimHeight: 3.05,
    rimDiameter: 0.45,
    rimDistance: 4.6,
    backboardWidth: 1.83,
    backboardHeight: 1.07,
    backboardOffsetFromRim: 0.15,
  },
  physics: {
    // No gravity in Matter — we drive vertical motion via applyThrow's
    // vy directly. (Earlier tuning with gravity=0.78 made the ball
    // accelerate to 1500m/s within 1 second because Matter's
    // gravity.y/scale integration produces accelerating velocity
    // even on tiny Y-flip offsets. We may add a stable gravity
    // later when we know the correct Matter unit.)
    gravity: 0,
    ballMass: 0.624,
    ballRadius: 0.124,
    ballRestitution: 0.40,
    backboardRestitution: 0.35,
    rimRestitution: 0.55,
    floorRestitution: 0.30,
    airDrag: 0.05,
    spinDecay: 0.97,
  },
  feel: {
    minThrowSpeed: 200,
    hardThrowSpeed: 1500,
    aimAssist: 0.05,
    perfectReleaseThreshold: 0.7,
    aimTrailOpacity: 0.3,
  },
  scoring: {
    swishPoints: 3,
    makePoints: 1,
    backboardBonus: 1,
    rimInBonus: 0,
    airballPenalty: 0,
    comboMultiplier: 0.5,
  },
}
