// Toss sim tests — run: node --experimental-strip-types toss.test.ts
import { initToss, stepToss, applyToss, outcomeToss, type TossState, type TossEvent } from './toss.ts'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m) } }

const runToFloor = (vx: number, vy: number, target = { x: 0.5, w: 0.14 }) => {
  let s: TossState = { ...initToss(), target }
  const ev: TossEvent[] = []
  s = applyToss(s, { vx, vy }, e => ev.push(e))
  let prev = s, guard = 0
  while (s.phase === 'flight' && guard++ < 2000) { prev = s; s = stepToss(s, 1 / 120, e => ev.push(e)) }
  return { s, prev, ev }
}

// apply launches + emits toss
{
  const { s, ev } = runToFloor(0, 0.6)
  ok(ev.includes('toss'), 'apply emits toss')
  ok(s.phase === 'resolved', 'flight resolves')
}

// straight up (vx=0) lands at start x=0.5 = target centre → scored
{
  const { s, prev, ev } = runToFloor(0, 0.6)
  ok(s.won === true, `vx=0 lands in bin → won (${s.won})`)
  ok(ev.includes('score'), 'score event emitted')
  const oc = outcomeToss(s, prev)
  ok(oc !== null && oc.won && oc.points === 2, 'outcome: scored 2')
}

// large lateral → lands far from target → miss
{
  const { s, ev } = runToFloor(0.5, 0.6)
  ok(s.won === false, `vx large → miss (${s.won})`)
  ok(ev.includes('miss'), 'miss event emitted')
}

// outcome fires only on the resolve transition, not while ready/flight
{
  const s0 = initToss()
  ok(outcomeToss(s0, s0) === null, 'no outcome when idle')
}

// determinism
{
  const a = runToFloor(0.2, 0.55).s.ball.x
  const b = runToFloor(0.2, 0.55).s.ball.x
  ok(Math.abs(a - b) < 1e-9, `deterministic landing (${a} vs ${b})`)
}

console.log(`RESULT: ${pass} passed, ${fail} failed`)
