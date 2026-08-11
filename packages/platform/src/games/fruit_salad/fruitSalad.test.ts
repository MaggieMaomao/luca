// Fruit Salad — logic tests. Guards the clue-based (contingency-table) rebuild.
import { test, eq, ok, done } from '../_testkit.ts'
import { newGame, setGuess, rowSums, colSums, isSolved } from './fruitSalad.ts'

test('clues are consistent (row totals sum == col totals sum)', () => {
  const g = newGame(3, 3, 42)
  const rt = g.rowTotals.reduce((a, b) => a + b, 0)
  const ct = g.colTotals.reduce((a, b) => a + b, 0)
  eq(rt, ct, 'margins balance')
})

test('row/col sums of the solution equal the clues', () => {
  const g = newGame(3, 3, 42)
  eq(rowSums(g.solution), g.rowTotals)
  eq(colSums(g.solution), g.colTotals)
})

test('empty grid is not solved; filling the solution wins', () => {
  const g = newGame(3, 3, 42)
  ok(!isSolved(g), 'empty not solved')
  let s = g
  for (let b = 0; b < 3; b++) for (let f = 0; f < 3; f++) s = setGuess(s, b, f, g.solution[b][f])
  ok(isSolved(s), 'matching all margins wins')
})

done()
