// FPS Hoops — sim + input tests. Run standalone:
//   node --experimental-strip-types src/basketball3d/sim/hoops.test.ts
// Prints "RESULT: X passed, Y failed".

import { ThrowSystem } from '@luca-game/engine/action/input'
import { GestureEngine } from '@luca-game/engine/action/input'
import type { PointerSample } from '@luca-game/engine/action/input'
import type { ThrowIntent } from '@luca-game/engine/action/input'
import { computeShot, idealSpeed } from './shot.ts'
import { simulateShot } from './ballPhysics.ts'
import { applyShot, initialScoreState } from './scoring.ts'
import { LAUNCH_POS } from './court.ts'
import { SPOTS } from './spots.ts'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  PASS  ${name}`) }
  catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${(e as Error).message}`) }
}
function ok(c: boolean, m: string) { if (!c) throw new Error(m) }

// Build a straight-up flick intent directly (bypass the gesture layer).
function upFlick(power: number, x = 0, releaseQuality = 1): ThrowIntent {
  return { direction: { x, y: 1, z: 0 }, power, spin: 0, releaseQuality, confidence: 1 }
}

// ── Shot mapping + physics ────────────────────────────────────────
test('mid-strength straight flick scores (make or swish)', () => {
  const shot = computeShot(upFlick(15))
  const { result } = simulateShot(shot.velocity, LAUNCH_POS)
  ok(result.scored, `mid flick should score, got ${result.outcome} (contacts ${result.contacts})`)
})

test('a clean centered flick can swish (bonus lane exists)', () => {
  // Somewhere in the natural mid-power range, a well-centered flick swishes.
  let sawSwish = false
  for (let power = 12; power <= 17; power += 0.5) {
    const { result } = simulateShot(computeShot(upFlick(power)).velocity, LAUNCH_POS)
    if (result.outcome === 'swish') { sawSwish = true; break }
  }
  ok(sawSwish, 'some centered mid flick should swish cleanly')
})

test('too-weak flick falls short (no score)', () => {
  const shot = computeShot(upFlick(5))
  const { result } = simulateShot(shot.velocity, LAUNCH_POS)
  ok(!result.scored, `weak flick should miss, got ${result.outcome}`)
  ok(result.outcome === 'short' || result.outcome === 'rim', `expected short/rim, got ${result.outcome}`)
})

test('too-hard flick does not swish', () => {
  const shot = computeShot(upFlick(25))
  const { result } = simulateShot(shot.velocity, LAUNCH_POS)
  ok(result.outcome !== 'swish', `max power should not swish cleanly, got ${result.outcome}`)
})

test('strong lateral flick pulls off-center but aim-assist keeps it near', () => {
  // Full-right flick at mid power: should not swish dead-clean, but assist
  // should keep it in the rim neighborhood (not an airball to the side).
  const shot = computeShot(upFlick(15, 1))
  ok(Math.abs(shot.yawDeg) < 8, `aim-assist should soften yaw, got ${shot.yawDeg.toFixed(1)}°`)
  const { result } = simulateShot(shot.velocity, LAUNCH_POS)
  ok(result.outcome !== 'airball', `assist should avoid an airball, got ${result.outcome}`)
})

test('ideal speed is sane for a free throw at 52°', () => {
  const elev = 52 * Math.PI / 180
  const s = idealSpeed(elev, 4.2, 1.5) // L≈4.2m, dy=1.5m
  ok(Number.isFinite(s) && s > 4 && s < 12, `ideal speed sane: ${s}`)
})

test('every spot is scorable with a well-judged flick', () => {
  // For each spot, some power in a wide range should score (make or swish).
  for (const spot of SPOTS) {
    let scored = false
    for (let power = 6; power <= 25 && !scored; power += 0.5) {
      const shot = computeShot(upFlick(power), spot.launch)
      if (simulateShot(shot.velocity, spot.launch).result.scored) scored = true
    }
    ok(scored, `spot "${spot.id}" should be scorable`)
  }
})

test('farther spots launch the ball faster (idealSpeed grows with distance)', () => {
  // The flick strength is distance-normalized (the engine computes the needed
  // speed), so what grows with distance is the actual launch SPEED.
  const speed = (id: string): number => {
    const launch = SPOTS.find(s => s.id === id)!.launch
    return computeShot(upFlick(15), launch).speed
  }
  ok(speed('three') > speed('ft') && speed('ft') > speed('close'),
    `speeds should increase with distance: close ${speed('close').toFixed(1)} < ft ${speed('ft').toFixed(1)} < three ${speed('three').toFixed(1)}`)
})

test('flight is deterministic (same v0 → same outcome + steps)', () => {
  const shot = computeShot(upFlick(15))
  const a = simulateShot(shot.velocity, LAUNCH_POS).result
  const b = simulateShot(shot.velocity, LAUNCH_POS).result
  ok(a.outcome === b.outcome && a.steps === b.steps, 'runs must match')
})

test('elevation rises with a steeper flick', () => {
  const flat = computeShot({ direction: { x: 0, y: 0.1, z: 0 }, power: 15, spin: 0, releaseQuality: 1, confidence: 1 })
  const steep = computeShot({ direction: { x: 0, y: 1, z: 0 }, power: 15, spin: 0, releaseQuality: 1, confidence: 1 })
  ok(steep.elevationDeg > flat.elevationDeg, 'steeper flick → higher elevation')
})

// ── Scoring bookkeeping ───────────────────────────────────────────
test('swish scores 3 and builds combo bonus', () => {
  let s = initialScoreState
  s = applyShot(s, { outcome: 'swish', points: 2, scored: true, contacts: [], steps: 1 })
  ok(s.score === 3 && s.combo === 1, `after 1 swish: score ${s.score} combo ${s.combo}`)
  s = applyShot(s, { outcome: 'swish', points: 2, scored: true, contacts: [], steps: 1 })
  // second swish: 3 base + combo(2) bonus = 5 → total 8
  ok(s.combo === 2 && s.score === 8, `after 2 swishes: score ${s.score} combo ${s.combo}`)
  s = applyShot(s, { outcome: 'short', points: 0, scored: false, contacts: [], steps: 1 })
  ok(s.combo === 0 && s.makes === 2 && s.bestCombo === 2, 'miss resets combo, keeps bestCombo')
})

// ── Input pipeline (ported ThrowSystem/GestureEngine) ─────────────
test('an upward swipe classifies as swipe → upward ThrowIntent', () => {
  const ge = new GestureEngine()
  const ts = new ThrowSystem()
  const samples: PointerSample[] = []
  const t0 = 10.0
  for (let i = 0; i <= 8; i++) {
    samples.push({ t: t0 + i * 0.015, x: 300, y: 400 - i * 20, pressure: 0.5, id: 1 })
  }
  const g = ge.buildGesture(samples)
  ok(g.type === 'swipe', `expected swipe, got ${g.type}`)
  const intent = ts.release(g)
  ok(intent !== null, 'swipe should produce a ThrowIntent')
  ok(intent!.direction.y > 0.5, `upward swipe → dir.y up, got ${intent!.direction.y.toFixed(2)}`)
  ok(intent!.power > 5, `should carry power, got ${intent!.power.toFixed(1)}`)
})

test('a tiny tap produces no throw', () => {
  const ge = new GestureEngine()
  const ts = new ThrowSystem()
  const samples: PointerSample[] = [
    { t: 1.0, x: 300, y: 400, pressure: 0.5, id: 1 },
    { t: 1.02, x: 302, y: 399, pressure: 0.5, id: 1 },
  ]
  const g = ge.buildGesture(samples)
  ok(g.type === 'tap', `expected tap, got ${g.type}`)
  ok(ts.release(g) === null, 'tap should not throw')
})

test('faster swipe yields more power than a slow one', () => {
  const ge = new GestureEngine()
  const ts = new ThrowSystem()
  const mk = (step: number): PointerSample[] => {
    const s: PointerSample[] = []
    for (let i = 0; i <= 8; i++) s.push({ t: i * 0.015, x: 300, y: 400 - i * step, pressure: 0.5, id: 1 })
    return s
  }
  const slow = ts.release(ge.buildGesture(mk(8)))
  const fast = ts.release(ge.buildGesture(mk(40)))
  ok(slow !== null && fast !== null, 'both should throw')
  ok(fast!.power > slow!.power, `fast (${fast!.power.toFixed(1)}) > slow (${slow!.power.toFixed(1)})`)
})

console.log('\n==================================================')
console.log(`RESULT: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
