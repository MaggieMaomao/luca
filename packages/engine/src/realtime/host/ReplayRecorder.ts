// @luca-game/engine — Replay system.
//
// Every real-time game has a replay recorder. The recorder captures
// the input timeline + physics state per tick so a shot can be
// replayed deterministically.
//
// For the MVP, recording is in-memory only. A future iteration can
// add IndexedDB persistence.

import type { PointerSample } from '../input/PointerSampler'
import type { RealTimeInput } from '../contracts'

// ── Replay frame ──────────────────────────────────────────────────────────

/** One tick's worth of recorded state. */
export interface ReplayFrame {
  index: number
  /** Seconds since recording started. */
  t: number
  /** Tick duration in seconds (always 1/tickRate for deterministic). */
  dt: number
  /** Input snapshot at this frame. */
  input: RealTimeInput
  /** Raw pointer samples since the last frame (for high-fidelity
   *  gesture reconstruction). */
  pointerSamples?: PointerSample[]
  /** RNG state. The physics adapter records this each frame for
   *  deterministic re-run with Rapier. */
  rngState?: number
}

// ── Replay handle ────────────────────────────────────────────────────────

export interface ReplayHandle {
  /** Whether a recording is currently active. */
  isRecording: boolean
  /** Frames recorded so far (live count). */
  recordedFrames: number

  /** Pause real-time updates and start a replay playback. */
  play: (options?: { speed?: number; fromFrame?: number }) => void
  pause: () => void
  stop: () => void
  /** Jump to a specific frame. */
  seek: (frame: number) => void
  /** Export the replay as a compact JSON (for sharing). */
  export: () => Promise<string>
  /** Re-import a shared replay. */
  import: (data: string) => void

  /** Current playback state. */
  isPlaying: boolean
  currentFrame: number
  totalFrames: number
}
