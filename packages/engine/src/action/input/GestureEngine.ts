// GestureEngine — classifies pointer samples as tap / swipe / cancel.
//
// Ported from luca @luca-game/engine realtime/input/GestureEngine.ts.
// Stateless: buildGesture returns a fresh Gesture from a sample sequence.

import type { PointerSample, Gesture } from './types'

/** Gesture classification thresholds. */
export interface GestureEngineConfig {
  /** Below this duration (seconds), a gesture is a tap. */
  tapDurationMax: number       // default 0.08
  /** Below this displacement (CSS pixels), a gesture is a tap. */
  tapDisplacementMax: number    // default 30
  /** Above this duration (seconds), a gesture is cancelled. */
  cancelDurationMax: number     // default 0.8
  /** Below this peak velocity (px/s), a gesture is cancelled. */
  cancelVelocityMin: number     // default 100
}

export const defaultGestureEngineConfig: GestureEngineConfig = {
  tapDurationMax: 0.08,
  tapDisplacementMax: 30,
  cancelDurationMax: 0.8,
  cancelVelocityMin: 100,
}

export class GestureEngine {
  private config: GestureEngineConfig
  constructor(config: GestureEngineConfig = defaultGestureEngineConfig) {
    this.config = config
  }

  /** Classify a sequence of pointer samples into a Gesture. */
  buildGesture(samples: PointerSample[]): Gesture {
    if (samples.length === 0) {
      return { type: 'cancel', samples: [], startT: 0, endT: 0, displacement: 0, duration: 0 }
    }
    const startT = samples[0].t
    const endT = samples[samples.length - 1].t
    const dx = samples[samples.length - 1].x - samples[0].x
    const dy = samples[samples.length - 1].y - samples[0].y
    const displacement = Math.sqrt(dx * dx + dy * dy)
    const duration = endT - startT
    const peakV = this.peakVelocity(samples)

    let type: Gesture['type']
    if (this.isTap(duration, displacement)) type = 'tap'
    else if (this.isCancel(duration, peakV)) type = 'cancel'
    else type = 'swipe'

    return { type, samples, startT, endT, displacement, duration }
  }

  /** Compute peak velocity (px/s) over the samples. */
  peakVelocity(samples: PointerSample[]): number {
    let maxV = 0
    for (let i = 1; i < samples.length; i++) {
      const dt = Math.max(0.001, samples[i].t - samples[i - 1].t)
      const dx = samples[i].x - samples[i - 1].x
      const dy = samples[i].y - samples[i - 1].y
      const v = Math.sqrt(dx * dx + dy * dy) / dt
      if (v > maxV) maxV = v
    }
    return maxV
  }

  /** Tap = short duration OR low displacement. */
  private isTap(duration: number, displacement: number): boolean {
    return duration < this.config.tapDurationMax || displacement < this.config.tapDisplacementMax
  }

  /** Cancel = long duration OR low velocity. */
  private isCancel(duration: number, peakVelocity: number): boolean {
    if (duration > this.config.cancelDurationMax) return true
    return peakVelocity < this.config.cancelVelocityMin
  }
}
