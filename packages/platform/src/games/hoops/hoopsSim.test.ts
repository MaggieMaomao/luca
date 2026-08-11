// Hoops-on-engine logic tests — run: node --experimental-strip-types hoopsSim.test.ts
import { initHoops, applyHoops, stepHoops, outcomeHoops, getBallPos, type HoopsState, type HoopsEvent } from './hoopsSim.ts'
import type { ThrowIntent } from '@luca-game/engine/action/input'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m) } }

const intent = (power: number, y = 1): ThrowIntent => ({ direction: { x: 0, y, z: 0 }, power, spin: 0, releaseQuality: 1, confidence: 1 })

function runShot(ti: ThrowIntent) {
  const ev: HoopsEvent[] = []
  let s = initHoops()
  s = applyHoops(s, { kind: 'shoot', throw: ti }, e => ev.push(e))
  const afterShoot = s
  let prev = s, guard = 0
  let oc = null as ReturnType<typeof outcomeHoops>
  while (s.status !== 'resolved' && s.status !== 'over' && guard++ < 3000) {
    prev = s
    s = stepHoops(s, 1 / 120, e => ev.push(e))
    const o = outcomeHoops(s, prev)
    if (o) oc = o
  }
  return { s, ev, oc, afterShoot }
}

// apply(shoot) → shooting + telemetry + 'shoot'
{
  const { afterShoot, ev } = runShot(intent(15))
  ok(afterShoot.status === 'shooting', 'shoot → shooting')
  ok(afterShoot.lastShot !== null && afterShoot.lastShot!.strengthPct === 50, `telemetry strength ${afterShoot.lastShot?.strengthPct} (expect 50)`)
  ok(ev[0] === 'shoot', 'first event is shoot')
}

// full lifecycle resolves, mid-strength straight shot scores
{
  const { s, ev, oc } = runShot(intent(15))
  ok(s.status === 'resolved', `resolves (status ${s.status})`)
  ok(oc !== null && oc.won === true && oc.points >= 2, `mid shot scores (won ${oc?.won}, pts ${oc?.points})`)
  ok(ev.includes('swish') || ev.includes('make'), `emits make/swish (${ev.filter(e => e === 'swish' || e === 'make')})`)
}

// weak throw falls short → miss, no score
{
  const { s, oc } = runShot(intent(6))
  ok(s.status === 'resolved', 'weak shot resolves')
  ok(oc !== null && oc.won === false, `weak shot misses (won ${oc?.won})`)
}

// setSpot resets to ready with the new spot
{
  let s: HoopsState = initHoops()
  const spot2 = { id: 'top', label: 'Top 3', launch: { x: 0, y: 2.05, z: 1.2 } }
  s = applyHoops(s, { kind: 'setSpot', spot: spot2 }, () => {})
  ok(s.status === 'ready' && s.spot.id === 'top', 'setSpot switches + resets')
}

// getBallPos: at ready = the held (set) position; after shoot it moves
{
  const s = initHoops()
  const p = getBallPos(s)
  ok(p.y < s.spot.launch.y, 'ball held below release at ready')
}

// determinism
{
  const a = runShot(intent(15)).s.result?.outcome
  const b = runShot(intent(15)).s.result?.outcome
  ok(a === b && a !== undefined, `deterministic outcome (${a})`)
}

console.log(`RESULT: ${pass} passed, ${fail} failed`)
