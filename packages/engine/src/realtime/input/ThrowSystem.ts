// @luca-game/engine — ThrowSystem.
//
// The "secret sauce" that turns a swipe gesture into a ThrowIntent.
// Lives at the engine level because it generalizes across sports:
// basketball, soccer, tennis, etc. all use it.
//
// The pipeline:
//   gesture samples
//     -> adaptive velocity profile window
//     -> direction (peak + end blend, normalized)
//     -> power (non-linear curve)
//     -> spin (curvature-derived)
//     -> release quality (peak-vs-effective ratio)
//     -> confidence (duration * speed)
//
// All thresholds are data-driven via ThrowSystemConfig. Each game
// tunes these in its own config without touching engine code.

import type { PointerSample, Gesture, ThrowIntent, Vector3 } from './PointerSampler'

/** Engine-level throw system config. */
export interface ThrowSystemConfig {
  /** Velocity thresholds (px/s). */
  minThrowSpeed: number       // default 200 — below this is no shot
  hardThrowSpeed: number      // default 1500 — at this speed we get max power

  /** Output power limits (game-specific units; basketball uses m/s). */
  maxPower: number
  minPower: number

  /** Power curve (non-linear). Higher = power ramps faster at the top. */
  powerCurveExp: number       // default 1.5

  /** Spin sensitivity. */
  maxSpin: number             // default 8.0 (rad/s)
  curvatureSensitivity: number // default 5.0

  /** Direction blend: weight on peak direction vs end direction.
   *  1.0 = pure peak, 0.0 = pure end. */
  peakDirectionWeight: number   // default 0.7

  /** Adaptive velocity profile window (seconds). The window is
   *  chosen based on the gesture duration:
   *    duration < shortMax  -> use windowShort
   *    duration < mediumMax -> use windowMedium
   *    otherwise            -> use windowLong
   */
  windowShort: number         // default 0.10 — used when gesture < 0.15s
  windowMedium: number        // default 0.12 — used when 0.15-0.4s
  windowLong: number          // default 0.12 — used when > 0.4s
  shortMax: number            // default 0.15
  mediumMax: number           // default 0.4

  /** Confidence weighting. */
  confidentDuration: number   // default 0.10 — short enough that fast swipes are confident
}

/** Default ThrowSystem config. Each game overrides per-sport. */
export const defaultThrowSystemConfig: ThrowSystemConfig = {
  minThrowSpeed: 200,
  hardThrowSpeed: 1500,
  maxPower: 25,
  minPower: 5,
  powerCurveExp: 1.5,
  maxSpin: 8,
  curvatureSensitivity: 5,
  peakDirectionWeight: 0.7,
  windowShort: 0.10,
  windowMedium: 0.12,
  windowLong: 0.12,
  shortMax: 0.15,
  mediumMax: 0.4,
  confidentDuration: 0.10,
}

/** The internal velocity profile extracted from a swipe. */
interface VelocityProfile {
  samples: PointerSample[]
  duration: number
  peakSpeed: number
  peakDirection: { x: number; y: number }
  endDirection: { x: number; y: number }
  effectiveSpeed: number
  curvature: number
  displacement: number
}

/** The engine's sports-agnostic throw system. Consumes a Gesture,
 *  produces a ThrowIntent (or null for taps/cancels). */
export class ThrowSystem {
  constructor(private config: ThrowSystemConfig = defaultThrowSystemConfig) {}

  /** Convert a swipe gesture to a ThrowIntent, or null if it's a
   *  tap or cancel. */
  release(gesture: Gesture): ThrowIntent | null {
    if (gesture.type !== 'swipe') return null
    const profile = this.extractProfile(gesture)
    if (!profile) return null

    return {
      direction: this.computeDirection(profile),
      power: this.computePower(profile),
      spin: this.computeSpin(profile),
      releaseQuality: this.computeReleaseQuality(profile),
      confidence: this.computeConfidence(profile),
    }
  }

  /** Internal: extract a velocity profile from the relevant window. */
  private extractProfile(gesture: Gesture): VelocityProfile | null {
    const samples = gesture.samples
    if (samples.length < 2) return null
    const dur = gesture.duration
    const win =
      dur < this.config.shortMax ? this.config.windowShort :
      dur < this.config.mediumMax ? this.config.windowMedium :
      this.config.windowLong
    const endT = gesture.endT
    const startT = endT - win
    const windowSamples = samples.filter(s => s.t >= startT)
    if (windowSamples.length < 2) return null

    // Velocity per sample (finite difference)
    let peakSpeed = 0
    let peakIdx = 1
    const speeds: number[] = []
    for (let i = 1; i < windowSamples.length; i++) {
      const dt = Math.max(0.001, windowSamples[i].t - windowSamples[i - 1].t)
      const dx = windowSamples[i].x - windowSamples[i - 1].x
      const dy = windowSamples[i].y - windowSamples[i - 1].y
      const v = Math.sqrt(dx * dx + dy * dy) / dt
      speeds.push(v)
      if (v > peakSpeed) {
        peakSpeed = v
        peakIdx = i
      }
    }
    // Effective speed: average weighted toward end
    let weightedSum = 0
    let weightSum = 0
    for (let i = 0; i < speeds.length; i++) {
      const w = (i + 1) / speeds.length
      weightedSum += speeds[i] * w
      weightSum += w
    }
    const effectiveSpeed = weightSum > 0 ? weightedSum / weightSum : 0

    const curvature = this.computeCurvature(windowSamples)
    const peakDirection = {
      x: windowSamples[peakIdx].x - windowSamples[peakIdx - 1].x,
      y: windowSamples[peakIdx].y - windowSamples[peakIdx - 1].y,
    }
    const last = windowSamples.length - 1
    const endDirection = {
      x: windowSamples[last].x - windowSamples[last - 1].x,
      y: windowSamples[last].y - windowSamples[last - 1].y,
    }

    return {
      samples: windowSamples,
      duration: windowSamples[last].t - windowSamples[0].t,
      peakSpeed,
      peakDirection,
      endDirection,
      effectiveSpeed,
      curvature,
      displacement: gesture.displacement,
    }
  }

  /** Internal: angle change from start to end of the gesture (0 = straight,
   *  1 = sharp 180-degree curve). */
  private computeCurvature(samples: PointerSample[]): number {
    if (samples.length < 3) return 0
    const startDx = samples[1].x - samples[0].x
    const startDy = samples[1].y - samples[0].y
    const endDx = samples[samples.length - 1].x - samples[samples.length - 2].x
    const endDy = samples[samples.length - 1].y - samples[samples.length - 2].y
    const startAngle = Math.atan2(startDy, startDx)
    const endAngle = Math.atan2(endDy, endDx)
    let delta = endAngle - startAngle
    while (delta > Math.PI) delta -= 2 * Math.PI
    while (delta < -Math.PI) delta += 2 * Math.PI
    return Math.abs(delta) / Math.PI
  }

  /** Internal: blend peak + end direction, normalize to unit vector.
   *  Y-axis is flipped (screen Y down → world Y up). */
  private computeDirection(profile: VelocityProfile): Vector3 {
    const peakMag = Math.sqrt(profile.peakDirection.x ** 2 + profile.peakDirection.y ** 2)
    const endMag = Math.sqrt(profile.endDirection.x ** 2 + profile.endDirection.y ** 2)
    if (peakMag < 0.01 && endMag < 0.01) return { x: 0, y: 0, z: 0 }
    const peak = peakMag > 0.01
      ? { x: profile.peakDirection.x / peakMag, y: profile.peakDirection.y / peakMag }
      : { x: 0, y: 0 }
    const end = endMag > 0.01
      ? { x: profile.endDirection.x / endMag, y: profile.endDirection.y / endMag }
      : { x: 0, y: 0 }
    const w = this.config.peakDirectionWeight
    let dx = peak.x * w + end.x * (1 - w)
    let dy = -(peak.y * w + end.y * (1 - w))
    // Normalize to unit length (ThrowIntent contract)
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len > 0.0001) {
      dx /= len
      dy /= len
    }
    // Z is the game's responsibility — engine returns 0 here.
    return { x: dx, y: dy, z: 0 }
  }

  /** Internal: map effective speed (px/s) to a power value in [minPower, maxPower]. */
  private computePower(profile: VelocityProfile): number {
    const { minThrowSpeed, hardThrowSpeed, maxPower, minPower, powerCurveExp } = this.config
    const ratio = (profile.effectiveSpeed - minThrowSpeed) / (hardThrowSpeed - minThrowSpeed)
    const clamped = Math.max(0, Math.min(1, ratio))
    const curved = Math.pow(clamped, powerCurveExp)
    return minPower + curved * (maxPower - minPower)
  }

  /** Internal: derive spin from gesture curvature. */
  private computeSpin(profile: VelocityProfile): number {
    const { maxSpin, curvatureSensitivity } = this.config
    return Math.sign(profile.endDirection.x) * profile.curvature * maxSpin * curvatureSensitivity
  }

  /** Internal: ratio of effectiveSpeed to peakSpeed. 1 = released at peak.
   *  Lower = player decelerated before releasing (wobbly shot). */
  private computeReleaseQuality(profile: VelocityProfile): number {
    if (profile.peakSpeed < 1) return 1
    return Math.max(0, Math.min(1, profile.effectiveSpeed / profile.peakSpeed))
  }

  /** Internal: how confident we are this is a real throw vs. accidental
   *  tap. Combines duration and speed. */
  private computeConfidence(profile: VelocityProfile): number {
    const { confidentDuration, hardThrowSpeed } = this.config
    const durFactor = Math.min(1, profile.duration / confidentDuration)
    const speedFactor = Math.min(1, profile.effectiveSpeed / hardThrowSpeed)
    return Math.max(0, Math.min(1, durFactor * speedFactor))
  }
}