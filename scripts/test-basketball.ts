// Basketball game smoke test (run with: tsx scripts/test-basketball.ts)
//
// Verifies the basketball game's RealTimeGameDefinition is structurally
// correct WITHOUT a browser. Doesn't mount PixiJS (which needs a DOM)
// — just checks:
//   - definition has all required fields
//   - initialState produces a valid state
//   - update produces a valid state (with and without input)
//   - detectEvents emits the right events
//   - defaultConfig has all required sub-configs

import { basketballDefinition } from '../packages/platform/src/games/basketball/BasketballDefinition'

const def = basketballDefinition
const failures: string[] = []
const check = (name: string, condition: boolean) => {
  if (!condition) failures.push(name)
  console.log(`  ${condition ? '✓' : '✗'} ${name}`)
}

console.log('Basketball game smoke test')
console.log('=========================')
console.log()
console.log('Definition structure:')
check('meta.slug is "basketball"', def.meta.slug === 'basketball')
check('meta.title is "Basketball"', def.meta.title === 'Basketball')
check('initialState is a function', typeof def.initialState === 'function')
check('update is a function', typeof def.update === 'function')
check('isWin is a function', typeof def.isWin === 'function')
check('defaultConfig is defined', def.defaultConfig != null)
check('help.description is set', (def.help?.description?.length ?? 0) > 0)
check('help.controls has entries', (def.help?.controls?.length ?? 0) > 0)
check('detectEvents is a function', def.detectEvents == null || typeof def.detectEvents === 'function')

console.log()
console.log('defaultConfig:')
const cfg = def.defaultConfig
check('tickRate = 120', cfg.tickRate === 120)
check('renderRate = 60', cfg.renderRate === 60)
check('geometry.rimHeight = 3.05', cfg.geometry?.rimHeight === 3.05)
check('geometry.rimDiameter = 0.45', cfg.geometry?.rimDiameter === 0.45)
check('geometry.rimDistance = 4.6', cfg.geometry?.rimDistance === 4.6)
check('physics.gravity = -9.8', cfg.physics?.gravity === -9.8)
check('physics.ballMass = 0.624', cfg.physics?.ballMass === 0.624)
check('feel.minThrowSpeed > 0', (cfg.feel?.minThrowSpeed ?? 0) > 0)
check('scoring.swishPoints = 3', cfg.scoring?.swishPoints === 3)

console.log()
console.log('initialState:')
const s0 = def.initialState(cfg)
check('ballPosition is a Vector3', typeof s0.ballPosition.x === 'number')
check('score = 0', s0.score === 0)
check('combo = 0', s0.combo === 0)
check('ballInFlight = false', s0.ballInFlight === false)
check('shotsTaken = 0', s0.shotsTaken === 0)
check('makes = 0', s0.makes === 0)

console.log()
console.log('update (no input):')
const s1 = def.update(s0, 1/120, { gestureActive: false })
check('update returns a state', s1 != null)
check('score still 0', s1.score === 0)
check('ballInFlight still false', s1.ballInFlight === false)

console.log()
console.log('update (with throwIntent):')
const s2 = def.update(s0, 1/120, {
  gestureActive: true,
  throwIntent: {
    direction: { x: 0, y: 0.5, z: -1 },
    power: 7,
    spin: 0,
    releaseQuality: 0.8,
    confidence: 0.9,
  },
})
check('shotsTaken incremented', s2.shotsTaken === 1)
check('ballInFlight = true', s2.ballInFlight === true)

console.log()
console.log('detectEvents:')
const events1 = def.detectEvents?.({ ...s0, lastShot: 'swish', score: 3, combo: 1 }) ?? []
check('GOAL event on swish', events1.some(e => e.kind === 'GOAL'))
const events2 = def.detectEvents?.({ ...s0, lastShot: 'airball', score: 0 }) ?? []
check('MISS event on airball', events2.some(e => e.kind === 'MISS'))
const events3 = def.detectEvents?.({ ...s0, lastShot: 'swish', score: 5, combo: 3 }) ?? []
check('COMBO event on streak', events3.some(e => e.kind === 'COMBO'))

console.log()
if (failures.length === 0) {
  console.log('All checks passed.')
  process.exit(0)
} else {
  console.log(`${failures.length} failure(s):`)
  failures.forEach(f => console.log(`   - ${f}`))
  process.exit(1)
}