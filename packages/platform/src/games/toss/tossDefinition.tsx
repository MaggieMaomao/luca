// Toss — the Game object (assembles the pure logic from toss.ts with a HUD +
// procedural sounds). Same Game contract as the 3D hoops game → proves the
// engine's renderer-agnostic core (this one is 2D / canvas2d).

import { tone, whoosh, type Game, type HudProps } from '@luca-game/engine/action'
import {
  initToss, mapToss, applyToss, stepToss, outcomeToss, drawToss,
  type TossState, type Launch, type TossEvent,
} from './toss'

export const tossGame: Game<TossState, Launch, TossEvent> = {
  meta: {
    id: 'toss',
    title: 'Toss',
    description: 'Flick the ball into the bin.',
    renderer: 'canvas2d',
    hint: 'Flick the ball toward the bin — angle + strength decide where it lands.',
  },
  init: initToss,
  mapGesture: mapToss,
  apply: applyToss,
  step: stepToss,
  outcome: outcomeToss,
  draw: drawToss,
  Hud: TossHud,
  sounds: {
    toss: (a) => whoosh(a, 1500, 500, 0.4, 0.12),
    score: (a) => { tone(a, 660, 'sine', 0.3, 0.16); tone({ ...a, t: a.t + 0.08 }, 990, 'sine', 0.3, 0.18) },
    miss: (a) => tone(a, 120, 'sine', 0.28, 0.12),
  },
}

function TossHud({ state, session, bests }: HudProps<TossState, Launch>) {
  const acc = session.plays > 0 ? Math.round((session.wins / session.plays) * 100) : null
  return (
    <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', gap: 14, padding: '6px 12px', borderRadius: 10, background: 'rgba(10,12,20,0.6)', color: '#fff', font: '700 0.95rem system-ui', pointerEvents: 'none' }}>
      <span>SCORE {session.score}</span>
      <span>COMBO {session.combo}</span>
      <span>ACC {acc === null ? '—' : acc + '%'}</span>
      <span>BEST {bests.bestScore}</span>
      {state.phase === 'resolved' && (
        <span style={{ color: state.won ? '#7ddc7d' : '#e88' }}>{state.won ? '✓ In!' : 'Miss'}</span>
      )}
    </div>
  )
}
