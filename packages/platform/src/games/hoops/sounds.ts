// Hoops sound cues — the original procedural hoops sounds, expressed as engine
// SoundCue functions (event → cue). The GameHost plays these on bus events.

import { tone, whoosh, type SoundCue } from '@luca-game/engine/action'
import type { HoopsEvent } from './hoopsSim'

export const hoopsSounds: Partial<Record<HoopsEvent, SoundCue>> = {
  shoot: (a) => whoosh(a, 1600, 500, 0.5, 0.14),
  'hit-rim': (a) => {
    tone(a, 540, 'square', 0.35, 0.12)
    tone(a, 820, 'triangle', 0.28, 0.1)
    whoosh(a, 2600, 1200, 0.25, 0.05)
  },
  'hit-backboard': (a) => { tone(a, 140, 'sine', 0.6, 0.18); whoosh(a, 500, 200, 0.3, 0.09) },
  bounce: (a) => tone(a, 95, 'sine', 0.5, 0.16),
  swish: (a) => whoosh(a, 3200, 700, 0.5, 0.28),
  make: (a) => {
    whoosh(a, 3200, 700, 0.45, 0.26)
    tone({ ...a, t: a.t + 0.05 }, 660, 'sine', 0.3, 0.18)
    tone({ ...a, t: a.t + 0.13 }, 990, 'sine', 0.3, 0.2)
  },
  miss: (a) => tone(a, 120, 'sine', 0.28, 0.12),
}
