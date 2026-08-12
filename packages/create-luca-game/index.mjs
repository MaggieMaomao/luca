#!/usr/bin/env node
/**
 * create-luca-game — scaffold a new action-engine game into @luca-game/platform.
 *
 *   npx create-luca-game <slug>            # from the Luca repo root
 *   node packages/create-luca-game/index.mjs <slug>
 *
 * Generates packages/platform/src/games/<slug>/ with pure logic + a passing
 * test + the action `Game` object + a React component + index, then prints the
 * three registration edits. The generated game is a minimal but VALID "tapper"
 * (tap to score) so `npm test` is green immediately — replace its logic with
 * your own. See docs/GAME_DEFINITION.md.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const slug = process.argv[2]
if (!slug || !/^[a-z][a-z0-9_]*$/.test(slug)) {
  console.error('Usage: create-luca-game <slug>   (slug: lowercase letters/digits/underscores, e.g. "star_catch")')
  process.exit(1)
}

// Locate the platform package (works from repo root or the package dir).
const __dirname = dirname(fileURLToPath(import.meta.url))
const candidates = [
  join(process.cwd(), 'packages', 'platform'),
  join(__dirname, '..', 'platform'),
]
const platformDir = candidates.find(p => existsSync(join(p, 'src', 'games')))
if (!platformDir) {
  console.error('Could not find packages/platform/src/games — run this from the Luca repo root.')
  process.exit(1)
}

const gameDir = join(platformDir, 'src', 'games', slug)
if (existsSync(gameDir)) {
  console.error(`Game "${slug}" already exists at ${gameDir}`)
  process.exit(1)
}

// naming
const Pascal = slug.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join('')
const camel = Pascal[0].toLowerCase() + Pascal.slice(1)
const title = slug.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join(' ')

const files = {
  [`${slug}.ts`]: `// ${title} — pure game logic (no JSX/React), unit-testable under
// \`node --experimental-strip-types\`. Assembled into a Game in ${slug}Definition.tsx.
// Runtime values come from the pure engine subpath; types from the barrel.
import type { Gesture } from '@luca-game/engine/action/input'
import type { Outcome, View2D } from '@luca-game/engine/action'

export interface ${Pascal}State { score: number; flash: number }
export type ${Pascal}Intent = { kind: 'tap' }
export type ${Pascal}Event = 'score'

export const init${Pascal} = (): ${Pascal}State => ({ score: 0, flash: 0 })

/** A tap becomes a scoring intent. Replace with your own gesture mapping. */
export function map${Pascal}(g: Gesture): ${Pascal}Intent | null {
  return g.type === 'tap' ? { kind: 'tap' } : null
}

export function apply${Pascal}(s: ${Pascal}State, _i: ${Pascal}Intent, emit: (e: ${Pascal}Event) => void): ${Pascal}State {
  emit('score')
  return { score: s.score + 1, flash: 1 }
}

export function step${Pascal}(s: ${Pascal}State, dt: number): ${Pascal}State {
  return s.flash > 0 ? { ...s, flash: Math.max(0, s.flash - dt * 3) } : s
}

export function outcome${Pascal}(s: ${Pascal}State, prev: ${Pascal}State): Outcome | null {
  if (s.score > prev.score) return { points: 1, won: true, comboBonus: false, label: 'tap' }
  return null
}

export function draw${Pascal}(ctx: CanvasRenderingContext2D, s: ${Pascal}State, view: View2D): void {
  ctx.fillStyle = \`rgba(232,116,59,\${0.15 + s.flash * 0.4})\`
  ctx.fillRect(0, 0, view.width, view.height)
  ctx.fillStyle = '#fff'
  ctx.font = \`700 \${Math.round(view.height * 0.2)}px system-ui\`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(String(s.score), view.width / 2, view.height / 2)
}
`,
  [`${slug}Definition.tsx`]: `// ${title} — the action Game object (assembles the pure logic + sounds).
import { tone, type Game } from '@luca-game/engine/action'
import {
  init${Pascal}, map${Pascal}, apply${Pascal}, step${Pascal}, outcome${Pascal}, draw${Pascal},
  type ${Pascal}State, type ${Pascal}Intent, type ${Pascal}Event,
} from './${slug}'

export const ${camel}Game: Game<${Pascal}State, ${Pascal}Intent, ${Pascal}Event> = {
  meta: {
    id: '${slug}',
    title: '${title}',
    description: 'Tap to score. (Scaffolded by create-luca-game — replace me!)',
    renderer: 'canvas2d',
    hint: 'Tap anywhere to score.',
  },
  init: init${Pascal},
  mapGesture: map${Pascal},
  apply: apply${Pascal},
  step: step${Pascal},
  outcome: outcome${Pascal},
  draw: draw${Pascal},
  sounds: { score: (a) => tone(a, 660, 'sine', 0.25, 0.1) },
}
`,
  [`${Pascal}Game.tsx`]: `// ${title} — the playable React component.
import { GameHost } from '@luca-game/engine/action'
import { ${camel}Game } from './${slug}Definition'

export default function ${Pascal}Game() {
  return <GameHost game={${camel}Game} />
}
`,
  [`${slug}.test.ts`]: `// ${title} logic test — run: node --experimental-strip-types ${slug}.test.ts
import { init${Pascal}, apply${Pascal}, outcome${Pascal}, type ${Pascal}Event } from './${slug}.ts'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL:', m) } }

{
  const s0 = init${Pascal}()
  ok(s0.score === 0, 'starts at 0')
  const ev: ${Pascal}Event[] = []
  const s1 = apply${Pascal}(s0, { kind: 'tap' }, e => ev.push(e))
  ok(s1.score === 1, 'tap increments score')
  ok(ev.includes('score'), 'emits score')
  const oc = outcome${Pascal}(s1, s0)
  ok(oc !== null && oc.points === 1 && oc.won, 'scores 1 point')
  ok(outcome${Pascal}(s0, s0) === null, 'no outcome without a tap')
}

console.log(\`RESULT: \${pass} passed, \${fail} failed\`)
if (fail > 0) process.exit(1)
`,
  ['index.ts']: `// @luca-game/platform/games/${slug} — public exports.
export { ${camel}Game as default } from './${slug}Definition'
export { default as Component } from './${Pascal}Game'
`,
}

mkdirSync(gameDir, { recursive: true })
for (const [name, content] of Object.entries(files)) writeFileSync(join(gameDir, name), content)

console.log(`\n✅ Created packages/platform/src/games/${slug}/ (${Object.keys(files).length} files)\n`)
console.log('Next — three edits to register it, then it shows up in the gallery:\n')
console.log(`  1. src/registry.ts     add to GAMES:`)
console.log(`       { slug: '${slug}', title: '${title}', icon: '🎮', description: '…', status: 'playable', difficulty: 'easy' },`)
console.log(`  2. src/games/index.ts  add:`)
console.log(`       export { default as ${slug} } from './${slug}'`)
console.log(`  3. src/PlayPage.tsx     import + add to EAGER_GAMES:`)
console.log(`       import ${Pascal}Game from './games/${slug}/${Pascal}Game'`)
console.log(`       '${slug}': ${Pascal}Game,`)
console.log(`\nThen: npm test   (the scaffold's ${slug}.test.ts already passes)\n`)
