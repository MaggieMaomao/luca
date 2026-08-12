#!/usr/bin/env node
/**
 * luca — Luca dev CLI (also wrapped by the MCP server).
 *
 *   luca validate <slug> [--json]   structured checks (files, registration, test)
 *   luca list [--json]              list registered games
 *   luca contract                   print the action-engine Game contract
 *
 * `validate` powers the generate → validate → fix loop: it returns fix-oriented
 * issues so a human or an agent knows exactly what to do next.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

function findRepo() {
  for (const p of [process.cwd(), join(__dirname, '..', '..')]) {
    if (existsSync(join(p, 'packages', 'platform', 'src', 'games'))) return p
  }
  console.error('Run from the Luca repo root (packages/platform not found).')
  process.exit(2)
}
const ROOT = findRepo()
const PLATFORM = join(ROOT, 'packages', 'platform')
const gamesDir = join(PLATFORM, 'src', 'games')
const read = (p) => { try { return readFileSync(p, 'utf8') } catch { return '' } }

function listGames() {
  const reg = read(join(PLATFORM, 'src', 'registry.ts'))
  const slugs = [...reg.matchAll(/slug:\s*['"]([a-z0-9_]+)['"]/g)].map((m) => m[1])
  return [...new Set(slugs)]
}

function validate(slug) {
  const checks = []
  const add = (id, ok, message, fix) => checks.push({ id, ok, ...(message && { message }), ...(fix && !ok && { fix }) })
  const dir = join(gamesDir, slug)

  const dirOk = existsSync(dir)
  add('dir', dirOk, dirOk ? `packages/platform/src/games/${slug}/ exists` : 'game directory missing',
    `Run: npx create-luca-game ${slug}`)

  if (dirOk) {
    for (const f of [`${slug}.ts`, `${slug}.test.ts`, 'index.ts']) {
      const ok = existsSync(join(dir, f))
      add(`file:${f}`, ok, ok ? `${f} present` : `${f} missing`, `Create packages/platform/src/games/${slug}/${f}`)
    }
    // logic must be pure (no react/dom in <slug>.ts)
    const logic = read(join(dir, `${slug}.ts`))
    const impure = /from ['"]react['"]|document\.|window\./.test(logic)
    add('pure-logic', !impure, impure ? `${slug}.ts imports React/DOM` : `${slug}.ts is pure`,
      'Move JSX/DOM into a .tsx file; keep <slug>.ts pure so it stays testable.')
  }

  // registration in the three files
  const reg = read(join(PLATFORM, 'src', 'registry.ts'))
  add('reg:registry', new RegExp(`slug:\\s*['"]${slug}['"]`).test(reg), null,
    `Add a GAMES entry with slug: '${slug}' in src/registry.ts`)
  const idx = read(join(gamesDir, 'index.ts'))
  add('reg:games-index', idx.includes(`from './${slug}'`), null,
    `Add: export { default as ${slug} } from './${slug}'  in src/games/index.ts`)
  const play = read(join(PLATFORM, 'src', 'PlayPage.tsx'))
  add('reg:playpage', new RegExp(`['"]${slug}['"]\\s*:`).test(play), null,
    `Add '${slug}': <Component>  to EAGER_GAMES in src/PlayPage.tsx (and import it)`)

  // run the game's test
  const testFile = join(dir, `${slug}.test.ts`)
  if (existsSync(testFile)) {
    const r = spawnSync('node', ['--experimental-strip-types', testFile], { encoding: 'utf8' })
    const out = (r.stdout || '') + (r.stderr || '')
    const m = out.match(/RESULT:\s*(\d+)\s*passed,\s*(\d+)\s*failed/)
    const ok = r.status === 0 && m && Number(m[2]) === 0
    add('test', ok, m ? `test: ${m[1]} passed, ${m[2]} failed` : 'test did not report a RESULT line',
      `Fix ${slug}.test.ts / your logic. Output:\n${out.trim().split('\n').slice(-6).join('\n')}`)
  }

  return { slug, ok: checks.every((c) => c.ok), checks }
}

// ── dispatch ─────────────────────────────────────────────────
const [cmd, arg] = process.argv.slice(2)
const json = process.argv.includes('--json')

if (cmd === 'list') {
  const games = listGames()
  console.log(json ? JSON.stringify({ games }, null, 2) : games.join('\n'))
} else if (cmd === 'contract') {
  console.log(read(join(PLATFORM, '..', 'engine', 'src', 'action', 'game.ts')) ||
    'Contract source not found (packages/engine/src/action/game.ts).')
} else if (cmd === 'validate') {
  if (!arg) { console.error('Usage: luca validate <slug> [--json]'); process.exit(2) }
  const res = validate(arg)
  if (json) {
    console.log(JSON.stringify(res, null, 2))
  } else {
    console.log(`\nluca validate ${arg} — ${res.ok ? '✅ PASS' : '❌ ISSUES'}\n`)
    for (const c of res.checks) {
      console.log(`  ${c.ok ? '✓' : '✗'} ${c.id}${c.message ? ' — ' + c.message : ''}`)
      if (!c.ok && c.fix) console.log(`      → ${c.fix.split('\n').join('\n      ')}`)
    }
    console.log('')
  }
  process.exit(res.ok ? 0 : 1)
} else {
  console.log('luca — Luca dev CLI\n\n  luca validate <slug> [--json]\n  luca list [--json]\n  luca contract\n')
  process.exit(cmd ? 2 : 0)
}
