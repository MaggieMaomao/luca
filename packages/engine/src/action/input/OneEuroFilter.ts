// OneEuroFilter — adaptive low-pass filter (Casiez et al. CHI 2012).
//
// Ported verbatim from luca @luca-game/engine realtime/input/OneEuroFilter.ts.
// Adaptive cutoff: smooth at slow speeds, responsive at fast speeds.
//   minCutoff: smoothness at zero velocity (lower = more smoothing).
//   beta:      responsiveness at high speeds (higher = more responsive).

/** Low-pass filter with adaptive cutoff. */
class LowPassFilter {
  private lastValue: number | null = null
  private lastT = 0

  filter(x: number, t: number, cutoff: number): number {
    if (this.lastValue === null) {
      this.lastValue = x
      this.lastT = t
      return x
    }
    const dt = Math.max(0.001, t - this.lastT)
    const rc = 1 / (2 * Math.PI * cutoff)
    const a = dt / (rc + dt)
    const result = this.lastValue + a * (x - this.lastValue)
    this.lastValue = result
    this.lastT = t
    return result
  }
}

/** The 1-Euro filter. Smooths raw pointer samples before velocity is derived. */
export class OneEuroFilter {
  private xf = new LowPassFilter()
  private xdf = new LowPassFilter()
  private yf = new LowPassFilter()
  private ydf = new LowPassFilter()
  private lastX = 0
  private lastY = 0
  private lastT = 0

  minCutoff: number
  beta: number
  dCutoff: number
  constructor(minCutoff: number = 1.0, beta: number = 0.007, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff
    this.beta = beta
    this.dCutoff = dCutoff
  }

  /** Filter a single (x, y) sample at time t (seconds). */
  filter(x: number, y: number, t: number): { x: number; y: number } {
    if (this.lastT === 0) {
      this.lastX = x
      this.lastY = y
      this.lastT = t
      return { x, y }
    }
    const dt = Math.max(0.001, t - this.lastT)
    const dx = (x - this.lastX) / dt
    const dy = (y - this.lastY) / dt
    const edx = this.xdf.filter(dx, t, this.dCutoff)
    const edy = this.ydf.filter(dy, t, this.dCutoff)
    const cutoffX = this.minCutoff + this.beta * Math.abs(edx)
    const cutoffY = this.minCutoff + this.beta * Math.abs(edy)
    const fx = this.xf.filter(x, t, cutoffX)
    const fy = this.yf.filter(y, t, cutoffY)
    this.lastX = fx
    this.lastY = fy
    this.lastT = t
    return { x: fx, y: fy }
  }

  /** Reset the filter's internal state. */
  reset(): void {
    this.xf = new LowPassFilter()
    this.xdf = new LowPassFilter()
    this.yf = new LowPassFilter()
    this.ydf = new LowPassFilter()
    this.lastX = 0
    this.lastY = 0
    this.lastT = 0
  }
}
