// @luca-game/engine — OneEuroFilter (adaptive low-pass filter).
//
// The standard interactive-graphics low-pass filter (Casiez et al.
// CHI 2012). Adaptive cutoff: low at slow speeds (smooth) and high
// at fast speeds (responsive). Two intuitive parameters:
//
//   minCutoff: smoothness at zero velocity. Lower = more smoothing.
//              Default 1.0 Hz. Range: 0.1 to 10.
//   beta:      responsiveness at high speeds. Higher = more responsive.
//              Default 0.007. Range: 0 to 0.5.
//
// The dCutoff parameter (cutoff for the derivative / rate of change)
// is fixed at 1.0 Hz in the original paper; games rarely need to
// change it.

/** Low-pass filter with adaptive cutoff. */
class LowPassFilter {
  private lastValue: number | null = null
  private lastT = 0
  constructor(private alpha: number) {}

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

/** The 1-Euro filter. Used by GestureEngine to smooth raw pointer
 *  samples before computing velocity. */
export class OneEuroFilter {
  private xf = new LowPassFilter(1)
  private xdf = new LowPassFilter(1)
  private yf = new LowPassFilter(1)
  private ydf = new LowPassFilter(1)
  private lastX = 0
  private lastY = 0
  private lastT = 0

  constructor(
    public minCutoff: number = 1.0,
    public beta: number = 0.007,
    public dCutoff: number = 1.0,
  ) {}

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
    const edy = this.xdf.filter(dy, t, this.dCutoff)
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
    this.xf = new LowPassFilter(1)
    this.xdf = new LowPassFilter(1)
    this.yf = new LowPassFilter(1)
    this.ydf = new LowPassFilter(1)
    this.lastX = 0
    this.lastY = 0
    this.lastT = 0
  }
}