// Engine core — deterministic fixed-step loop (pure, renderer-agnostic).
//
// Feed it real elapsed time each frame; it advances the simulation by a whole
// number of FIXED dt's (so physics is frame-rate independent and reproducible),
// capped so a long stall can't spiral. Rendering interpolation is left to the
// host (it can read `alpha`).

export interface FixedLoop {
  /** Advance by `frameSeconds` of real time; runs `step(fixedDt)` 0..maxSteps times. */
  advance(frameSeconds: number): void
  /** Fractional progress toward the next step (0..1) — for render interpolation. */
  readonly alpha: number
  reset(): void
}

export function fixedLoop(fixedDt: number, step: (dt: number) => void, maxSteps = 8): FixedLoop {
  let acc = 0
  return {
    advance(frameSeconds: number) {
      acc += frameSeconds
      let n = 0
      while (acc >= fixedDt && n < maxSteps) {
        step(fixedDt)
        acc -= fixedDt
        n++
      }
      if (n === maxSteps) acc = 0 // shed backlog after a stall
    },
    get alpha() { return acc / fixedDt },
    reset() { acc = 0 },
  }
}
