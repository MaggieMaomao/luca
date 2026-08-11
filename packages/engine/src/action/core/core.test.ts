// Engine core tests — run: node --experimental-strip-types core.test.ts
import { fixedLoop } from './loop.ts'
import { applyOutcome, emptySession, accuracy } from './session.ts'
import { EventBus } from './events.ts'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m) } }

// fixedLoop: 0.05s at dt 1/60 → 3 steps, remainder in alpha
let steps = 0
const loop = fixedLoop(1 / 60, () => steps++)
loop.advance(0.05)
ok(steps === 3, `fixedLoop ran ${steps} steps (expect 3)`)
ok(Math.abs(loop.alpha - (0.05 - 3 / 60) / (1 / 60)) < 1e-6, 'alpha remainder')

// maxSteps cap sheds a stall
steps = 0
fixedLoop(1 / 60, () => steps++, 8).advance(10)
ok(steps === 8, `capped at ${steps} steps (expect 8)`)

// session scoring + combo bonus
let s = emptySession
s = applyOutcome(s, { points: 3, won: true, comboBonus: true, label: 'swish' })
ok(s.score === 3 && s.combo === 1 && s.wins === 1, 'first win: no bonus at combo 1')
s = applyOutcome(s, { points: 2, won: true, comboBonus: true, label: 'make' })
ok(s.combo === 2 && s.score === 7, `combo 2 adds +2 bonus → score ${s.score} (expect 7)`)
s = applyOutcome(s, { points: 0, won: false, label: 'miss' })
ok(s.combo === 0 && s.plays === 3, 'miss resets combo')
ok(accuracy(s) === 67, `accuracy ${accuracy(s)}% (expect 67)`)
ok(s.bestCombo === 2, 'bestCombo retained')

// event bus subscribe/emit/unsub
const bus = new EventBus<string>()
let got = ''
const off = bus.on(e => { got = e }); bus.emit('x'); off(); bus.emit('y')
ok(got === 'x', 'unsubscribe stops delivery')

console.log(`RESULT: ${pass} passed, ${fail} failed`)
