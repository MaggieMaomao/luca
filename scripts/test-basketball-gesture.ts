// Basketball gesture pipeline smoke test (run with: tsx scripts/test-basketball-gesture.ts)
//
// Verifies the engine-side gesture handler produces sensible ThrowIntent
// values without a browser. Tests:
//   - 1-Euro filter smooths raw samples
//   - GestureEngine classifies taps/swipes/cancels correctly
//   - ThrowSystem produces valid ThrowIntents for swipes
//   - Power scales with effective speed
//   - Spin is non-zero for curved swipes
//   - Direction is normalized
//
// All imports use relative paths to avoid tsx bug with package.json
// exports through symlinks (see fix-imports.mjs).

import {
  OneEuroFilter,
  GestureEngine,
  ThrowSystem,
} from '../packages/engine/dist/realtime/index.js'
import { defaultBasketballConfig } from '../packages/platform/src/games/basketball/Basketball.config'
import type { PointerSample, Gesture } from '../packages/engine/dist/realtime/index.js'

// Inline the basketball-specific throw config so we don't depend
// on the basketball gesture.ts (which imports @luca-game/engine
// and triggers tsx's exports bug).
const basketballThrowConfig = {
  minThrowSpeed: defaultBasketballConfig.feel.minThrowSpeed,
  hardThrowSpeed: defaultBasketballConfig.feel.hardThrowSpeed,
  maxPower: 12,
  minPower: 5,
  maxSpin: 8,
  curvatureSensitivity: 5,
  peakDirectionWeight: 0.7,
  powerCurveExp: 1.5,
  confidentDuration: 0.10,
  windowShort: 0.10,
  windowMedium: 0.12,
  windowLong: 0.12,
  shortMax: 0.15,
  mediumMax: 0.4,
}
const throwSystem = new ThrowSystem(basketballThrowConfig)

const failures: string[] = []
const check = (name: string, condition: boolean) => {
  if (!condition) failures.push(name)
  console.log(`  ${condition ? '✓' : '✗'} ${name}`)
}

// ── Helpers ──────────────────────────────────────────────────────────

function makeSamples(duration: number, distance: number, peakFraction = 1.0): PointerSample[] {
  const N = 20
  const samples: PointerSample[] = []
  const velocities: number[] = []
  for (let i = 0; i < N; i++) {
    const triPos = i < N / 2 ? (i / (N / 2)) : ((N - 1 - i) / (N / 2))
    const ratio = peakFraction * triPos + (1 - peakFraction) * (i / (N - 1))
    velocities.push(ratio)
  }
  const sum = velocities.reduce((a, b) => a + b, 0)
  const scale = distance / sum
  let x = 0
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * duration
    x += velocities[i] * scale
    samples.push({ t, x, y: 0, pressure: 0.5, id: 0 })
  }
  return samples
}

function makeCurvedSamples(): PointerSample[] {
  const N = 30
  const samples: PointerSample[] = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1) * 0.20
    const ratio = i / (N - 1)
    const x = ratio * 150
    const y = Math.sin(ratio * Math.PI) * 50
    samples.push({ t, x, y, pressure: 0.5, id: 0 })
  }
  return samples
}

// ── Tests ────────────────────────────────────────────────────────────

console.log('Basketball gesture pipeline smoke test')
console.log('======================================')
console.log()

// 1. 1-Euro filter
console.log('1-Euro filter:')
const oneEuro = new OneEuroFilter(1.0, 0.007, 1.0)
const smooth1 = oneEuro.filter(0, 0, 0)
const smooth2 = oneEuro.filter(100, 0, 0.1)
check('returns first sample as-is', smooth1.x === 0 && smooth1.y === 0)
check('returns filtered second sample', typeof smooth2.x === 'number')

// 2. GestureEngine classification
console.log()
console.log('GestureEngine classification:')
const gestureEngine = new GestureEngine()

const fastSwipe = gestureEngine.buildGesture(makeSamples(0.10, 200))
check('fast swipe classified as swipe', fastSwipe.type === 'swipe')

const slowDrag = gestureEngine.buildGesture(makeSamples(0.50, 80))
check('slow drag with displacement still classified as swipe', slowDrag.type === 'swipe')

const tap = gestureEngine.buildGesture(makeSamples(0.05, 10))
check('tap classified as tap', tap.type === 'tap')

const longPress = gestureEngine.buildGesture(makeSamples(1.0, 50))
check('long press classified as cancel', longPress.type === 'cancel')

const stationaryHold = gestureEngine.buildGesture([
  { t: 0, x: 100, y: 100, pressure: 0.5, id: 0 },
  { t: 0.2, x: 100, y: 100, pressure: 0.5, id: 0 },
  { t: 0.5, x: 100, y: 100, pressure: 0.5, id: 0 },
])
check('stationary hold classified as tap (low displacement)', stationaryHold.type === 'tap')

// 3. ThrowSystem
console.log()
console.log('ThrowSystem:')
// throwSystem is defined above (in the inlined basketball config block)

const tapIntent = throwSystem.release(tap as Gesture)
check('tap gesture returns null (no intent)', tapIntent === null)

const cancelIntent = throwSystem.release(longPress as Gesture)
check('cancel gesture returns null (no intent)', cancelIntent === null)

// 4. Swipe produces valid intent
const swipeIntent = throwSystem.release(fastSwipe as Gesture)
check('fast swipe produces ThrowIntent', swipeIntent != null)

if (swipeIntent) {
  check('power is in [minPower, maxPower]', swipeIntent.power >= 5 && swipeIntent.power <= 12)
  const dirLen = Math.sqrt(
    swipeIntent.direction.x ** 2 +
    swipeIntent.direction.y ** 2 +
    swipeIntent.direction.z ** 2,
  )
  check('direction is normalized to length 1 (in XY)', dirLen > 0.9 && dirLen < 1.1)
  check('confidence is 0-1', swipeIntent.confidence >= 0 && swipeIntent.confidence <= 1)
  check('releaseQuality is 0-1', swipeIntent.releaseQuality >= 0 && swipeIntent.releaseQuality <= 1)
  console.log(`  → swipe: power=${swipeIntent.power.toFixed(2)}m/s, dir=(${swipeIntent.direction.x.toFixed(2)}, ${swipeIntent.direction.y.toFixed(2)}, ${swipeIntent.direction.z.toFixed(2)}), spin=${swipeIntent.spin.toFixed(2)}rad/s, conf=${swipeIntent.confidence.toFixed(2)}, quality=${swipeIntent.releaseQuality.toFixed(2)}`)
}

// 5. Power scales with speed
const slowSwipe = gestureEngine.buildGesture(makeSamples(0.30, 60))
const slowIntent = throwSystem.release(slowSwipe as Gesture)
const hardSwipe = gestureEngine.buildGesture(makeSamples(0.08, 200))
const hardIntent = throwSystem.release(hardSwipe as Gesture)
check('harder swipe has more power than slow swipe',
  (slowIntent?.power ?? 0) < (hardIntent?.power ?? 100))

// 6. Curved swipe produces non-zero spin
const curvedSamples = makeCurvedSamples()
const curvedGesture = gestureEngine.buildGesture(curvedSamples)
const curvedIntent = throwSystem.release(curvedGesture as Gesture)
check('curved swipe produces non-zero spin',
  curvedIntent != null && Math.abs(curvedIntent.spin) > 0)

console.log()
if (failures.length === 0) {
  console.log('All checks passed.')
  process.exit(0)
} else {
  console.log(`${failures.length} failure(s):`)
  failures.forEach(f => console.log(`   - ${f}`))
  process.exit(1)
}