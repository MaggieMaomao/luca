// Skyscrapers — logic tests. Guards the proper-Latin-square generation fix.
import { test, eq, ok, done } from '../_testkit.ts'
import { countVisible, isSolved, newPuzzle } from './skyscrapers.ts'

test('countVisible', () => {
  eq(countVisible([1, 2, 3, 4, 5]), 5, 'ascending → all visible')
  eq(countVisible([5, 4, 3, 2, 1]), 1, 'descending → one visible')
  eq(countVisible([2, 1, 3]), 2)
})

function fullSolution(n: number) {
  const grid: number[][] = []
  for (let r = 0; r < n; r++) { const row: number[] = []; for (let c = 0; c < n; c++) row.push(((r + c) % n) + 1); grid.push(row) }
  const top: number[] = [], bottom: number[] = []
  for (let c = 0; c < n; c++) { const col = grid.map(r => r[c]); top.push(countVisible(col)); bottom.push(countVisible(col.slice().reverse())) }
  const left = grid.map(r => countVisible(r))
  const right = grid.map(r => countVisible(r.slice().reverse()))
  return { size: n, grid, clues: { top, bottom, left, right }, moves: 0 }
}

test('a full Latin solution satisfies its own clues', () => {
  ok(isSolved(fullSolution(5)), 'valid solution solves')
})

test('a duplicate in a row fails', () => {
  const s = fullSolution(5)
  const grid = s.grid.map(r => r.slice())
  grid[0][1] = grid[0][0] // create a duplicate
  ok(!isSolved({ ...s, grid }), 'non-Latin rejected')
})

test('generated puzzle clues and cells are in range', () => {
  const p = newPuzzle(5, 3)
  for (const c of [...p.clues.top, ...p.clues.bottom, ...p.clues.left, ...p.clues.right]) ok(c >= 0 && c <= 5)
  for (const row of p.grid) for (const v of row) ok(v >= 0 && v <= 5)
})

done()
