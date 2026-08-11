// Packing — logic tests. Guards the exact-cover rebuild (was an empty non-game).
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, place, unplace, canPlace, occupancy, isSolved } from './packing.ts'

test('pieces tile the container exactly', () => {
  const g = newGame(3)
  const area = g.pieces.reduce((s, p) => s + p.w * p.h, 0)
  eq(area, g.width * g.height, 'total piece area == container area')
})

test('place then unplace round-trips a piece', () => {
  const g = newGame(1)
  const id = g.pieces[0].id
  const s1 = place(g, id, 0, 0)
  ok(s1 !== g && s1.pieces.find(p => p.id === id)?.x === 0, 'placed')
  const s2 = unplace(s1, id)
  ok(s2.pieces.find(p => p.id === id)?.x === null, 'returned to tray')
})

test('every generated puzzle is solvable (exact-cover backtracking)', () => {
  const solve = (s: ReturnType<typeof newGame>): boolean => {
    if (isSolved(s)) return true
    const grid = occupancy(s)
    let tr = -1, tc = -1
    outer: for (let r = 0; r < s.height; r++) for (let c = 0; c < s.width; c++) { if (grid[r][c] === -1) { tr = r; tc = c; break outer } }
    if (tr < 0) return false
    for (const p of s.pieces) {
      if (p.x !== null) continue
      if (canPlace(s, p, tc, tr)) { const ns = place(s, p.id, tc, tr); if (ns !== s && solve(ns)) return true }
    }
    return false
  }
  for (let seed = 1; seed <= 10; seed++) ok(solve(newGame(seed)), `seed ${seed} solvable`)
})

done()
