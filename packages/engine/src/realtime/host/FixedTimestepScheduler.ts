// @luca-game/engine — Fixed-timestep scheduler.
//
// Real-time games tick at a fixed rate (e.g. 120Hz physics) regardless
// of the render rate. The scheduler runs `update(dt)` on a fixed
// cadence and `draw()` on a separate (usually 60Hz) cadence.
//
// The two are decoupled so a slow render doesn't slow the physics.

/** Per-tick callback. */
export type TickCallback = (dt: number) => void

/** Per-render-frame callback. */
export type RenderCallback = (alpha: number) => void

/** Status of the scheduler. */
export type SchedulerStatus = 'idle' | 'running' | 'paused'

/**
 * Drives a fixed-timestep physics loop + a variable-render loop.
 *
 * Usage:
 *   const sched = new FixedTimestepScheduler({ tickRate: 120, renderRate: 60 })
 *   sched.onTick(state => physics.step(dt))
 *   sched.onRender(alpha => renderer.draw(state, alpha))
 *   sched.start()
 *
 * The "alpha" passed to render callbacks is the interpolation factor
 * (0..1) between the previous tick and the current tick. Games can
 * use it to interpolate positions for smooth visual playback. For
 * MVP, alpha=1 is fine (just render the latest state).
 */
export class FixedTimestepScheduler {
  private status: SchedulerStatus = 'idle'
  private tickRate: number
  private renderRate: number
  private tickCallbacks: TickCallback[] = []
  private renderCallbacks: RenderCallback[] = []
  private rafId: number | null = null
  private lastFrameTime = 0
  /** Accumulated time since last tick. */
  private accumulator = 0
  /** Total ticks elapsed (monotonic). */
  private tickCount = 0
  /** Total seconds elapsed since start. */
  private elapsedSeconds = 0

  constructor(opts: { tickRate?: number; renderRate?: number } = {}) {
    this.tickRate = opts.tickRate ?? 120
    this.renderRate = opts.renderRate ?? 60
  }

  /** Register a per-tick callback. */
  onTick(cb: TickCallback): () => void {
    this.tickCallbacks.push(cb)
    return () => {
      this.tickCallbacks = this.tickCallbacks.filter(c => c !== cb)
    }
  }

  /** Register a per-render-frame callback. */
  onRender(cb: RenderCallback): () => void {
    this.renderCallbacks.push(cb)
    return () => {
      this.renderCallbacks = this.renderCallbacks.filter(c => c !== cb)
    }
  }

  /** Start the scheduler. Idempotent. */
  start(): void {
    if (this.status === 'running') return
    this.status = 'running'
    this.lastFrameTime = performance.now() / 1000
    this.accumulator = 0
    this.tickCount = 0
    this.elapsedSeconds = 0
    this.tickLoop()
  }

  /** Pause. Tick callbacks are skipped but the loop is alive. */
  pause(): void {
    this.status = 'paused'
  }

  /** Resume from pause. */
  resume(): void {
    if (this.status !== 'paused') return
    this.status = 'running'
    this.lastFrameTime = performance.now() / 1000
  }

  /** Stop completely. */
  stop(): void {
    this.status = 'idle'
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /** Read-only accessors. */
  getStatus(): SchedulerStatus { return this.status }
  getTickCount(): number { return this.tickCount }
  getElapsedSeconds(): number { return this.elapsedSeconds }
  getTickRate(): number { return this.tickRate }

  /**
   * The main loop. Uses requestAnimationFrame for the render cadence
   * and an accumulator for the fixed physics timestep. This is the
   * "Glenn Fiedler" pattern (deterministic physics + variable render).
   */
  private tickLoop = (): void => {
    if (this.status === 'idle') return
    const now = performance.now() / 1000
    const frameDt = now - this.lastFrameTime
    this.lastFrameTime = now

    if (this.status === 'running') {
      this.accumulator += frameDt
      const tickDuration = 1 / this.tickRate

      // Run as many fixed-timestep ticks as fit in the elapsed time.
      // Cap at 5 ticks per frame to prevent the spiral of death.
      let ticksThisFrame = 0
      while (this.accumulator >= tickDuration && ticksThisFrame < 5) {
        for (const cb of this.tickCallbacks) {
          cb(tickDuration)
        }
        this.accumulator -= tickDuration
        this.elapsedSeconds += tickDuration
        this.tickCount += 1
        ticksThisFrame += 1
      }
      // Drop excess accumulator if we hit the cap (game is running
      // too slow; this prevents a death spiral where we keep trying
      // to catch up forever).
      if (ticksThisFrame >= 5) this.accumulator = 0
    }

    // Render once per animation frame, regardless of tick state.
    // alpha=1 for now (no interpolation); can be extended later.
    const alpha = 1
    for (const cb of this.renderCallbacks) {
      cb(alpha)
    }

    this.rafId = requestAnimationFrame(this.tickLoop)
  }
}
