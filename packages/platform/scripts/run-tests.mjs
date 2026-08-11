#!/usr/bin/env node
/**
 * run-tests.mjs — run every per-game logic test.
 *
 * Each game ships a standalone `<slug>.test.ts` that prints
 * "RESULT: X passed, Y failed" and exits non-zero on failure. This runner
 * discovers them all, runs each under `node --experimental-strip-types`, and
 * exits non-zero if any file fails — so `npm test` is a real regression gate.
 */
import { readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GAMES_DIR = join(__dirname, '..', 'src', 'games')

/** Recursively collect *.test.ts files. */
function findTests(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...findTests(p))
    else if (name.endsWith('.test.ts')) out.push(p)
  }
  return out
}

const files = findTests(GAMES_DIR).sort()
let failedFiles = 0
let totalPass = 0
let totalFail = 0

for (const file of files) {
  const rel = file.slice(GAMES_DIR.length + 1)
  const res = spawnSync('node', ['--experimental-strip-types', file], { encoding: 'utf8' })
  const out = (res.stdout || '') + (res.stderr || '')
  const m = out.match(/RESULT:\s*(\d+) passed,\s*(\d+) failed/)
  const pass = m ? Number(m[1]) : 0
  const fail = m ? Number(m[2]) : 0
  totalPass += pass
  totalFail += fail
  const okFile = res.status === 0 && fail === 0
  if (!okFile) failedFiles++
  console.log(`${okFile ? '✓' : '✗'} ${rel.padEnd(48)} ${pass} passed, ${fail} failed`)
  if (!okFile) process.stdout.write(out.split('\n').filter(l => l.includes('FAIL')).map(l => '    ' + l + '\n').join(''))
}

console.log('─'.repeat(64))
console.log(`${files.length} files · ${totalPass} passed · ${totalFail} failed · ${failedFiles} file(s) with failures`)
process.exit(failedFiles === 0 ? 0 : 1)
