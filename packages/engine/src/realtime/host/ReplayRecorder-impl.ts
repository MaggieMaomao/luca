// @luca-game/engine — Replay recorder (basic implementation).
//
// Phase 6.5 MVP. The recorder captures the input timeline +
// physics state per tick so a shot can be replayed deterministically.
//
// Per the MVP build plan: in-memory only. Future iteration can add
// IndexedDB persistence.

import type { PointerSample } from '../input/PointerSampler'
import type { RealTimeInput } from '../contracts'

/** One tick's worth of recorded state. */
export interface ReplayFrame {
  index: number
  /** Seconds since recording started. */
  t: number
  /** Tick duration in seconds (always 1/tickRate for deterministic). */
  dt: number
  /** Input snapshot at this frame. */
  input: RealTimeInput
  /** Raw pointer samples since the last frame. */
  pointerSamples?: PointerSample[]
  /** RNG state. The physics adapter records this each frame for
   *  deterministic re-run with Rapier. Matter doesn't expose RNG
   *  state, so this is optional in the MVP. */
  rngState?: number
}

/** A complete replay: a header + ordered frames. */
export interface ReplayData {
  version: string
  recordedAt: string             // ISO timestamp
  duration: number              // seconds
  frameCount: number
  tickRate: number
  frames: ReplayFrame[]
}

/** Engine-level replay handle. */
export interface ReplayHandle {
  isRecording: boolean
  isPlaying: boolean
  recordedFrames: number
  totalFrames: number
  currentFrame: number

  /** Start recording (no-op if already recording). */
  startRecording(): void
  /** Stop recording (returns the captured data). */
  stopRecording(): ReplayData

  /** Play a recorded replay. Pauses real-time updates. */
  play(data: ReplayData, options?: { speed?: number; fromFrame?: number }): void
  pause(): void
  stop(): void
  seek(frame: number): void

  /** Export the current recording as a JSON string (for sharing). */
  export(): string
  /** Re-import a shared replay. */
  import(data: string): ReplayData

  /** Subscribe to replay events (e.g. for the renderer). */
  onFrame(cb: (frame: ReplayFrame) => void): () => void
}

/** Default replay implementation. Records in-memory. */
export class ReplayRecorder implements ReplayHandle {
  private recording = false
  private playing = false
  private frames: ReplayFrame[] = []
  private startT = 0
  private currentFrameIdx = 0
  private totalFramesCount = 0
  private tickRate = 120
  private subscribers: Set<(frame: ReplayFrame) => void> = new Set()
  private currentInput: RealTimeInput | undefined = undefined
  private currentPointerSamples: PointerSample[] | undefined = undefined

  /** Wire up to the engine. Call this from useRealTimeController
   *  with the active input. */
  setInput(input: RealTimeInput): void {
    this.currentInput = input
  }

  setPointerSamples(samples: PointerSample[]): void {
    this.currentPointerSamples = samples
  }

  setTickRate(rate: number): void {
    this.tickRate = rate
  }

  // ── ReplayHandle interface ──────────────────────────────────────────

  get isRecording(): boolean { return this.recording }
  get isPlaying(): boolean { return this.playing }
  get recordedFrames(): number { return this.frames.length }
  get totalFrames(): number { return this.totalFramesCount }
  get currentFrame(): number { return this.currentFrameIdx }

  startRecording(): void {
    if (this.recording) return
    this.recording = true
    this.frames = []
    this.startT = performance.now() / 1000
  }

  stopRecording(): ReplayData {
    this.recording = false
    const data: ReplayData = {
      version: '1.0.0',
      recordedAt: new Date().toISOString(),
      duration: this.frames.length / this.tickRate,
      frameCount: this.frames.length,
      tickRate: this.tickRate,
      frames: this.frames.slice(),
    }
    return data
  }

  /** Called by the engine every tick. */
  recordTick(t: number, dt: number): void {
    if (!this.recording) return
    this.frames.push({
      index: this.frames.length,
      t,
      dt,
      input: this.currentInput ?? {} as RealTimeInput,
      pointerSamples: this.currentPointerSamples,
    })
  }

  play(data: ReplayData, options?: { speed?: number; fromFrame?: number }): void {
    this.playing = true
    this.frames = data.frames
    this.totalFramesCount = data.frames.length
    this.currentFrameIdx = options?.fromFrame ?? 0
    // Actual playback is handled by the engine — this is just the
    // state. The engine reads frames in sequence and feeds them
    // to the game's update().
    const speed = options?.speed ?? 1.0
    const interval = (1000 / data.tickRate) / speed
    const playNext = () => {
      if (!this.playing) return
      if (this.currentFrameIdx >= this.totalFramesCount) {
        this.stop()
        return
      }
      const frame = this.frames[this.currentFrameIdx]
      this.subscribers.forEach(cb => cb(frame))
      this.currentFrameIdx += 1
      setTimeout(playNext, interval)
    }
    playNext()
  }

  pause(): void {
    this.playing = false
  }

  stop(): void {
    this.playing = false
    this.currentFrameIdx = 0
  }

  seek(frame: number): void {
    this.currentFrameIdx = Math.max(0, Math.min(frame, this.totalFramesCount))
  }

  export(): string {
    return JSON.stringify(this.stopRecording())
  }

  import(data: string): ReplayData {
    return JSON.parse(data) as ReplayData
  }

  onFrame(cb: (frame: ReplayFrame) => void): () => void {
    this.subscribers.add(cb)
    return () => { this.subscribers.delete(cb) }
  }
}