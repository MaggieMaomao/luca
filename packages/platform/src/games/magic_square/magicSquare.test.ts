// Magic Square — logic tests. Guards the multi-size + permutation-check rebuild.
import { test, ok, done } from '../_testkit.ts'
import { magicConstant, SIZES, solvedGrid, setCell, isSolved, newPuzzle } from './magicSquare.ts'

function isMagic(grid: number[], n: number): boolean {
  const m = magicConstant(n)
  for (let r = 0; r < n; r++) { let s = 0; for (let c = 0; c < n; c++) s += grid[r * n + c]; if (s !== m) return false }
  for (let c = 0; c < n; c++) { let s = 0; for (let r = 0; r < n; r++) s += grid[r * n + c]; if (s !== m) return false }
  let d1 = 0, d2 = 0
  for (let i = 0; i < n; i++) { d1 += grid[i * n + i]; d2 += grid[i * n + (n - 1 - i)] }
  if (d1 !== m || d2 !== m) return false
  const seen = new Set(grid)
  if (seen.size !== n * n) return false
  for (let v = 1; v <= n * n; v++) if (!seen.has(v)) return false
  return true
}

test('solvedGrid is a valid magic square for every size (15/34/65)', () => {
  for (const n of SIZES) ok(isMagic(solvedGrid(n), n), `size ${n} (const ${magicConstant(n)})`)
})

test('isSolved accepts a full solved grid', () => {
  const n = 3
  const grid = solvedGrid(n)
  ok(isSolved({ size: n, grid, prefilled: new Array(n * n).fill(true), moves: 0 }))
})

test('given cells are locked', () => {
  const g = newPuzzle(3, 7)
  const idx = g.prefilled.findIndex(p => p)
  ok(idx >= 0 && setCell(g, idx, 1) === g, 'prefilled cell rejects edit')
})

test('a generated 3x3 puzzle is solvable', () => {
  const g = newPuzzle(3, 7)
  const blanks: number[] = []
  g.prefilled.forEach((p, i) => { if (!p) blanks.push(i) })
  const present = new Set(g.grid.filter(v => v !== 0))
  const missing: number[] = []
  for (let v = 1; v <= 9; v++) if (!present.has(v)) missing.push(v)
  // permute the missing values across the blanks
  const perms = (a: number[]): number[][] => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(r => [x, ...r]))
  let solved = false
  for (const pm of perms(missing)) {
    let s = g
    pm.forEach((v, k) => { s = setCell(s, blanks[k], v) })
    if (isSolved(s)) { solved = true; break }
  }
  ok(solved, 'a winning fill exists')
})

done()
