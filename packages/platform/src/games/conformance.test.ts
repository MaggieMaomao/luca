// Conformance — TS side.
//
// For every shared fixture (`<slug>/<slug>.cases.json`), check that the game's
// canonical "is this a solved/winning state" predicate agrees with the
// fixture's expected `complete`. The Python runner
// (catobigato/backend/tests/luca/test_conformance.py) asserts the same
// fixtures against the Python validators — so if both sides match the
// fixtures, the TS logic and the Python ports cannot drift apart.

import { test, ok, done } from './_testkit.ts'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { isSolved as towersSolved } from './towers_of_hanoi/towersOfHanoi.ts'
import { isSolved as lightsSolved } from './lights/lights.ts'
import { hasWon as won2048 } from './games2048/game2048.ts'
import { isSolved as sudokuSolved } from './sudoku/sudoku.ts'
import { isSolved as magicSolved } from './magic_square/magicSquare.ts'
import { isSolved as sokobanSolved } from './sokoban/sokoban.ts'
import { isSolved as unknottingSolved } from './unknotting/unknotting.ts'
import { isSolved as knotSolved } from './knot_colouring/knotColouring.ts'

const DIR = dirname(fileURLToPath(import.meta.url))

// Canonical "is this state a completion?" per game — operating on the SAME
// JSON shape the validator (and `serializeCompletion`) use.
const slidingSolved = (g: number[][]): boolean => {
  const n = g.length
  const flat = g.flat()
  for (let i = 0; i < n * n - 1; i++) if (flat[i] !== i + 1) return false
  return flat[n * n - 1] === 0
}
const tangramSolved = (s: { target?: { cells: number[][] }; pieces?: Array<{ cells: number[][] }> }): boolean => {
  if (!s || !s.target || !Array.isArray(s.pieces) || s.pieces.length !== 7) return false
  const target = new Set(s.target.cells.map(c => c.join(',')))
  const covered = new Set<string>()
  for (const p of s.pieces) for (const c of p.cells) covered.add(c.join(','))
  if (covered.size !== target.size) return false
  for (const c of covered) if (!target.has(c)) return false
  return true
}

const checkers: Record<string, (state: unknown) => boolean> = {
  towers_of_hanoi: (s) => towersSolved(s as never),
  lights: (s) => lightsSolved(s as never),
  '2048': (s) => won2048(s as never),
  sudoku: (s) => sudokuSolved(s as never),
  sliding_blocks: (s) => slidingSolved(s as never),
  tangram: (s) => tangramSolved(s as never),
  magic_square: (s) => magicSolved(s as never),
  sokoban: (s) => sokobanSolved(s as never),
  unknotting: (s) => unknottingSolved(s as never),
  knot_colouring: (s) => knotSolved(s as never),
}

const files: Record<string, string> = {
  towers_of_hanoi: 'towers_of_hanoi/towers_of_hanoi.cases.json',
  lights: 'lights/lights.cases.json',
  '2048': 'games2048/games2048.cases.json',
  sudoku: 'sudoku/sudoku.cases.json',
  sliding_blocks: 'sliding_blocks/sliding_blocks.cases.json',
  tangram: 'tangram/tangram.cases.json',
  magic_square: 'magic_square/magic_square.cases.json',
  sokoban: 'sokoban/sokoban.cases.json',
  unknotting: 'unknotting/unknotting.cases.json',
  knot_colouring: 'knot_colouring/knot_colouring.cases.json',
}

const safe = (fn: () => boolean): boolean => { try { return !!fn() } catch { return false } }

for (const [slug, rel] of Object.entries(files)) {
  const data = JSON.parse(readFileSync(join(DIR, rel), 'utf8')) as {
    cases: Array<{ name: string; state: unknown; expect: { complete: boolean } }>
  }
  const check = checkers[slug]
  for (const c of data.cases) {
    test(`${slug}: ${c.name}`, () => {
      const got = safe(() => check(c.state))
      ok(got === c.expect.complete, `TS solved=${got}, fixture expects complete=${c.expect.complete}`)
    })
  }
}

done()
