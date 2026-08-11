// Engine audio — procedural Web Audio synth (no asset files).
//
// Games declare `sounds` as a map of event → SoundCue. A cue is a small
// function that schedules oscillators/noise on a shared AudioContext, built
// with the helper primitives below (tone, whoosh). The AudioContext is created
// lazily on the first cue (which always follows a user gesture, satisfying
// autoplay policy). This is the generalized version of the hoops sound synth.

export interface SoundCtx {
  c: AudioContext
  out: AudioNode
  /** Schedule start time (ctx.currentTime). */
  t: number
}

/** A sound cue schedules a short sound at `s.t`. */
export type SoundCue = (s: SoundCtx) => void

// ── primitives ───────────────────────────────────────────────────────────────
function envGain(s: SoundCtx, peak: number, attack: number, decay: number): GainNode {
  const g = s.c.createGain()
  g.gain.setValueAtTime(0.0001, s.t)
  g.gain.linearRampToValueAtTime(peak, s.t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, s.t + attack + decay)
  return g
}

/** A pitched tone with a quick attack + exponential decay. */
export function tone(s: SoundCtx, freq: number, type: OscillatorType, peak: number, decay: number): void {
  const o = s.c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, s.t)
  const g = envGain(s, peak, 0.004, decay); o.connect(g); g.connect(s.out)
  o.start(s.t); o.stop(s.t + decay + 0.05)
}

/** A filtered-noise "whoosh" sweeping bandpass f0→f1. */
export function whoosh(s: SoundCtx, f0: number, f1: number, peak: number, dur: number): void {
  const n = Math.max(1, Math.floor(s.c.sampleRate * (dur + 0.05)))
  const buf = s.c.createBuffer(1, n, s.c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  const src = s.c.createBufferSource(); src.buffer = buf
  const bp = s.c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2
  bp.frequency.setValueAtTime(f0, s.t); bp.frequency.exponentialRampToValueAtTime(Math.max(60, f1), s.t + dur)
  const g = envGain(s, peak, 0.01, dur)
  src.connect(bp); bp.connect(g); g.connect(s.out); src.start(s.t); src.stop(s.t + dur + 0.05)
}

// ── player ───────────────────────────────────────────────────────────────────
export interface SoundPlayer {
  play(cue: SoundCue | undefined): void
  setMuted(m: boolean): void
}

/** Lazily-initialised player with a shared master gain. */
export function makeSoundPlayer(masterVolume = 0.35): SoundPlayer {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let muted = false

  const ensure = (): SoundCtx | null => {
    if (typeof window === 'undefined') return null
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    if (!master) { master = ctx.createGain(); master.gain.value = masterVolume; master.connect(ctx.destination) }
    return { c: ctx, out: master, t: ctx.currentTime }
  }

  return {
    play(cue) {
      if (muted || !cue) return
      const s = ensure(); if (s) cue(s)
    },
    setMuted(m) { muted = m },
  }
}
