// Floodfill — logic tests. Guards the colour-count + no-op-guard rebuild.
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, floodFill, isSolved, originRegionSize } from './floodfill.ts'

test('uses exactly `colors` colours (no dead palette swatches)', () => {
  const g = newGame(12, 6, 5)
  eq(g.colors, 6)
  const used = new Set(g.grid.flat())
  ok([...used].every(v => v >= 0 && v < 6), 'all cells in 0..5')
})

test('flood changes the board; same-colour is a no-op', () => {
  const g = newGame(12, 6, 5)
  const other = (g.grid[0][0] + 1) % 6
  ok(floodFill(g, 0, 0, other) !== g, 'different colour changes state')
  ok(floodFill(g, 0, 0, g.grid[0][0]) === g, 'same colour is a no-op')
})

test('always winnable (greedy solver fills the board)', () => {
  let s = newGame(12, 6, 5), guard = 0
  while (!isSolved(s) && guard++ < 5000) {
    let best = s.grid[0][0], bestSize = -1
    for (let c = 0; c < 6; c++) {
      const size = originRegionSize(floodFill(s, 0, 0, c))
      if (size > bestSize) { bestSize = size; best = c }
    }
    s = floodFill(s, 0, 0, best)
  }
  ok(isSolved(s), 'solved')
})

done()
