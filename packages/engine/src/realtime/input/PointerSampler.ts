// @luca-game/engine — Pointer / gesture primitives.
//
// The lowest layer of the input pipeline. Emits raw `PointerSample`s
// from a DOM element. Stateless — the smoother handles all temporal
// work.
//
// This file also defines the core data types (PointerSample, Gesture,
// ThrowIntent) that flow through the rest of the engine. The basket
// ball game and any future real-time game consume `ThrowIntent`.

// ── Pointer sample ─────────────────────────────────────────────────────────

/** A single pointer event captured by PointerSampler. */
export interface PointerSample {
  /** Wall-clock time in seconds (from performance.now() / 1000). */
  t: number
  /** Position in CSS pixels (not device pixels). */
  x: number
  y: number
  /** Optional pressure (0-1). 0.5 on devices that don't support it. */
  pressure: number
  /** Pointer id (for multi-touch, future). */
  id: number
}

// ── Gesture ────────────────────────────────────────────────────────────────

export type GestureType = 'tap' | 'swipe' | 'cancel' | 'in-progress'

/** A gesture is a sequence of samples from pointerdown to pointerup. */
export interface Gesture {
  type: GestureType
  samples: PointerSample[]
  startT: number
  endT: number
  /** Straight-line distance from start to end. */
  displacement: number
  /** Time span of the gesture in seconds. */
  duration: number
}

// ── ThrowIntent ───────────────────────────────────────────────────────────

/** Vector3 with numeric components. Kept as a plain object so this
 *  module has no runtime dependencies (PixiJS or Three.js can be
 *  passed a Vec3 if needed, and the engine itself doesn't import
 *  any 3D math library). */
export interface Vector3 {
  x: number
  y: number
  z: number
}

/** The engine's core sports contract. Produced by ThrowSystem,
 *  consumed by the game. */
export interface ThrowIntent {
  /** Direction of throw, normalized Vector3 in world space. */
  direction: Vector3
  /** Power in m/s. The physics adapter maps to its own units. */
  power: number
  /** Spin in rad/s around the direction axis. 0 = no spin. */
  spin: number
  /** 0–1; how clean the release was. 1 = perfect. Lower = more
   *  rim randomness. */
  releaseQuality: number
  /** 0–1; how confident the gesture engine is this is a real
   *  throw (vs. accidental tap). The game may scale power by this. */
  confidence: number
}

// ── PointerSampler class ────────────────────────────────────────────────

/** Callback fired on every pointer event. */
export type PointerSampleCallback = (sample: PointerSample) => void

/** Callback fired when a pointer-down-then-up sequence completes. */
export type GestureEndCallback = (samples: PointerSample[]) => void

/** PointerSampler options. */
export interface PointerSamplerOptions {
  /** Element to attach to. */
  element: HTMLElement
  /** Called for every sample. */
  onSample: PointerSampleCallback
  /** Called when a gesture ends (pointerup/cancel/leave). Provides
   *  the full sequence of samples for the current gesture. */
  onGestureEnd?: GestureEndCallback
  /** Optional: called when a new gesture starts (pointerdown). */
  onGestureStart?: () => void
}

/** The engine's pointer sampler. Sports-agnostic. Listens to pointer
 *  events on any HTMLElement (typically the canvas) and emits raw
 *  PointerSamples via callback. The sampler is STATELESS — smoothing
 *  is done by OneEuroFilter (separately).
 *
 *  Per the vertical-slice loop, this was game-local in Phase 6.3.
 *  It graduates to the engine because every real-time game that uses
 *  swipe input needs it. */
export class PointerSampler {
  private samples: PointerSample[] = []
  private isDown = false
  private opts: PointerSamplerOptions

  constructor(opts: PointerSamplerOptions) {
    this.opts = opts
    this.attach()
  }

  /** Attach the event listeners. Called automatically by the constructor. */
  private attach(): void {
    const el = this.opts.element
    el.addEventListener('pointerdown', this.onDown as EventListener, { passive: true })
    el.addEventListener('pointermove', this.onMove as EventListener, { passive: true })
    el.addEventListener('pointerup', this.onEnd as EventListener, { passive: true })
    el.addEventListener('pointercancel', this.onEnd as EventListener, { passive: true })
    el.addEventListener('pointerleave', this.onEnd as EventListener, { passive: true })
  }

  /** Detach all event listeners. Call this on unmount. */
  detach(): void {
    const el = this.opts.element
    el.removeEventListener('pointerdown', this.onDown as EventListener)
    el.removeEventListener('pointermove', this.onMove as EventListener)
    el.removeEventListener('pointerup', this.onEnd as EventListener)
    el.removeEventListener('pointercancel', this.onEnd as EventListener)
    el.removeEventListener('pointerleave', this.onEnd as EventListener)
  }

  private onDown = (e: PointerEvent): void => {
    this.samples = []
    this.isDown = true
    this.opts.onGestureStart?.()
    const s = this.toSample(e)
    this.samples.push(s)
    this.opts.onSample(s)
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.isDown) return
    const s = this.toSample(e)
    this.samples.push(s)
    this.opts.onSample(s)
  }

  private onEnd = (_e: PointerEvent): void => {
    if (!this.isDown) return
    this.isDown = false
    this.opts.onGestureEnd?.(this.samples.slice())
  }

  private toSample(e: PointerEvent): PointerSample {
    return {
      t: e.timeStamp / 1000,
      x: e.clientX,
      y: e.clientY,
      pressure: e.pressure || 0.5,
      id: e.pointerId,
    }
  }

  /** Reset the sampler (drops the current gesture). */
  reset(): void {
    this.samples = []
    this.isDown = false
  }

  /** Read-only: current samples (for the active gesture, if any). */
  getSamples(): PointerSample[] {
    return this.samples.slice()
  }
}
