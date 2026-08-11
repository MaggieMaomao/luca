// ThrowSystem — turns a swipe gesture into a ThrowIntent.
//
// Ported from luca @luca-game/engine realtime/input/ThrowSystem.ts (the tuned
// "secret sauce"). Pipeline:
//   gesture → adaptive velocity window → direction (peak+end blend) →
//   power (non-linear) → spin (curvature) → releaseQuality → confidence.
//
// direction is a normalized 2D screen vector (y flipped so up = +y), z left 0.
// Mapping to 3D world space is the game's job (sim/shot.ts).

import type { PointerSample, Gesture, ThrowIntent, Vector3 } from './types'

export interface ThrowSystemConfig {
  minThrowSpeed: number       // px/s below which there's no shot
  hardThrowSpeed: number      // px/s at which we get max power
  maxPower: number            // output power (m/s)
  minPower: number
  powerCurveExp: number       // non-linear power ramp
  maxSpin: number             // rad/s
  curvatureSensitivity: number
  peakDirectionWeight: number // 1 = pure peak dir, 0 = pure end dir
  windowShort: number         // adaptive velocity window (s)
  windowMedium: number
  windowLong: number
  shortMax: number
  mediumMax: number
  confidentDuration: number
}

/** Default config, tuned in luca's basketball validation. Overridable per game. */
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

export class ThrowSystem {
  private config: ThrowSystemConfig
  constructor(config: ThrowSystemConfig = defaultThrowSystemConfig) {
    this.config = config
  }

  /** Convert a swipe gesture to a ThrowIntent, or null for tap/cancel. */
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

  /** Angle change start→end (0 = straight, 1 = 180° curve). */
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

  /** Blend peak + end direction, normalize. Screen y is flipped to world up. */
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
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len > 0.0001) {
      dx /= len
      dy /= len
    }
    return { x: dx, y: dy, z: 0 }
  }

  /** Map effective speed (px/s) to power in [minPower, maxPower]. */
  private computePower(profile: VelocityProfile): number {
    const { minThrowSpeed, hardThrowSpeed, maxPower, minPower, powerCurveExp } = this.config
    const ratio = (profile.effectiveSpeed - minThrowSpeed) / (hardThrowSpeed - minThrowSpeed)
    const clamped = Math.max(0, Math.min(1, ratio))
    const curved = Math.pow(clamped, powerCurveExp)
    return minPower + curved * (maxPower - minPower)
  }

  private computeSpin(profile: VelocityProfile): number {
    const { maxSpin, curvatureSensitivity } = this.config
    return Math.sign(profile.endDirection.x) * profile.curvature * maxSpin * curvatureSensitivity
  }

  private computeReleaseQuality(profile: VelocityProfile): number {
    if (profile.peakSpeed < 1) return 1
    return Math.max(0, Math.min(1, profile.effectiveSpeed / profile.peakSpeed))
  }

  private computeConfidence(profile: VelocityProfile): number {
    const { confidentDuration, hardThrowSpeed } = this.config
    const durFactor = Math.min(1, profile.duration / confidentDuration)
    const speedFactor = Math.min(1, profile.effectiveSpeed / hardThrowSpeed)
    return Math.max(0, Math.min(1, durFactor * speedFactor))
  }
}
